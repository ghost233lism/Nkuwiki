// 引入API工具
const { userAPI } = require('../../utils/api');
const userManager = require('../../utils/user_manager');

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
      // 使用微信官方登录方法
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: (res) => {
            if (res.code) {
              resolve(res);
            } else {
              reject(new Error(res.errMsg || '获取登录凭证失败'));
            }
          },
          fail: (err) => {
            reject(new Error(err.errMsg || '登录失败'));
          }
        });
      });
      
      console.debug('获取登录code成功:', loginResult.code);
      
      // 调用云函数进行登录
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {},
        config: {
          env: 'nkuwiki-0g6bkdy9e8455d93'
        }
      });
      
      console.debug('云函数登录结果:', res);
      
      if (res && res.result && res.result.code === 0) {
        // 处理登录成功结果
        const userInfo = res.result.data;
        
        // 保存用户信息
        userManager.updateUserInfo(userInfo);
        
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
          // 直接使用云函数获取到的用户信息
          backendUser = {
            id: userInfo._id,
            ...userInfo
          };
          
          console.debug('获取到用户信息:', backendUser);
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
        userManager.saveUserInfo(mergedUserInfo);
        
        // 跳转到首页
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        throw new Error((res && res.result && res.result.message) || '登录失败');
      }
    } catch (err) {
      console.error('登录过程出错:', err);
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
    
    // 使用用户管理器
    const userInfo = userManager.getCurrentUser();
    
    // 更新头像
    userManager.updateUserInfo({ avatar_url: avatarUrl });
    
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