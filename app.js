// app.js
const userManager = require('./utils/user_manager')

App({
  onLaunch() {
    // 获取系统信息，设置全局数据
    const systemInfo = wx.getSystemInfoSync();
    
    // 初始化全局数据
    this.globalData = {
      systemInfo,
      userInfo: null,
      hasLogin: false,
      config: {
        services: {
          app: {
            base_url: 'https://nkuwiki.com',  // 默认服务器地址
            env: 'production'  // 默认环境
          }
        }
      }
    };
    
    // 检查版本兼容性
    this.checkCompatibility(systemInfo);
    
    // 初始化云开发环境
    if (wx.cloud) {
      try {
        wx.cloud.init({
          env: 'nkuwiki-2gftkp7ze3a27f70',  // 更新为正确的环境ID
          traceUser: true
        });
        console.debug('云开发环境初始化成功');
      } catch (error) {
        console.error('云开发环境初始化失败:', error);
      }
    }
    
    // 日志配置
    const logger = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : console;
    this.logger = logger;
    
    logger.info('应用启动，系统信息：', systemInfo.platform, systemInfo.SDKVersion);

    // 初始化用户信息
    this.initUserInfo()

    // 加载服务器配置
    this.loadServerConfig()
  },

  // 检查版本兼容性
  checkCompatibility(systemInfo) {
    const minVersion = '2.10.4'; // 最低要求的基础库版本
    
    // 检查基础库版本
    if (this.compareVersion(systemInfo.SDKVersion, minVersion) < 0) {
      // 提示用户更新微信版本
      wx.showModal({
        title: '提示',
        content: `当前微信版本过低，请升级到最新微信版本后重试。当前版本:${systemInfo.SDKVersion}，需要:${minVersion}`,
        showCancel: false
      });
    }
  },
  
  // 版本号比较函数
  compareVersion(v1, v2) {
    v1 = v1.split('.');
    v2 = v2.split('.');
    const len = Math.max(v1.length, v2.length);
    
    while (v1.length < len) {
      v1.push('0');
    }
    while (v2.length < len) {
      v2.push('0');
    }
    
    for (let i = 0; i < len; i++) {
      const num1 = parseInt(v1[i]);
      const num2 = parseInt(v2[i]);
      
      if (num1 > num2) {
        return 1;
      } else if (num1 < num2) {
        return -1;
      }
    }
    return 0;
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
    console.debug('开始加载服务器配置...');
    
    // 首先初始化默认配置，确保始终有可用配置
    this.globalData.config = {
      services: {
        app: {
          base_url: 'https://nkuwiki.com',
          backup_domains: []
        }
      },
      features: {
        debug: false,
        offline_mode: false
      },
      api: {
        timeout: 10000,
        retry_count: 1
      }
    };
    
    try {
      // 获取开发环境信息
      const env = __wxConfig.envVersion;
      const isDev = env === 'develop' || env === 'trial';
      console.debug(`当前小程序环境: ${env}, 开发模式: ${isDev}`);
      
      // 如果在开发环境，提示开发者开启域名校验豁免
      if (isDev) {
        console.debug('当前处于开发环境，请确保在微信开发者工具中勾选"不校验合法域名"选项');
        // 开发环境启用调试
        this.globalData.config.features.debug = true;
      }
      
      // 配置已在微信后台设置的域名（包括开发、体验、正式版本的合法域名）
      const domains = {
        develop: 'https://nkuwiki.com',
        trial: 'https://nkuwiki.com',
        release: 'https://nkuwiki.com'
      };
      
      // 备用域名列表
      const backupDomains = [
        '6e6b-nkuwiki-8gcr16ev16f75c.tcb.qcloud.la'
      ];
      
      // 根据环境选择域名
      if (domains[env]) {
        this.globalData.config.services.app.base_url = domains[env];
        // 保存备用域名列表
        this.globalData.config.services.app.backup_domains = backupDomains;
      }
      
      // 不要使用getApp()来访问自身，这会导致递归调用
      // 直接使用this指向当前App实例
      console.debug('服务器配置加载完成:', JSON.stringify(this.globalData.config));
      
      // 运行环境诊断
      this.diagnoseEnvironment();
    } catch (error) {
      console.error('加载服务器配置失败:', error);
    }
  },
  
  // 诊断运行环境
  diagnoseEnvironment() {
    try {
      // 获取系统信息
      wx.getSystemInfo({
        success: (res) => {
          console.debug('系统环境信息:', JSON.stringify({
            platform: res.platform,
            system: res.system,
            version: res.version,
            SDKVersion: res.SDKVersion
          }));
          
          // 保存系统信息
          this.globalData.systemInfo = res;
        },
        fail: (err) => {
          console.error('获取系统信息失败:', err);
        }
      });
      
      // 检查网络状态
      wx.getNetworkType({
        success: (res) => {
          console.debug('网络状态:', res.networkType);
          const isOffline = res.networkType === 'none';
          
          // 如果离线，启用离线模式
          if (isOffline) {
            console.warn('设备当前处于离线状态，启用离线模式');
            this.globalData.config.features.offline_mode = true;
          }
        }
      });
    } catch (error) {
      console.error('运行环境诊断失败:', error);
    }
  },

  globalData: {
    userInfo: null,
    hasLogin: false,
    systemInfo: null
  }
})
