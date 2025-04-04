// pages/profile/edit/edit.js
const {
  ui,
  error,
  ToastType,
  createApiClient,
  storage,
  getOpenID
} = require('../../../utils/util');

// behaviors
const baseBehavior = require('../../../behaviors/baseBehavior');
const authBehavior = require('../../../behaviors/authBehavior');
const userBehavior = require('../../../behaviors/userBehavior');
const weuiBehavior = require('../../../behaviors/weuiBehavior');


Page({
  behaviors: [baseBehavior, authBehavior, userBehavior, weuiBehavior],

  data: {
    userInfo: {
      nickname: '',
      bio: '',
      avatar: '',
      loginType: ''
    },
    newNickName: '',  // 用于存储修改后的昵称
    newStatus: '',    // 用于存储修改后的个性签名
    loading: true
  },

  async onLoad() {
    await this.loadUserProfile();
  },

  async loadUserProfile() {
    try {
      ui.showToast('加载中...', { type: ToastType.LOADING });
      this.setData({ loading: true });

      // 使用authBehavior中的_getUserInfo方法获取用户信息
      const userInfo = await this._getUserInfo(true);
      
      if (userInfo) {
        userInfo.avatarUrl = userInfo.avatar;
        
        this.setData({ 
          userInfo,
          newNickName: userInfo.nickname || '',
          newStatus: userInfo.bio || ''
        });
      } else {
        throw new Error('获取用户信息失败');
      }
    } catch (err) {
      error.handle(err, '获取用户信息失败');
      
      // 从本地存储获取用户信息作为备用
      const localUserInfo = storage.get('userInfo');
      if (localUserInfo) {
        this.setData({ 
          userInfo: localUserInfo,
          newNickName: localUserInfo.nickname || '',
          newStatus: localUserInfo.bio || ''
        });
      }
    } finally {
      this.setData({ loading: false });
      ui.hideToast();
    }
  },

  // 头像加载错误处理
  onAvatarError() {
    this.setData({ 
      'userInfo.avatarUrl': '' 
    });
  },

  // 处理微信头像选择
  async onChooseAvatar(e) {
    try {
      ui.showToast('更新中...', { type: ToastType.LOADING });
      const { avatarUrl } = e.detail;
      
      // 获取openid
      const openid = storage.get('openid');
      if (!openid) {
        this.showToptips({ msg: '用户未登录', type: 'error' });
        ui.hideToast();
        return;
      }
      
      // 压缩图片，减小体积
      let compressedImagePath = avatarUrl;
      try {
        const compressRes = await wx.compressImage({
          src: avatarUrl,
          quality: 80
        });
        if (compressRes && compressRes.tempFilePath) {
          compressedImagePath = compressRes.tempFilePath;
          console.debug('图片压缩成功');
        }
      } catch (compressErr) {
        // 压缩失败，使用原图继续
        console.debug('图片压缩失败，使用原图:', compressErr);
      }
      
      // 生成云存储路径，添加时间戳避免缓存问题
      const timestamp = Date.now();
      const cloudPath = `avatars/${openid}_${timestamp}.jpg`;
      
      // 定义最大重试次数
      const maxRetries = 3;
      let retryCount = 0;
      let uploadResult = null;
      
      // 带重试的上传逻辑
      while (retryCount < maxRetries && !uploadResult) {
        try {
          if (retryCount > 0) {
            console.debug(`上传重试第${retryCount}次`);
            // 显示重试信息
            wx.showLoading({
              title: `重试第${retryCount}次...`,
              mask: true
            });
          }
          
          // 设置上传超时
          uploadResult = await Promise.race([
            wx.cloud.uploadFile({
              cloudPath,
              filePath: compressedImagePath
            }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('上传超时')), 15000); // 15秒超时
            })
          ]);
          
        } catch (uploadErr) {
          console.debug(`上传失败 (${retryCount + 1}/${maxRetries}):`, uploadErr);
          retryCount++;
          
          // 最后一次重试也失败
          if (retryCount >= maxRetries) {
            throw new Error(`上传失败(已重试${maxRetries}次): ${uploadErr.message || '网络错误'}`);
          }
          
          // 重试前等待一段时间
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!uploadResult?.fileID) {
        throw new Error('云存储返回结果格式错误');
      }
      
      console.debug('上传成功，fileID:', uploadResult.fileID);
      
      // 使用behavior中的_updateUserProfile方法更新头像信息
      const res = await this._updateUserProfile({
        avatar: uploadResult.fileID
      });
      
      // 更新头像显示
      this.setData({
        'userInfo.avatarUrl': uploadResult.fileID,
        'userInfo.avatar': uploadResult.fileID
      });
      
      // 更新本地用户信息
      const userInfo = storage.get('userInfo');
      if (userInfo) {
        userInfo.avatar = uploadResult.fileID;
        storage.set('userInfo', userInfo);
      }
      
      // 设置需要刷新个人资料页面的标记
      storage.set('needRefreshProfile', true);
      
      // 显示成功提示
      this.showToptips({ msg: '头像更新成功', type: 'success' });
      
    } catch (err) {
      console.debug('头像更新失败:', err);
      this.showToptips({ 
        msg: err.message || '更新头像失败，请稍后再试', 
        type: 'error' 
      });
    } finally {
      ui.hideToast();
      wx.hideLoading();
    }
  },

  // 处理昵称输入
  onInputNickName(e) {
    this.setData({
      newNickName: e.detail.value.trim()
    });
  },

  // 处理个性签名输入
  onInputStatus(e) {
    this.setData({
      newStatus: e.detail.value
    });
  },

  // 保存修改
  async saveChanges() {
    try {
      ui.showToast('保存中...', { type: ToastType.LOADING });

      const updateData = {};
      if (this.data.newNickName !== this.data.userInfo.nickname) {
        updateData.nickname = this.data.newNickName;
      }
      if (this.data.newStatus !== this.data.userInfo.bio) {
        updateData.bio = this.data.newStatus;
      }

      if (Object.keys(updateData).length === 0) {
        this.showToptips({ msg: '未做任何修改', type: 'info' });
        ui.hideToast();
        return;
      }

      // 发送更新请求
      const res = await this._updateUserProfile(updateData);
      
      // 更新本地存储的用户信息
      const userInfo = storage.get('userInfo');
      if (userInfo) {
        if (updateData.nickname) userInfo.nickname = updateData.nickname;
        if (updateData.bio) userInfo.bio = updateData.bio;
        storage.set('userInfo', userInfo);
      }
      
      // 设置需要刷新个人资料页面的标记
      storage.set('needRefreshProfile', true);
      
      // 直接等待一段时间后导航返回，不进行Toast切换操作
      // 因为_updateUserProfile方法已经显示了成功提示
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 1000);
      
    } catch (err) {
      ui.hideToast(); // 失败时才需要手动隐藏loading
      error.handle(err, '保存失败');
    }
  }
})