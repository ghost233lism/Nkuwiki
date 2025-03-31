// app.js
App({
  onLaunch: function() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'nkuwiki-0g6bkdy9e8455d93',  // 云开发环境id
        traceUser: true  // 是否在将用户访问记录到用户管理中，在控制台中可见
      });
    }

    // 检查登录状态
    this.checkLoginStatus();

    // 记录启动日志
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
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
    const userApi = require('./utils/api/user');
    const result = await userApi.login();
    return result;
  },

  logout() {
    // 清除所有本地存储
    wx.clearStorageSync();

    // 清除全局变量
    this.globalData.userInfo = null;
    this.globalData.openid = null;

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
    isLogging: false, // 添加登录状态全局变量
    openid: null, // 添加openid全局变量
    userInfo: null // 添加用户信息全局变量
  }
})
