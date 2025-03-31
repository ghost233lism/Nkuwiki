// pages/profile/edit/edit.js
const {
  getStorage,
  setStorage,
  getOpenID
} = require('../../../utils/util');
const api = require('../../../utils/api/index');

Page({
  data: {
    userInfo: null,
    newNickName: '',  // 用于存储修改后的昵称
    newStatus: ''     // 用于存储修改后的个性签名
  },

  async onLoad() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const result = await api.user.getProfile({ isSelf: true });
      if (!result?.success) {
        throw new Error(result?.message || '获取用户信息失败');
      }
      
      const userInfo = result.data;
      userInfo.avatarUrl = userInfo.avatar || '/assets/icons/default-avatar.png';
      
      this.setData({ 
        userInfo,
        newNickName: userInfo.nickname || '',
        newStatus: userInfo.bio || ''
      });
    } catch (err) {
      console.debug('加载失败:', err);
      
      const localUserInfo = getStorage('userInfo');
      if (localUserInfo) {
        this.setData({ 
          userInfo: localUserInfo,
          newNickName: localUserInfo.nickname || '',
          newStatus: localUserInfo.bio || ''
        });
      }
      
      wx.showToast({
        title: err.message || '获取用户信息失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 微信用户的头像选择处理
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.updateAvatar(avatarUrl);
  },

  // 邮箱用户的头像选择处理
  async onChooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      
      if (res.tempFilePaths?.[0]) {
        this.updateAvatar(res.tempFilePaths[0]);
      }
    } catch (err) {
      console.debug('选择图片失败:', err);
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
      
      const openid = await getOpenID();
      if (!openid) throw new Error('用户未登录');

      const cloudPath = `avatars/${openid}_${Date.now()}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl
      });
      
      if (!uploadResult?.fileID) {
        throw new Error('上传头像失败: 未获取到文件ID');
      }

      const result = await api.user.updateProfile({
        avatar: uploadResult.fileID
      });
      
      if (!result?.success) {
        throw new Error(result?.message || '更新用户信息失败');
      }
      
      const userInfo = this.data.userInfo;
      userInfo.avatarUrl = uploadResult.fileID;
      userInfo.avatar = uploadResult.fileID;
      this.setData({ userInfo });
      setStorage('userInfo', userInfo);

      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
    } catch (err) {
      console.debug('更新头像失败:', err);
      wx.showToast({
        title: err.message || '更新失败',
        icon: 'none'
      });
    } finally {
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
      newStatus: e.detail.value.trim()
    });
  },

  // 保存修改
  async saveChanges() {
    try {
      wx.showLoading({ title: '保存中...' });
      
      const updateData = {};
      if (this.data.newNickName !== this.data.userInfo.nickname) {
        updateData.nickname = this.data.newNickName;
      }
      if (this.data.newStatus !== this.data.userInfo.bio) {
        updateData.bio = this.data.newStatus;
      }

      if (Object.keys(updateData).length === 0) {
        wx.showToast({
          title: '未做任何修改',
          icon: 'none'
        });
        return;
      }

      const result = await api.user.updateProfile(updateData);
      if (!result?.success) {
        throw new Error(result?.message || '保存失败');
      }

      const userInfo = this.data.userInfo;
      Object.assign(userInfo, updateData);
      setStorage('userInfo', userInfo);

      wx.showToast({
        title: '保存成功',
        icon: 'success',
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
    } catch (err) {
      console.debug('保存失败:', err);
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
})