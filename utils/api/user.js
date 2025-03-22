// user.js
// 用户相关API

const { API, logger, request } = require('./core');

const userAPI = {
  /**
   * 微信登录 - 由云函数处理，此函数仅作为API接口的占位
   * @param {Object} data - 登录数据，包含微信code
   * @returns {Promise} - 请求Promise 
   */
  login: (data) => {
    // 云函数登录逻辑在pages/login/login.js中实现
    logger.debug('使用云函数登录，此处不直接处理登录请求');
    
    // 返回一个rejected promise，表示需要使用云函数登录
    return Promise.reject(new Error('请使用云函数登录'));
  },

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Promise} - 请求Promise 
   */
  createUser: (userData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/users`,
      method: 'POST',
      data: userData
    });
  },

  /**
   * 获取用户信息
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  getUserInfo: (userId) => {
    if (!userId) {
      logger.error('获取用户信息失败: 用户ID为空');
      return Promise.reject(new Error('用户ID为空'));
    }
    
    logger.debug(`尝试获取用户信息，用户ID=${userId}`);
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userId}`,
      method: 'GET',
      // 增加错误处理
      showError: false,
      // 增加重试次数
      retryCount: 3,
      // 失败时回退方案
      fail: (err) => {
        logger.error(`获取用户信息失败: ${err.message || err}`);
        
        // 提供可用的用户数据
        const userInfo = wx.getStorageSync('userInfo') || {};
        if (userInfo && (userInfo.id || userInfo._id)) {
          logger.debug('使用本地存储的用户信息作为回退');
          return userInfo;
        }
        
        // 创建一个最小可用的用户数据
        return {
          id: userId,
          _id: userId,
          nickname: '未知用户',
          avatar_url: '/assets/icons/default_avatar.png'
        };
      }
    }).catch(error => {
      logger.error('获取用户信息出错:', error);
      
      // 提供可用的用户数据
      const userInfo = wx.getStorageSync('userInfo') || {};
      if (userInfo && (userInfo.id || userInfo._id)) {
        logger.debug('使用本地存储的用户信息作为回退');
        return userInfo;
      }
      
      // 创建一个最小可用的用户数据
      return {
        id: userId,
        _id: userId,
        nickname: '未知用户',
        avatar_url: '/assets/icons/default_avatar.png'
      };
    });
  },

  /**
   * 获取用户列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUsers: (params = {}) => {
    return request({
      url: `${API.PREFIX.WXAPP}/users`,
      method: 'GET',
      data: params
    });
  },

  /**
   * 更新用户信息
   * @param {number} userId - 用户ID 
   * @param {Object} userData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updateUserInfo: (userId, userData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userId}`,
      method: 'PUT',
      data: userData
    });
  },

  /**
   * 获取用户关注和粉丝统计
   * @param {string} userId 用户ID
   * @returns {Promise<object>} 关注和粉丝数据
   */
  getUserFollowStats: async (userId) => {
    try {
      if (!userId) {
        logger.warn('获取关注统计失败: 没有提供用户ID');
        return { followedCount: 0, followerCount: 0, error: '无效的用户ID' };
      }
      
      const result = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/follow-stats`,
        method: 'GET',
        showError: false
      });
      
      logger.debug('获取关注统计响应:', result);
      
      // 标准响应中应该直接包含followedCount和followerCount字段
      if (result && typeof result === 'object') {
        // 提取关注和粉丝数量
        const followedCount = result.followedCount !== undefined ? result.followedCount : 0;
        const followerCount = result.followerCount !== undefined ? result.followerCount : 0;
        
        return { followedCount, followerCount };
      }
      
      // 返回默认值
      logger.warn('无法从响应中获取关注统计数据:', result);
      return { followedCount: 0, followerCount: 0 };
    } catch (error) {
      logger.error('获取用户关注统计失败:', error);
      // 返回默认值，避免前端出错
      return { 
        followedCount: 0, 
        followerCount: 0,
        error: error.message || '获取用户关注统计失败'
      };
    }
  },

  /**
   * 获取用户Token数量
   * @param {string} userId 用户ID
   * @returns {Promise<object>} Token数据，包含token字段
   */
  getUserToken: async (userId) => {
    try {
      if (!userId) {
        logger.warn('获取Token失败: 没有提供用户ID');
        return { token: 0, error: '无效的用户ID' };
      }
      
      logger.debug(`开始请求用户Token, 用户ID: ${userId}`);
      const result = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/token`,
        method: 'GET',
        showError: false
      });
      
      logger.debug('获取Token响应:', JSON.stringify(result));
      
      // 标准响应中，token字段应该直接可用
      if (result && typeof result === 'object') {
        if (result.token !== undefined) {
          return { token: parseInt(result.token) || 0 };
        }
      } 
      // 如果是数字，直接返回
      else if (typeof result === 'number') {
        return { token: result };
      }
      
      // 返回默认值
      logger.warn('无法从响应中获取token字段:', result);
      return { token: 0 };
    } catch (error) {
      logger.error('获取用户Token失败:', error);
      return { token: 0, error: error.message || '获取用户Token失败' };
    }
  },

  // 获取用户喜欢的帖子
  getUserLikedPosts(userId, page = 1, pageSize = 10) {
    return request({
      url: `/users/${userId}/liked-posts`,
      method: 'GET',
      data: { page, pageSize }
    });
  },

  // 获取用户收藏的帖子
  getUserFavorites(userId, page = 1, pageSize = 10) {
    return request({
      url: `/users/${userId}/favorites`,
      method: 'GET',
      data: { page, pageSize }
    });
  },

  /**
   * 获取用户发布的帖子
   * @param {string|number} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise<Array>} - 帖子列表
   */
  getUserPosts: (userId, params = {}) => {
    return new Promise((resolve, reject) => {
      logger.debug(`获取用户${userId}发布的帖子，参数:`, params);
      
      if (!userId) {
        logger.warn('获取用户帖子失败: 用户ID为空');
        resolve([]);
        return;
      }
      
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'GET',
        params: { 
          ...params,
          user_id: userId 
        },
        showError: false
      })
        .then(result => {
          logger.debug(`用户${userId}帖子API响应:`, result);
          
          // 标准响应应该直接返回帖子数组
          if (Array.isArray(result)) {
            resolve(result);
          } else if (result && result.posts && Array.isArray(result.posts)) {
            // 如果有嵌套的posts字段
            resolve(result.posts);
          } else {
            // 返回空数组避免前端错误
            logger.warn('无法从响应中获取帖子列表:', result);
            resolve([]);
          }
        })
        .catch(err => {
          logger.error(`获取用户${userId}帖子失败:`, err);
          // 返回空数组而不是错误，避免前端崩溃
          resolve([]);
        });
    });
  }
};

module.exports = userAPI; 