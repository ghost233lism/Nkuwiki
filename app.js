// app.js
const { storage } = require('./utils/util');

App({
  onLaunch() {
    console.debug('App Launch');
    
    // 检查登录状态
    this.checkLoginState();
    
    // 获取系统信息
    this.globalData.systemInfo = wx.getSystemInfoSync();
    
    // 加载配置
    this.loadConfig();
    
    // 获取应用信息
    this.loadAboutInfo();
    
    // 初始化云开发环境
    if (!wx.cloud) {
      console.debug('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'nkuwiki-0g6bkdy9e8455d93',
        traceUser: true
      });
    }

    // 确保isLogging被重置为false
    storage.set('isLogging', false);

    // 记录启动日志
    const logs = storage.get('logs') || [];
    logs.unshift(Date.now());
    storage.set('logs', logs);

    // 初始化全局数据
    const openid = storage.get('openid');
    if (openid) {
      this.globalData.openid = openid;
      this.globalData.userInfo = storage.get('userInfo');
    }
  },

  /**
   * 加载应用配置
   */
  loadConfig() {
    try {
      // 从本地存储中获取配置信息
      const storedConfig = storage.get('app_config');
      if (storedConfig) {
        // 合并存储的配置到全局配置
        this.globalData.config = {
          ...this.globalData.config,
          ...storedConfig
        };
        console.debug('从存储加载配置成功');
      } else {
        // 如果没有存储的配置，保存默认配置到存储中
        storage.set('app_config', this.globalData.config);
      }
    } catch (err) {
      console.debug('加载配置失败:', err);
    }
  },
  
  /**
   * 从服务器加载应用信息
   */
  async loadAboutInfo() {
    try {
      const { createApiClient } = require('./utils/util');
      
      // 创建API客户端
      const aboutApi = createApiClient('/api/wxapp', {
        info: {
          method: 'GET',
          path: '/about',
        }
      });
      
      // 调用接口获取应用信息
      const res = await aboutApi.info();
      
      if (res.code === 200 && res.data) {
        // 更新全局应用信息
        this.globalData.aboutInfo = {
          ...this.globalData.aboutInfo,
          ...res.data
        };
        console.debug('从服务器加载应用信息成功');
      } else {
        console.debug('加载应用信息失败:', res.message);
      }
    } catch (err) {
      // 加载失败时使用默认信息
      console.debug('加载应用信息请求失败:', err);
    }
  },
  
  /**
   * 获取应用信息
   * @param {boolean} forceReload 是否强制重新从服务器加载
   * @returns {Object} 应用信息
   */
  async getAboutInfo(forceReload = false) {
    if (forceReload) {
      await this.loadAboutInfo();
    }
    return this.globalData.aboutInfo;
  },
  
  /**
   * 检查服务器可用性
   */
  async checkServerStatus() {
    try {
      // 使用ping接口检查服务器是否可用
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: this.globalData.config.services.app.base_url + '/api/ping',
          method: 'GET',
          success: resolve,
          fail: reject,
          timeout: 5000 // 设置5秒超时
        });
      });
      
      if (res.statusCode === 200) {
        console.debug('服务器连接正常');
        return true;
      } else {
        console.debug('服务器连接异常:', res.statusCode);
        return false;
      }
    } catch (err) {
      console.debug('服务器连接失败:', err);
      return false;
    }
  },

  logout() {
    console.debug('用户登出');
    storage.remove('userInfo');
    storage.remove('openid');
    storage.remove('token');
    storage.remove('isLogging');
    storage.set('isLogging', false);
    this.globalData.userInfo = null;
    this.globalData.openid = null;
  },

  /**
   * 检查登录状态（只检查本地存储）
   */
  checkLoginState() {
    const openid = storage.get('openid');
    const userInfo = storage.get('userInfo');
    
    const isLoggedIn = !!openid && !!userInfo && !!userInfo.id;
    
    this.globalData.isLoggedIn = isLoggedIn;
    this.globalData.openid = openid;
    this.globalData.userInfo = userInfo;
    
    // 如果本地显示已登录，则触发一次同步请求验证登录状态
    if (isLoggedIn) {
      // 创建临时authBehavior对象来同步用户信息
      try {
        const { createApiClient } = require('./utils/util');
        const userApi = createApiClient('/api/wxapp/user', {
          sync: {
            method: 'POST',
            path: '/sync'
          }
        });
        
        // 异步发送同步请求，不等待结果
        userApi.sync({ openid }).then(res => {
          if (res.code === 200 && res.data) {
            // 更新本地用户信息
            storage.set('userInfo', res.data);
            this.globalData.userInfo = res.data;
          } else {
            // 同步失败，清除登录状态
            console.debug('同步用户信息失败，清除登录状态');
            this.clearLoginState();
          }
        }).catch(err => {
          console.debug('同步用户信息请求失败:', err);
          // 请求失败不清除登录状态，可能是网络问题
        });
      } catch (err) {
        console.debug('创建API客户端失败:', err);
      }
    }
    
    return isLoggedIn;
  },
  
  /**
   * 清除登录状态
   */
  clearLoginState() {
    storage.remove('openid');
    storage.remove('userInfo');
    
    this.globalData.userInfo = null;
    this.globalData.openid = null;
    this.globalData.isLoggedIn = false;
  },

  // 全局数据对象
  globalData: {
    userInfo: null,
    openid: null,
    isLoggedIn: false,
    postsUpdated: false,
    isWxAuthorized: false,
    hasUserInfoAuth: false,
    aboutInfo: {
      version: '0.0.1'
    },
    systemInfo: null,
    // API配置
    API_CONFIG: {
      base_url: 'https://nkuwiki.com',
      api_prefix: '/api',
      prefixes: {
        wxapp: '/wxapp',
        agent: '/agent',
      },
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
});
