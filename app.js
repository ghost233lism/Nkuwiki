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
      // 获取开发环境信息
      const env = __wxConfig.envVersion;
      const isDev = env === 'develop' || env === 'trial';
      console.debug(`当前小程序环境: ${env}, 开发模式: ${isDev}`);
      
      // 如果在开发环境，提示开发者开启域名校验豁免
      if (isDev) {
        console.info('当前处于开发环境，请确保在微信开发者工具中勾选"不校验合法域名"选项');
      }
      
      // 微信云托管的域名作为备选
      const tcbDomain = '6e6b-nkuwiki-8gcr16ev16f75c.tcb.qcloud.la';
      
      // 配置已在微信后台设置的域名（包括开发、体验、正式版本的合法域名）
      const domains = {
        develop: 'https://nkuwiki.com',
        trial: 'https://nkuwiki.com',
        release: 'https://nkuwiki.com'
      };
      
      // 根据环境选择域名
      if (domains[env]) {
        this.globalData.config.services.app.base_url = domains[env];
      }
      
      console.debug('服务器配置加载完成:', this.globalData.config);
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
