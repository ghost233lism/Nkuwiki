// app.js
const userManager = require('./utils/user_manager')

App({
  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true,
        env: 'nkuwiki-0g6bkdy9e8455d93'
      })
    }

    // 初始化用户信息
    this.initUserInfo()

    // 加载服务器配置
    this.loadServerConfig()
  },

  // 初始化用户信息
  async initUserInfo() {
    try {
      // 获取当前用户信息
      const userInfo = userManager.getCurrentUser()
      
      console.debug('应用启动，初始化用户信息:', userInfo)
      
      // 如果用户已登录但信息不完整，尝试从服务器刷新
      if (userManager.isLoggedIn() && !userManager.isUserInfoComplete(userInfo)) {
        console.debug('用户信息不完整，尝试从服务器刷新')
        // 这里可以添加从服务器刷新用户信息的代码
        // ...
      }
      
      // 存储到全局状态
      this.globalData.userInfo = userInfo
    } catch (error) {
      console.error('初始化用户信息失败:', error)
    }
  },

  // 获取登录用户信息
  getUserInfo() {
    return userManager.getCurrentUser()
  },

  // 加载服务器配置
  async loadServerConfig() {
    // 初始化默认配置
    this.globalData.config = {
      services: {
        app: {
          base_url: 'https://nkuwiki.com'
        }
      }
    }
    
    try {
      // 尝试从云函数或本地获取配置
      // ...
    } catch (error) {
      console.error('加载服务器配置失败:', error)
    }
  },

  globalData: {
    userInfo: null,
    needRefreshIndexPosts: false,
    config: null
  }
})
