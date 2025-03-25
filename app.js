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
    },
    needRefreshIndexPosts: false,     // 标记是否需要刷新首页帖子
    needRefreshUserInfo: false,       // 标记是否需要刷新用户信息
    lastUserInfoUpdate: 0,            // 用户信息最后更新时间
    postUpdates: {},                  // 帖子更新数据
    postUpdateTimestamp: 0            // 帖子更新时间戳
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
  },
  
  /**
   * 全局数据变更时通知相关页面
   * @param {string} dataType - 更新的数据类型
   * @param {any} data - 更新的数据内容
   */
  globalDataChanged(dataType, data) {
    logger.debug(`全局数据变更: ${dataType}`);
    
    if (dataType === 'userInfo') {
      // 当用户信息更新时，更新时间戳并设置刷新标记
      this.globalData.lastUserInfoUpdate = Date.now();
      this.globalData.needRefreshUserInfo = true;
      
      // 尝试通知个人页面刷新用户信息
      this.notifyUserInfoUpdate(data);
    }
  },
  
  /**
   * 通知用户信息更新
   * @param {Object} userInfo - 更新后的用户信息
   */
  notifyUserInfoUpdate(userInfo) {
    try {
      // 获取当前所有页面
      const pages = getCurrentPages();
      if (!pages || pages.length === 0) return;
      
      // 查找个人资料页面
      const profilePage = pages.find(page => 
        page.route === 'pages/profile/profile' || 
        page.route === '/pages/profile/profile');
        
      if (profilePage) {
        logger.debug('找到个人资料页面，直接更新数据');
        
        // 如果页面正在刷新，跳过本次更新
        if (profilePage.data.isRefreshing) {
          logger.debug('个人资料页面正在刷新，跳过本次通知');
          return;
        }
        
        // 检查时间间隔，避免频繁刷新
        const now = Date.now();
        const lastRefresh = profilePage.data.lastRefreshTime || 0;
        const minInterval = 5000; // 最小刷新间隔5秒
        
        if (now - lastRefresh < minInterval) {
          logger.debug('刷新间隔过短，跳过本次通知更新');
          return;
        }
        
        // 如果页面有setData方法和fetchUserInfo方法
        if (typeof profilePage.setData === 'function') {
          // 先更新基础数据
          profilePage.setData({
            userInfo: userInfo,
            isLoggedIn: true,
            hasUserInfo: true,
            postCount: userInfo.posts_count || 0,
            likeCount: userInfo.likes_count || 0,
            followedCount: userInfo.following_count || 0,
            followerCount: userInfo.followers_count || 0,
            tokenCount: userInfo.token_count || 0,
            lastRefreshTime: now, // 更新最后刷新时间
            updatedUserInfo: userInfo // 设置更新的用户信息
          });
        }
      } else {
        // 如果没有找到页面，设置标记，让页面下次显示时自行刷新
        logger.debug('未找到个人资料页面，设置刷新标记');
        this.globalData.needRefreshUserInfo = true;
        wx.setStorageSync('needRefreshUserInfo', true);
      }
    } catch (error) {
      logger.error('通知用户信息更新失败:', error);
    }
  },
  
  /**
   * 通知页面帖子数据更新
   */
  notifyPagesUpdate() {
    try {
      const pages = getCurrentPages();
      if (!pages || pages.length === 0) return;
      
      // 查找首页
      const indexPage = pages.find(page => 
        page.route === 'pages/index/index' || 
        page.route === '/pages/index/index');
        
      if (indexPage && typeof indexPage.onPostsDataUpdate === 'function') {
        logger.debug('找到首页，直接更新帖子数据');
        indexPage.onPostsDataUpdate(this.globalData.postUpdates || {});
      } else {
        // 设置刷新标记
        this.globalData.needRefreshIndexPosts = true;
      }
    } catch (error) {
      logger.error('通知页面更新失败:', error);
    }
  },
  
  /**
   * 获取特定帖子的最新数据
   * @param {string|number} postId - 帖子ID
   * @returns {Object|null} 帖子最新数据，如果没有则返回null
   */
  getPostLatestData(postId) {
    if (!postId || !this.globalData.postUpdates) {
      return null;
    }
    
    // 尝试转换为字符串，因为对象键值通常是字符串
    const id = String(postId);
    
    // 检查是否有此帖子的更新数据
    if (this.globalData.postUpdates[id]) {
      logger.debug(`获取帖子(${id})的最新数据`);
      return this.globalData.postUpdates[id];
    }
    
    // 如果没有找到更新数据，返回null
    return null;
  },
  
  /**
   * 启动数据同步任务
   */
  startDataSyncTask() {
    // 检查是否已经存在同步任务
    if (this._dataSyncTimer) {
      logger.debug('数据同步任务已存在，跳过');
      return;
    }
    
    logger.debug('启动数据同步任务');
    
    // 每60秒同步一次数据
    this._dataSyncTimer = setInterval(() => {
      this.syncUserData();
    }, 60 * 1000);
    
    // 立即执行一次同步
    this.syncUserData();
  },
  
  /**
   * 同步用户数据
   */
  syncUserData() {
    try {
      // 检查登录状态
      if (!userManager.isLoggedIn()) {
        logger.debug('用户未登录，不同步数据');
        return;
      }
      
      const userInfo = userManager.getCurrentUser();
      if (!userInfo || !userInfo.openid) {
        logger.debug('无法获取有效的用户信息，不同步数据');
        return;
      }
      
      // 获取最新的用户信息
      const { userAPI } = require('./utils/api/index');
      userAPI.getUserInfo(userInfo.openid)
        .then(result => {
          // 处理标准API响应格式
          const userData = result.code === 200 ? result.data : result;
          
          if (userData) {
            logger.debug('同步用户数据成功');
            
            // 检查是否有数据变化
            let hasChanges = false;
            
            // 检查重要字段是否有变化
            ['posts_count', 'likes_count', 'comments_count', 'favorites_count',
             'following_count', 'followers_count', 'token_count'].forEach(field => {
              if (userInfo[field] !== userData[field]) {
                hasChanges = true;
              }
            });
            
            if (hasChanges) {
              logger.debug('检测到用户数据有变化，更新本地存储和界面');
              
              // 更新全局状态
              this.globalData.userInfo = userData;
              
              // 保存到本地
              userManager.saveUserInfo(userData);
              
              // 通知用户信息更新
              this.notifyUserInfoUpdate(userData);
            }
          }
        })
        .catch(error => {
          logger.error('同步用户数据失败:', error);
        });
    } catch (error) {
      logger.error('同步用户数据时发生异常:', error);
    }
  }
})
