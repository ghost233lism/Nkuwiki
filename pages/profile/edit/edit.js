// pages/profile/edit/edit.js
const userManager = require('../../../utils/user_manager');
const userAPI = require('../../../api/user_api');
const logger = require('../../../utils/logger');
const uploadHelper = require('../../../utils/upload_helper');

Page({
  data: {
    user: null,
    isUpdating: false,
    showDatePicker: false,
    dateValue: "",
    inputData: {
      nickname: '',
      birthday: '',
      wechatId: '',
      qqId: '',
      bio: ''
    },
    modified: {
      nickname: false,
      birthday: false,
      wechatId: false,
      qqId: false,
      bio: false,
      avatar: false
    }
  },

  onLoad() {
    // 获取当前用户信息
    const user = userManager.getUser();
    if (!user) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 设置已有的用户信息
    this.setData({
      user,
      inputData: {
        nickname: user.nickname || '',
        birthday: user.birthday || '',
        wechatId: user.wechatId || '',
        qqId: user.qqId || '',
        bio: user.bio || ''
      }
    });

    logger.debug('已加载用户信息:', this.data.user);
  },

  // 选择头像
  onChooseAvatar(e) {
    logger.debug('选择头像:', e);
    const { avatarUrl } = e.detail;
    
    if (!avatarUrl) {
      wx.showToast({
        title: '获取头像失败',
        icon: 'none'
      });
      return;
    }
    
    // 更新头像
    this.updateAvatar(avatarUrl);
  },
  
  // 更新头像
  async updateAvatar(avatarUrl) {
    try {
      this.setData({ isUpdating: true });
      
      // 使用uploadHelper上传头像
      const userId = this.data.user.id || 'anonymous';
      const fileID = await uploadHelper.uploadImage(
        avatarUrl, 
        'avatars', 
        userId, 
        true, // 压缩 
        90,    // 质量
        400    // 最大宽度
      );
      
      if (!fileID) {
        throw new Error('上传头像失败');
      }
      
      // 调用API更新头像URL
      const result = await userAPI.updateUserInfo({
        avatar: fileID
      });
      
      if (result.success) {
        // 更新本地用户数据
        const updatedUser = {...this.data.user, avatar: fileID};
        userManager.updateUser(updatedUser);
        
        this.setData({
          user: updatedUser,
          'modified.avatar': true
        });
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (error) {
      logger.error('更新头像失败:', error);
      wx.showToast({
        title: '更新头像失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isUpdating: false });
    }
  },

  // 昵称输入
  onNicknameInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.nickname': value,
      'modified.nickname': value !== this.data.user.nickname
    });
  },

  // 生日选择
  onBirthdayChange(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.birthday': value,
      'modified.birthday': value !== this.data.user.birthday
    });
  },

  // 微信ID输入
  onWechatIdInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.wechatId': value,
      'modified.wechatId': value !== this.data.user.wechatId
    });
  },

  // QQ号输入
  onQQIdInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.qqId': value,
      'modified.qqId': value !== this.data.user.qqId
    });
  },

  // 个人简介输入
  onBioInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.bio': value,
      'modified.bio': value !== this.data.user.bio
    });
  },

  // 保存更改
  async saveChanges() {
    try {
      const { modified, inputData } = this.data;
      
      // 检查是否有修改
      const hasModifications = Object.values(modified).some(v => v);
      if (!hasModifications) {
        wx.showToast({
          title: '未做任何修改',
          icon: 'none'
        });
        return;
      }
      
      this.setData({ isUpdating: true });
      
      // 构建更新对象，只包含修改过的字段
      const updateData = {};
      
      if (modified.nickname) updateData.nickname = inputData.nickname;
      if (modified.birthday) updateData.birthday = inputData.birthday;
      if (modified.wechatId) updateData.wechatId = inputData.wechatId;
      if (modified.qqId) updateData.qqId = inputData.qqId;
      if (modified.bio) updateData.bio = inputData.bio;
      
      // 调用API更新用户信息
      const result = await userAPI.updateUserInfo(updateData);
      
      if (result.success) {
        // 更新本地用户数据
        const updatedUser = {...this.data.user, ...updateData};
        userManager.updateUser(updatedUser);
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 重置修改状态
        this.setData({
          user: updatedUser,
          modified: {
            nickname: false,
            birthday: false,
            wechatId: false,
            qqId: false,
            bio: false,
            avatar: false
          }
        });
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (error) {
      logger.error('保存个人信息失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isUpdating: false });
    }
  },
  
  // 头像加载错误处理
  onAvatarError() {
    this.setData({
      'user.avatar': '/assets/icons/default-avatar.png'
    });
  }
});