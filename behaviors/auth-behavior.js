/**
 * 用户授权行为
 * 提供用户授权相关方法
 */
const { createApiClient, storage, ui, nav, ToastType } = require('../utils/util');
const baseBehavior = require('./base-behavior');

// 创建用户API客户端
const userApi = createApiClient('/api/wxapp/user', {
  sync: {
    method: 'POST',
    path: '/sync',
    params: {
      openid: true
    }
  },
  profile: {
    method: 'GET',
    path: '/profile',
    params: {
      openid: true
    }
  }
});

// 通知API客户端
const notificationApi = createApiClient('/api/wxapp/notification', {
  count: {
    method: 'GET',
    path: '/count',
    params: {
      openid: true
    }
  },
  status: {
    method: 'GET',
    path: '/status',
    params: {
      openid: true
    }
  }
});

module.exports = Behavior({
  behaviors: [baseBehavior],
  data: {
    isLoggedIn: false,
    currentOpenid: '',
    hasUnreadNotification: false,
    syncing: false, // 是否正在同步用户信息
    lastSyncTime: 0, // 上次成功同步的时间戳
  },
  
  lifetimes: {
    attached() {
      // 页面组件加载时检查登录状态
      const openid = storage.get('openid');
      const userInfo = storage.get('userInfo');
      
      if (openid && userInfo && userInfo.id) {
        this.setData({
          isLoggedIn: true,
          currentOpenid: openid
        });
        
        // 组件加载时立即发起同步请求
        console.debug('组件加载，立即同步用户信息');
        this.syncUserInfo().catch(err => {
          console.debug('组件加载时同步用户信息失败:', err);
        });
      }
    }
  },
  
  methods: {
    /**
     * 检查用户是否已登录（仅检查本地存储）
     * @private
     * @returns {Boolean} 是否已登录
     */
    _isLoggedInLocally() {
      const openid = storage.get('openid');
      const userInfo = storage.get('userInfo');
      
      // 必须同时满足：
      // 1. openid存在
      // 2. userInfo存在且包含基本信息
      return !!openid && !!userInfo && !!userInfo.id;
    },
    
    /**
     * 检查用户是否已登录
     * @param {Boolean} useLocal 是否只使用本地存储检查（默认false，会发送sync请求）
     * @param {Boolean} forceSyncNow 是否强制立即同步（默认true）
     * @returns {Boolean} 是否已登录
     */
    isLoggedIn(useLocal = false, forceSyncNow = true) {
      // 如果指定只使用本地检查，则直接返回本地结果
      if (useLocal) {
        return this._isLoggedInLocally();
      }
      
      // 用本地检查做快速判断，如果本地都不满足登录条件，直接返回false
      if (!this._isLoggedInLocally()) {
        return false;
      }
      
      // 如果距离上次同步时间不到3秒，且不强制立即同步，则使用缓存的登录状态
      const now = Date.now();
      const lastSyncElapsed = now - this.data.lastSyncTime;
      if (lastSyncElapsed < 3000 && !forceSyncNow) {
        console.debug('距离上次同步不到3秒，使用缓存状态');
        return true;
      }
      
      // 如果强制立即同步或超过缓存时间，立即发送同步请求
      if (forceSyncNow && !this.data.syncing) {
        console.debug('立即同步用户信息');
        this.data.syncing = true;
        
        // 立即发送同步请求，但不阻塞当前线程
        this.syncUserInfo()
          .then(() => {
            console.debug('同步用户信息成功');
            this.data.lastSyncTime = Date.now();
          })
          .catch(err => {
            console.debug('同步用户信息失败:', err);
          })
          .finally(() => {
            this.data.syncing = false;
          });
      }
      
      // 先返回本地检查结果，同步请求的结果会更新存储状态
      return true;
    },
    
    /**
     * 同步用户信息到服务器（验证登录状态）
     * @returns {Promise<Object>} 用户信息
     */
    async syncUserInfo() {
      const openid = storage.get('openid');
      if (!openid) {
        return Promise.reject(new Error('未登录状态'));
      }
      
      try {
        console.debug('发送同步用户请求:', openid);
        
        // 发送同步请求
        const res = await userApi.sync({ openid });
        
        console.debug('同步用户请求响应:', res);
        
        if (res.code === 200 && res.data) {
          // 同步成功，更新本地用户信息
          storage.set('userInfo', res.data);
          
          // 更新应用全局数据
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = res.data;
          }
          
          // 记录同步时间
          this.data.lastSyncTime = Date.now();
          
          // 更新组件状态
          this.setData({ isLoggedIn: true });
          
          return res.data;
        } else {
          // 同步失败，清除登录状态
          console.debug('同步用户信息失败，响应错误:', res);
          this.clearLoginState();
          return Promise.reject(new Error(res.message || '同步用户信息失败'));
        }
      } catch (err) {
        console.debug('同步用户信息请求失败:', err);
        // 请求失败不清除登录状态，可能是网络问题
        return Promise.reject(err);
      }
    },
    
    /**
     * 确保用户已登录，如果未登录则提示登录
     * @param {Boolean} showTips 是否显示提示
     * @param {Boolean} autoNavigate 是否自动跳转到登录页
     * @returns {Promise<Boolean>} 是否已登录
     */
    async ensureLogin(showTips = true, autoNavigate = true) {
      // 先检查本地登录状态
      if (!this._isLoggedInLocally()) {
        if (showTips) {
          this.showToast('请先登录', 'error');
          
          if (autoNavigate) {
            // 跳转到登录页
            setTimeout(() => {
              nav.to('/pages/login/login');
            }, 1000);
          }
        }
        return false;
      }
      
      // 验证服务器登录状态
      try {
        await this.syncUserInfo();
        return true;
      } catch (err) {
        if (showTips) {
          this.showToast('登录状态已失效，请重新登录', 'error');
          
          if (autoNavigate) {
            // 跳转到登录页
            setTimeout(() => {
              nav.to('/pages/login/login');
            }, 1000);
          }
        }
        return false;
      }
    },
    
    /**
     * 获取当前用户信息
     * @param {Boolean} forceRefresh 是否强制刷新
     * @param {Boolean} useSyncApi 是否使用sync接口替代profile接口(默认false)
     * @returns {Promise<Object>} 用户信息
     */
    async getCurrentUserInfo(forceRefresh = false, useSyncApi = false) {
      // 获取openid
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('获取用户信息失败: 未找到openid');
        return null;
      }
      
      // 如果不强制刷新，且有缓存的用户信息，直接返回缓存
      const cachedUserInfo = storage.get('userInfo');
      if (!forceRefresh && cachedUserInfo && cachedUserInfo.id) {
        console.debug('使用缓存的用户信息');
        return cachedUserInfo;
      }
      
      try {
        let res;
        
        // 根据参数选择使用sync接口还是profile接口
        if (useSyncApi) {
          console.debug('使用sync接口获取用户信息');
          res = await userApi.sync({ openid });
        } else {
          console.debug('使用profile接口获取用户信息');
          res = await userApi.profile({ openid });
        }
        
        console.debug('获取用户信息响应:', res);
        
        if (res.code === 200 && res.data) {
          // 确保用户信息包含id字段
          if (!res.data || !res.data.id) {
            console.debug('用户信息不完整:', res.data);
            // 清除无效的用户信息
            this.clearLoginState();
            return null;
          }
          
          // 缓存用户信息到本地
          const userInfo = res.data;
          storage.set('userInfo', userInfo);
          
          // 更新应用全局数据
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = userInfo;
          }
          
          // 记录同步时间
          this.data.lastSyncTime = Date.now();
          
          // 更新组件状态
          this.setData({
            isLoggedIn: true,
            currentOpenid: openid
          });
          
          return userInfo;
        } else {
          console.debug('获取用户个人信息失败:', res.message);
          // 可能是用户不存在，清除无效的登录状态
          if (res.code === 404) {
            this.clearLoginState();
          }
          return null;
        }
      } catch (err) {
        console.debug('获取个人信息失败:', err);
        return null;
      }
    },
    
    /**
     * 微信登录完整流程
     * @returns {Promise<Object>} 登录结果
     */
    async wxLogin() {
      console.debug('wxLogin方法被调用');
      
      // 强制重置登录状态，避免卡住
      if (storage.get('isLogging')) {
        console.debug('发现isLogging=true，重置状态');
        storage.set('isLogging', false);
      }
      
      // 设置登录状态为true
      storage.set('isLogging', true);
      console.debug('设置isLogging=true，开始登录流程');
      
      try {
        console.debug('开始微信登录流程');
        // 获取微信登录code
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success: res => {
              console.debug('wx.login成功:', res);
              resolve(res);
            },
            fail: err => {
              console.debug('wx.login失败:', err);
              reject(err);
            }
          });
        });
        
        if (!loginRes.code) {
          console.debug('未获取到登录凭证code');
          throw new Error('获取登录凭证失败');
        }
        
        console.debug('获取登录凭证成功，开始获取openid');
        
        // 确保云环境已初始化
        if (!wx.cloud) {
          console.debug('云能力未启用，无法获取openid');
          throw new Error('云能力未启用');
        }
        
        // 调用云函数获取openid
        let openid;
        try {
          const openidRes = await wx.cloud.callFunction({
            name: 'getOpenID'
          });
          
          console.debug('云函数getOpenID返回结果:', openidRes);
          
          if (!openidRes || !openidRes.result) {
            console.debug('云函数未返回有效结果:', openidRes);
            throw new Error('获取openid失败');
          }
          
          // 正确解析返回结果
          const result = openidRes.result;
          if (result.code !== 0 || !result.data || !result.data.openid) {
            console.debug('云函数返回格式错误:', result);
            throw new Error('获取openid失败');
          }
          
          openid = result.data.openid;
          console.debug('获取openid成功:', openid);
        } catch (err) {
          console.debug('调用云函数失败:', err);
          throw new Error('获取openid失败');
        }
        
        console.debug('开始获取用户信息');
        
        // 先尝试使用getUserProfile，失败后降级到getUserInfo
        let userInfoRes;
        try {
          userInfoRes = await new Promise((resolve, reject) => {
            console.debug('调用wx.getUserProfile');
            wx.getUserProfile({
              desc: '用于完善会员资料',
              lang: 'zh_CN',
              success: res => {
                console.debug('wx.getUserProfile成功:', res);
                resolve(res);
              },
              fail: err => {
                console.debug('wx.getUserProfile失败:', err);
                reject(err);
              }
            });
          });
        } catch (profileErr) {
          console.debug('getUserProfile失败，尝试使用getUserInfo降级方案');
          // 使用旧API作为备用
          try {
            userInfoRes = await new Promise((resolve, reject) => {
              wx.getUserInfo({
                lang: 'zh_CN',
                success: res => {
                  console.debug('getUserInfo成功:', res);
                  resolve(res);
                },
                fail: err => {
                  console.debug('getUserInfo也失败:', err);
                  reject(err);
                }
              });
            });
          } catch (infoErr) {
            console.debug('两种方式都失败，使用默认值');
            userInfoRes = {
              userInfo: {
                nickName: '游客' + Math.floor(Math.random() * 10000),
                avatarUrl: '/icons/avatar1.png',
                gender: 0,
                country: '',
                province: '',
                city: ''
              }
            };
          }
        }
        
        if (!userInfoRes || !userInfoRes.userInfo) {
          console.debug('未获取到用户信息，使用默认用户信息');
          userInfoRes = {
            userInfo: {
              nickName: '游客' + Math.floor(Math.random() * 10000),
              avatarUrl: '/icons/avatar1.png',
              gender: 0,
              country: '',
              province: '',
              city: ''
            }
          };
        }
        
        // 准备请求参数
        const params = {
          openid: openid,
          nickname: userInfoRes.userInfo.nickName,
          avatar: userInfoRes.userInfo.avatarUrl,
          gender: userInfoRes.userInfo.gender,
          country: userInfoRes.userInfo.country || '',
          province: userInfoRes.userInfo.province || '',
          city: userInfoRes.userInfo.city || ''
        };
        
        console.debug('准备发送登录请求:', params);
        
        // 发送同步请求
        const res = await userApi.sync(params);
        
        if (res.code !== 200) {
          console.debug('服务器返回错误:', res);
          throw new Error(res.message || '登录失败');
        }
        
        // 确保返回的数据包含完整的用户信息
        if (!res.data || !res.data.id) {
          console.debug('返回的用户数据不完整:', res.data);
          throw new Error('获取用户信息不完整，请重试');
        }
        
        // 保存用户信息
        storage.set('userInfo', res.data);
        storage.set('openid', res.data.openid);
        
        // 更新全局数据
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = res.data;
          app.globalData.openid = res.data.openid;
        }
        
        // 更新组件状态
        this.setData({
          isLoggedIn: true,
          currentOpenid: openid
        });
        
        console.debug('登录成功，重置isLogging=false');
        storage.set('isLogging', false);
        return res;
      } catch (err) {
        storage.set('isLogging', false);
        console.debug('登录失败:', err);
        return {
          code: 500,
          message: err.message || '登录失败，请重试'
        };
      }
    },
    
    /**
     * 退出登录
     */
    logout() {
      this.clearLoginState();
      
      // 返回首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    },
    
    /**
     * 清除登录状态
     */
    clearLoginState() {
      storage.remove('openid');
      storage.remove('userInfo');
      
      // 更新组件状态
      this.setData({
        isLoggedIn: false,
        currentOpenid: '',
        userInfo: null
      });
      
      // 更新全局数据
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = null;
        app.globalData.openid = null;
      }
    },
    
    /**
     * 检查是否有未读通知
     * @returns {Promise<Boolean>} 是否有未读通知
     */
    async checkUnreadNotifications() {
      try {
        // 检查登录状态
        if (!this.isLoggedIn()) {
          return false;
        }
        
        const openid = storage.get('openid');
        const res = await notificationApi.count({ openid });
        
        if (res.code === 200 && res.data) {
          const hasUnread = res.data.unread_count > 0;
          this.setData({ hasUnreadNotification: hasUnread });
          return hasUnread;
        }
        
        return false;
      } catch (err) {
        console.debug('检查未读通知失败:', err);
        return false;
      }
    },
    
    /**
     * 处理通知点击
     */
    onNotificationTap() {
      wx.navigateTo({
        url: '/pages/notification/notification'
      });
    },
    
    /**
     * 处理头像点击
     */
    onAvatarTap() {
      wx.switchTab({
        url: '/pages/profile/profile'
      });
    },
    
    /**
     * 检查登录状态
     * @param {Boolean} showTips 是否显示提示
     * @param {Boolean} autoNavigate 是否自动跳转到登录页
     * @param {Boolean} useLocal 是否只使用本地存储检查
     * @returns {Boolean} 是否已登录
     */
    checkLogin(showTips = true, autoNavigate = false, useLocal = false) {
      const isLoggedIn = this.isLoggedIn(useLocal);
      
      if (!isLoggedIn && showTips) {
        this.showToast('请先登录', 'error');
        
        if (autoNavigate) {
          // 跳转到登录页
          setTimeout(() => {
            nav.to('/pages/login/login');
          }, 1000);
        }
      }
      
      return isLoggedIn;
    }
  }
}); 