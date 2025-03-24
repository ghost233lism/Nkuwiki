// app.js
const { logger } = require('./utils/api/index')
const userManager = require('./utils/user_manager')

App({
  globalData: {
    userInfo: null,
    systemInfo: null,
    envMode: 'dev', // 默认为开发环境
    config: {
      services: {
        app: {
          base_url: 'https://nkuwiki.com'
        }
      }
    }
  },
  
  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: 'nkuwiki-0g6bkdy9e8455d93',
        traceUser: true // 是否在将用户访问记录到用户管理中，在控制台中可见
      })
      logger.debug('云开发环境初始化成功')
    } else {
      logger.error('请使用 2.2.3 或以上的基础库以使用云能力')
    }
    
    // 获取系统信息
    this.getSystemInfo()
    
    // 尝试恢复用户登录状态
    this.checkLoginState()
    
    // 检查更新
    this.checkUpdate()
  },
  
  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: res => {
        this.globalData.systemInfo = res
        
        // 设置环境模式 - 安全地检测微信环境
        let envMode = 'dev'; // 默认为开发环境
        try {
          // 读取小程序环境信息
          if (wx.getAccountInfoSync) {
            const accountInfo = wx.getAccountInfoSync();
            // release: 正式版，trial: 体验版，develop: 开发版
            envMode = accountInfo.miniProgram.envVersion === 'release' ? 'prod' : 'dev';
          }
        } catch (err) {
          logger.debug('获取环境信息失败，使用默认开发环境:', err);
        }
        
        this.globalData.envMode = envMode;
        logger.debug('当前环境模式:', envMode);
        
        // 设置状态栏高度
        this.globalData.statusBarHeight = res.statusBarHeight;
        
        // 设置窗口高度和宽度
        this.globalData.windowHeight = res.windowHeight;
        this.globalData.windowWidth = res.windowWidth;
        
        // 设置屏幕安全区域
        if (res.safeArea) {
          this.globalData.safeAreaInsetBottom = res.screenHeight - res.safeArea.bottom;
        }
        
        logger.debug('系统信息初始化完成');
      },
      fail: err => {
        logger.error('获取系统信息失败:', err);
      }
    });
  },
  
  // 检查登录状态
  checkLoginState() {
    const isLoggedIn = userManager.isLoggedIn()
    
    if (isLoggedIn) {
      // 已登录状态，获取用户信息
      const userInfo = userManager.getCurrentUser()
      this.globalData.userInfo = userInfo
      logger.debug('恢复登录状态成功:', userInfo)
      
      // 尝试刷新token
      this.refreshUserToken()
    } else {
      logger.debug('未检测到登录状态')
    }
  },
  
  // 刷新用户token
  refreshUserToken() {
    // 尝试使用静默登录刷新用户信息
    userManager.loginWithOpenid()
      .then(userInfo => {
        this.globalData.userInfo = userInfo
        logger.debug('刷新用户信息成功')
      })
      .catch(err => {
        logger.error('刷新用户信息失败:', err)
      })
  },
  
  // 检查小程序更新
  checkUpdate() {
    if (typeof wx.getUpdateManager === 'function') {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate(res => {
        if (res.hasUpdate) {
          logger.info('检测到新版本')
          
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: result => {
                if (result.confirm) {
                  // 重启应用
                  updateManager.applyUpdate()
                }
              }
            })
          })
          
          updateManager.onUpdateFailed(() => {
            logger.error('新版本下载失败')
            
            wx.showModal({
              title: '已有新版本',
              content: '新版本已经上线，请您删除当前小程序，重新搜索打开'
            })
          })
        }
      })
    } else {
      logger.warn('当前微信版本过低，无法使用更新检测功能')
    }
  }
})
