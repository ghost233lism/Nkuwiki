// 引入API工具
const { userAPI } = require('../../utils/api');

Page({
  data: {
    loading: false,
    showAvatarButton: false
  },

  // 微信一键登录
  async handleWxLogin() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      // 调用全局登录方法
      const res = await getApp().wxLogin();
      
      if (res.code === 0) {
        // 使用微信个人信息创建/更新后端用户
        const userInfo = res.data;
        
        // 将openid作为wxapp_id
        const userData = {
          wxapp_id: userInfo.openid,
          openid: userInfo.openid,
          unionid: userInfo.unionid || '',
          nickname: userInfo.nickName || '',
          avatar_url: userInfo.avatarUrl || '',
          gender: userInfo.gender || 0,
          country: userInfo.country || '',
          province: userInfo.province || '',
          city: userInfo.city || '',
          language: userInfo.language || 'zh_CN'
        };
        
        // 尝试获取/创建用户信息到后端
        let backendUser;
        
        try {
          // 先尝试通过openid查询用户
          console.log('尝试查询现有用户');
          const params = {
            limit: 1,
            offset: 0,
            openid: userInfo.openid
          };
          
          const existingUsers = await userAPI.getUsers(params);
          
          if (existingUsers && Array.isArray(existingUsers) && existingUsers.length > 0) {
            console.log('找到现有用户:', existingUsers[0]);
            backendUser = existingUsers[0];
            
            // 更新用户信息
            console.log('更新用户信息');
            await userAPI.updateUserInfo(backendUser.id, {
              nickname: userInfo.nickName || '',
              avatar_url: userInfo.avatarUrl || '',
              gender: userInfo.gender || 0
            });
          } else {
            // 未找到用户，尝试创建
            console.log('未找到用户，尝试创建新用户');
            backendUser = await userAPI.createUser(userData);
          }
        } catch (error) {
          console.error('用户操作失败:', error);
          
          // 显示更详细的错误信息
          let errorMessage = '登录失败';
          if (error && error.message) {
            errorMessage = `登录失败: ${error.message}`;
          }
          
          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 3000
          });
          
          this.setData({ loading: false });
          return;
        }
        
        if (!backendUser || !backendUser.id) {
          throw new Error('获取用户信息失败');
        }
        
        // 将后端用户ID与本地用户信息合并
        const mergedUserInfo = {
          ...userInfo,
          id: backendUser.id
        };
        
        // 保存合并后的用户信息
        wx.setStorageSync('userInfo', mergedUserInfo);
        
        // 跳转到首页
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        throw new Error(res.message || '登录失败');
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    // 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 更新头像
    userInfo.avatarUrl = avatarUrl;
    wx.setStorageSync('userInfo', userInfo);
    
    // 如果已登录，更新后端用户信息
    if (userInfo.id) {
      userAPI.updateUserInfo(userInfo.id, {
        avatar_url: avatarUrl
      }).catch(err => {
        console.error('更新头像失败:', err);
      });
    }
    
    wx.showToast({
      title: '头像已更新',
      icon: 'success'
    });
  }
}) 