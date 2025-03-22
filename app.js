// app.js
App({
  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'nkuwiki-0g6bkdy9e8455d93',
        traceUser: true
      })
    }

    // 检查登录状态
    this.checkLoginStatus()

    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    
    if (userInfo && token) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    } else {
      // 标记未登录状态，但不强制跳转
      this.globalData.isLoggedIn = false;
      
      // 判断当前是否在首页或登录页，如果不是才跳转
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        const currentRoute = currentPage.route;
        
        // 只有不在首页/登录页/注册页时才跳转到登录页
        if (currentRoute !== 'pages/index/index' && 
            currentRoute !== 'pages/login/login') {
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    }
  },

  // 微信一键登录
  wxLogin: async function() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        success: res => {
          if (res.result.code === 0) {
            this.globalData.userInfo = res.result.data;
            this.globalData.isLoggedIn = true;
            
            // 存储用户信息到本地
            wx.setStorageSync('userInfo', res.result.data);
            // 模拟token存储 (实际项目应从服务器获取token)
            wx.setStorageSync('token', 'mock_token_' + Date.now());
            
            resolve(res.result);
          } else {
            reject(new Error(res.result.message || '登录失败'));
          }
        },
        fail: err => {
          console.error('登录失败：', err);
          reject(err);
        }
      });
    });
  },

  logout() {
    // 清除所有本地存储
    wx.clearStorageSync();
    
    // 重置全局状态
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;

    // 重定向到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    needRefreshIndexPosts: false, // 标记首页是否需要刷新帖子列表
    config: {
      services: {
        app: {
          base_url: 'https://nkuwiki.com',
          conversation_max_tokens: 100000000,
          expires_in_seconds: 3600
        }
      }
    }
  }
})
