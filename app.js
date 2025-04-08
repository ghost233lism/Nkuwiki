const {init, nav, logger} = require('./utils/index');
App({
  async onLaunch() {
    try {
      // 根据环境设置日志级别
      if (logger && typeof logger.setLevel === 'function') {
        // 使用新的API代替废弃的getSystemInfoSync
        const appBaseInfo = wx.getAppBaseInfo();
        if (appBaseInfo.platform === 'devtools') {
          // 开发环境 - 输出所有日志
          logger.setLevel(4); // DEBUG级别
        } else {
          // 生产环境 - 只输出警告和错误
          logger.setLevel(2); // WARN级别
        }
      } else {
        console.warn('日志工具未正确初始化，将使用默认日志行为');
      }
      
      // 使用一个函数完成所有初始化操作
      await init();
      // 强制先进一下登录页，展示logo和版本信息
      wx.reLaunch({
        url: '/pages/login/login'
      });
    } catch (err) {
      console.error('应用启动失败', err);
    }
  },
  // 实际使用的配置在utils/util.js中，这里仅作展示
  globalData: {
    defaultAvatar: 'cloud://cloud1-7gu881ir0a233c29.636c-cloud1-7gu881ir0a233c29-1352978573/avatar1.png',
    cloudEnv: 'cloud1-7gu881ir0a233c29',
    version: '0.0.1',
    API_CONFIG: {
      base_url: 'https://nkuwiki.com',
      api_prefix: '/api',
      prefixes: {wxapp: '/wxapp', agent: '/agent'},
      headers: {'Content-Type': 'application/json'}
    }
  }
});
