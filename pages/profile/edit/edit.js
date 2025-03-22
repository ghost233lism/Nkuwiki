// pages/profile/edit/edit.js
const userManager = require('../../../utils/user_manager');
const { userAPI } = require('../../../utils/api');

Page({
  data: {
    userInfo: null,
    newNickName: '',  // 用于存储修改后的昵称
    newStatus: ''     // 用于存储修改后的个性签名
  },

  onLoad() {
    // 使用用户管理器获取用户信息
    const userInfo = userManager.getCurrentUser();
    
    // 初始化时，将现有信息填入输入框
    this.setData({ 
      userInfo,
      newNickName: userInfo.nickname || userInfo.nickName || '',  // 显示现有昵称
      newStatus: userInfo.status || ''                           // 显示现有个性签名
    });
  },

  // 微信用户的头像选择处理
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.updateAvatar(avatarUrl);
  },

  // 邮箱用户的头像选择处理
  async onChooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });
      
      if (res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath) {
        this.updateAvatar(res.tempFiles[0].tempFilePath);
      }
    } catch (err) {
      console.error('选择图片失败:', err);
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      });
    }
  },

  // 统一的头像更新处理
  async updateAvatar(avatarUrl) {
    try {
      wx.showLoading({ title: '更新中...' });

      // 获取用户ID
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      
      // 上传图片到微信云存储
      let fileID = '';
      if (avatarUrl.startsWith('cloud://')) {
        // 如果已经是fileID，直接使用
        fileID = avatarUrl;
      } else {
        // 否则上传到云存储
        const timestamp = Date.now();
        const cloudPath = `avatars/${userId}_${timestamp}.jpg`;
        
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: avatarUrl
          });
          
          if (!uploadRes.fileID) {
            throw new Error('图片上传失败');
          }
          
          fileID = uploadRes.fileID;
          console.debug('上传成功，fileID:', fileID);
        } catch (err) {
          console.error('上传图片失败:', err);
          throw new Error('上传图片失败');
        }
      }

      // 使用API更新用户信息，使用avatar_url字段保存微信云fileID
      const userData = {
        avatar_url: fileID
      };
      
      console.debug('更新用户头像信息:', userData);
      const res = await userAPI.updateUserInfo(userId, userData);

      if (res && res.success) {
        // 更新本地用户信息
        userManager.updateUserInfo({ 
          avatar_url: fileID,
          avatarUrl: fileID  // 同时更新两个字段，兼容不同地方的使用
        });
        
        // 更新页面数据
        const currentUserInfo = userManager.getCurrentUser();
        this.setData({ 
          userInfo: currentUserInfo 
        });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(res?.message || '更新失败');
      }
    } catch (err) {
      console.error('更新头像失败:', err);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 处理昵称输入
  onInputNickName(e) {
    this.setData({
      newNickName: e.detail.value
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
      wx.showLoading({ title: '保存中...' });
      
      // 获取用户ID
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      
      // 构建更新数据，只包含已修改的字段
      const userData = {};

      // 只有当内容真正发生变化时才更新
      if (this.data.newNickName !== (this.data.userInfo.nickname || this.data.userInfo.nickName)) {
        userData.nickname = this.data.newNickName;
      }

      if (this.data.newStatus !== this.data.userInfo.status) {
        userData.status = this.data.newStatus;
      }

      // 如果没有任何字段需要更新，直接返回
      if (Object.keys(userData).length === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '未做任何修改',
          icon: 'none'
        });
        return;
      }

      // 调用API更新用户信息
      const res = await userAPI.updateUserInfo(userId, userData);

      if (res && !res.error) {
        // 更新本地用户信息
        userManager.updateUserInfo(userData);

        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(res?.error || '保存失败');
      }
    } catch (err) {
      console.error('保存失败：', err);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },
  
  // 处理头像加载错误
  onAvatarError() {
    // 如果头像加载失败，使用默认头像
    const userInfo = this.data.userInfo;
    userInfo.avatarUrl = '/assets/icons/default-avatar.png';
    this.setData({ userInfo });
  }
});