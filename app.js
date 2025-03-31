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
    // 强制进入登录页
    // 无论用户是否有本地存储的信息，都需要走登录流程
    // 这样确保每次启动应用都会调用sync接口将用户ID上传到服务器
    console.log('强制跳转到登录页面，确保调用sync接口');
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  // 微信一键登录
  wxLogin: async function() {
    return new Promise(async (resolve, reject) => {
      try {
        const userApi = require('./utils/api/user');
        console.log('开始调用用户登录API');
        
        // 避免系统默认弹窗
        wx.hideLoading();
        
        // 调用API模块中的login方法，不再使用云函数
        const result = await userApi.login(this.globalData.userInfo || {});
        
        if (result && (result.code === 0 || result.success === true)) {
          this.globalData.userInfo = result.data;
          console.log('登录成功，用户信息:', result.data);
          resolve(result);
        } else {
          console.error('登录失败:', result?.message);
          reject(new Error(result?.message || '登录失败'));
        }
      } catch (err) {
        console.error('登录过程发生异常:', err);
        reject(err);
      }
    });
  },

  logout() {
    // 清除所有本地存储
    wx.clearStorageSync();

    // 重定向到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  globalData: {
    config: {
      services: {
        app: {
          base_url: 'https://nkuwiki.com',
          conversation_max_tokens: 100000000,
          expires_in_seconds: 3600
        }
      }
    },
    isLogging: false // 添加登录状态全局变量
  }
})
