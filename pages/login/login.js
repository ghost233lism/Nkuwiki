Page({
  data: {
    // 移除邮箱相关字段
    loginLoading: false,
    loginSuccess: false
  },

  onLoad() {
    // 页面加载时检查是否正在登录中
    const app = getApp();
    if (app.globalData.isLogging) {
      this.setData({ loginLoading: true });
    }
  },

  // 微信登录功能
  async handleWxLogin() {
    if (this.data.loginLoading) return; // 防止重复点击
    
    try {
      const app = getApp();
      // 设置全局和本地的登录状态
      app.globalData.isLogging = true;
      this.setData({ loginLoading: true, loginSuccess: false });
      
      // 添加短暂延迟，让动画显示更自然
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 调用APP实例的登录方法 - 不使用默认的loading
      wx.hideLoading(); // 确保隐藏任何系统loading
      const res = await app.wxLogin();
      
      // 判断登录成功
      if (res && (res.code === 0 || res.success === true)) {
        // 保存用户信息到本地
        wx.setStorageSync('userInfo', res.data);
        console.log('登录成功，准备跳转到首页');
        
        // 显示成功状态
        this.setData({ loginSuccess: true });
        
        // 成功消息使用自定义样式，不显示系统toast
        setTimeout(() => {
          app.globalData.isLogging = false;
          this.setData({ loginLoading: false, loginSuccess: false });
          // 使用switchTab确保能跳转到tabBar页面
          wx.switchTab({ url: '/pages/index/index' });
        }, 1500);
      } else {
        app.globalData.isLogging = false;
        this.setData({ loginLoading: false, loginSuccess: false });
        throw new Error(res?.message || '登录失败，请重试');
      }
    } catch (err) {
      console.error('登录失败:', err);
      getApp().globalData.isLogging = false;
      this.setData({ loginLoading: false, loginSuccess: false });
      
      // 显示错误信息
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  onChooseAvatar(e) {
    // 保留头像选择功能
    const { avatarUrl } = e.detail;
    // 处理头像...
  }
}) 