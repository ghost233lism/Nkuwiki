// app.js
const userManager = require('./utils/user_manager')

App({
  onLaunch() {
    // 获取系统信息，设置全局数据 (使用新API替换旧的wx.getSystemInfoSync)
    // 合并各种信息到一个对象中
    const systemInfo = {
      ...wx.getDeviceInfo(),
      ...wx.getAppBaseInfo(),
      ...wx.getWindowInfo()
    };
    
    // 初始化全局数据
    this.globalData = {
      systemInfo,
      userInfo: null,
      hasLogin: false,
      needUpdatePosts: false,     // 标记是否需要更新帖子数据
      postUpdates: {},            // 存储最近更新的帖子数据
      postUpdateTimestamp: 0,     // 上次数据同步时间戳
      needRefreshIndexPosts: false, // 是否需要刷新首页帖子列表
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
        // 云环境ID从开发者控制台获取
        // 微信开发者工具 -> 云开发 -> 设置 -> 环境ID
        const cloudEnvId = 'nkuwiki-0g6bkdy9e8455d93';  // 更新为正确的环境ID
        
        wx.cloud.init({
          env: cloudEnvId,
          traceUser: true
        });
        
        // 检查初始化是否成功
        const curEnv = wx.cloud.DYNAMIC_CURRENT_ENV || wx.cloud.env || null;
        if (curEnv) {
          console.debug('云开发环境初始化成功，环境ID:', curEnv);
          this.globalData.cloudEnvId = cloudEnvId;
        } else {
          console.error('云开发环境初始化可能失败，未获取到环境信息');
        }
      } catch (error) {
        console.error('云开发环境初始化失败:', error);
        
        // 尝试匿名初始化（不指定环境ID）
        try {
          wx.cloud.init({
            traceUser: true
          });
          console.debug('尝试匿名初始化云开发环境');
        } catch (retryError) {
          console.error('匿名初始化云开发环境也失败:', retryError);
        }
      }
    } else {
      console.warn('当前微信基础库不支持云开发');
    }
    
    // 日志配置
    const logger = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : console;
    this.logger = logger;
    
    logger.info('应用启动，系统信息：', systemInfo.platform, systemInfo.SDKVersion);

    // 初始化用户信息
    this.initUserInfo()

    // 加载服务器配置
    this.loadServerConfig()
    
    // 启动数据同步任务
    this.startDataSyncTask()
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
      const userInfo = userManager.getCurrentUser();
      
      console.debug('应用启动，初始化用户信息:', userInfo);
      
      // 检查用户openid是否有效
      const openid = userInfo?.openid || userInfo?.id || userInfo?._id;
      
      if (openid) {
        console.debug(`用户openid检查: ${openid} (有效的用户标识符)`);
      }
      
      // 如果用户已登录但信息不完整，尝试从服务器刷新
      if (userManager.isLoggedIn() && !userManager.isUserInfoComplete(userInfo)) {
        console.debug('用户信息不完整，尝试从服务器刷新');
        
        // 在API请求中使用openid
        const { userAPI } = require('./utils/api/index');
        if (openid) {
          try {
            const updatedUserInfo = await userAPI.getUserInfo(openid);
            if (updatedUserInfo && updatedUserInfo.id) {
              // 更新用户信息
              userManager.saveUserInfo(updatedUserInfo);
              console.debug('成功从服务器刷新用户信息');
              this.globalData.userInfo = updatedUserInfo;
              return;
            }
          } catch (apiError) {
            console.error('从服务器刷新用户信息失败:', apiError);
          }
        }
      }
      
      // 存储到全局状态
      this.globalData.userInfo = userInfo;
    } catch (error) {
      console.error('初始化用户信息失败:', error);
    }
  },

  // 获取登录用户信息
  getUserInfo() {
    // 确保返回的是最新的用户信息
    const userInfo = userManager.getCurrentUser();
    
    // 更新全局缓存
    if (userInfo && (userInfo.id || userInfo._id)) {
      this.globalData.userInfo = userInfo;
    }
    
    return userInfo;
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
      // 获取系统信息 - 替换为新的API
      try {
        // 合并来自各个新API的信息
        const deviceInfo = wx.getDeviceInfo();
        const appBaseInfo = wx.getAppBaseInfo();
        const windowInfo = wx.getWindowInfo();
        const systemSetting = wx.getSystemSetting();
        
        // 合并所有信息
        const combinedInfo = {
          ...deviceInfo,
          ...appBaseInfo,
          ...windowInfo,
          ...systemSetting
        };
        
        console.debug('系统环境信息:', JSON.stringify({
          platform: combinedInfo.platform,
          system: combinedInfo.system,
          version: combinedInfo.version,
          SDKVersion: combinedInfo.SDKVersion
        }));
        
        // 保存系统信息
        this.globalData.systemInfo = combinedInfo;
      } catch (infoErr) {
        console.error('获取系统信息失败:', infoErr);
      }
      
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

  // 启动定时数据同步任务
  startDataSyncTask() {
    console.debug('启动定时数据同步任务');
    
    // 清除可能存在的旧定时器
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    // 设置定时器，每30秒检查一次是否需要同步数据
    this.syncTimer = setInterval(() => {
      this.syncPostsData();
    }, 30000); // 30秒
    
    // 立即执行一次同步
    this.syncPostsData();
  },
  
  // 同步帖子数据
  async syncPostsData() {
    // 如果没有需要更新的数据，直接返回
    if (!this.globalData.needUpdatePosts) {
      return;
    }
    
    try {
      console.debug('开始同步帖子数据');
      
      // 获取需要更新的帖子ID
      const updates = this.globalData.postUpdates || {};
      const postIds = Object.keys(updates);
      
      if (!postIds.length) {
        return;
      }
      
      // 调用API获取最新帖子数据
      const { postAPI } = require('./utils/api/index');
      const latestData = await postAPI.getPostUpdates(postIds);
      
      if (!latestData || !latestData.length) {
        return;
      }
      
      console.debug('获取到最新帖子数据:', latestData.length, '条');
      
      // 更新全局数据
      latestData.forEach(post => {
        if (post && post.id) {
          // 合并现有数据与最新数据
          this.globalData.postUpdates[post.id] = {
            ...updates[post.id],
            ...post,
            updateTime: Date.now()
          };
        }
      });
      
      // 更新时间戳
      this.globalData.postUpdateTimestamp = Date.now();
      
      // 重置更新标志
      this.globalData.needUpdatePosts = false;
      
      console.debug('帖子数据同步完成');
      
      // 通知所有页面更新数据
      this.notifyPagesUpdate();
    } catch (error) {
      console.error('同步帖子数据失败:', error);
    }
  },
  
  // 获取帖子最新数据
  getPostLatestData(postId) {
    if (!postId || !this.globalData.postUpdates) {
      return null;
    }
    
    return this.globalData.postUpdates[postId] || null;
  },
  
  // 通知所有页面更新数据
  notifyPagesUpdate() {
    const pages = getCurrentPages();
    
    pages.forEach(page => {
      // 如果页面定义了onPostsDataUpdate方法，则调用
      if (page && typeof page.onPostsDataUpdate === 'function') {
        try {
          page.onPostsDataUpdate(this.globalData.postUpdates);
        } catch (error) {
          console.error('通知页面更新失败:', error);
        }
      }
    });
  },

  globalData: {
    userInfo: null,
    hasLogin: false,
    systemInfo: null
  }
})
