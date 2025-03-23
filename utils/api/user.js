// user.js
// 用户相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

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
   * 同步微信用户信息
   * @param {Object} userData - 用户数据
   * @returns {Promise} - 请求Promise 
   */
  syncUser: (userData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/users/sync`,
      method: 'POST',
      data: userData
    });
  },

  /**
   * 获取用户信息
   * @param {string} openid - 用户openid
   * @returns {Promise} - 请求Promise
   */
  getUserInfo: (openid) => {
    if (!openid) {
      logger.error('获取用户信息失败: openid为空');
      return Promise.reject(new Error('openid为空'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}`,
      method: 'GET',
      showError: false,
      retryCount: 3,
      statusCodeCallback: {
        404: () => {
          logger.warn(`用户openid ${openid} 不存在，尝试获取当前用户信息`);
          return request({
            url: `${API.PREFIX.WXAPP}/users/me`,
            method: 'GET',
            params: { openid },
            showError: false
          }).catch(err => {
            logger.error('获取当前用户信息也失败:', err);
            return getLocalFallbackUserInfo(openid);
          });
        }
      },
      fail: () => getLocalFallbackUserInfo(openid)
    });
  },

  /**
   * 获取当前用户信息
   * @param {string} openid - 用户openid
   * @returns {Promise} - 请求Promise
   */
  getCurrentUser: (openid) => {
    if (!openid) {
      logger.error('获取当前用户信息失败: openid为空');
      return Promise.reject(new Error('openid为空'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/me`,
      method: 'GET',
      params: { openid }
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
      params: params
    });
  },

  /**
   * 更新用户信息
   * @param {string} openid - 用户openid 
   * @param {Object} userData - 更新数据
   * @param {boolean} showError - 是否显示错误提示
   * @returns {Promise} - 请求Promise
   */
  updateUser: (openid, userData, showError = false) => {
    if (!openid) {
      logger.error('更新用户信息失败: openid为空');
      return Promise.reject(new Error('openid为空'));
    }
    
    if (!userData || typeof userData !== 'object') {
      logger.error('更新用户信息失败: userData不是有效对象', userData);
      return Promise.reject(new Error('更新数据无效'));
    }
    
    logger.info(`更新用户信息, openid=${openid}, 数据:`, JSON.stringify(userData));
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}`,
      method: 'PUT',
      data: userData,
      showError: showError,
      retryCount: 2,
      success: (res) => {
        logger.info('用户信息更新成功:', JSON.stringify(res));
        return res;
      },
      fail: (error) => {
        logger.error('用户信息更新失败:', error);
        throw error;
      }
    });
  },

  /**
   * 删除用户
   * @param {string} openid - 用户openid 
   * @returns {Promise} - 请求Promise
   */
  deleteUser: (openid) => {
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}`,
      method: 'DELETE'
    });
  },

  /**
   * 获取用户关注和粉丝统计
   * @param {string} openid - 用户openid
   * @returns {Promise<object>} 关注和粉丝数据
   */
  getUserFollowStats: (openid) => {
    if (!openid) {
      logger.warn('获取关注统计失败: 没有提供openid');
      return Promise.resolve({ followedCount: 0, followerCount: 0 });
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/follow-stats`,
      method: 'GET',
      showError: false
    }).catch(error => {
      logger.error('获取用户关注统计失败:', error);
      return { followedCount: 0, followerCount: 0 };
    });
  },

  /**
   * 获取用户Token数量
   * @param {string} openid - 用户openid
   * @returns {Promise<object>} Token数据
   */
  getUserToken: (openid) => {
    if (!openid) {
      logger.warn('获取Token失败: 没有提供openid');
      return Promise.resolve({ token: 0 });
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/token`,
      method: 'GET',
      showError: false
    }).catch(error => {
      logger.error('获取用户Token失败:', error);
      return { token: 0 };
    });
  },

  /**
   * 获取用户喜欢的帖子
   * @param {string} openid - 用户openid
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserLikedPosts: (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/liked-posts`,
      method: 'GET',
      params: params
    });
  },

  /**
   * 获取用户收藏的帖子
   * @param {string} openid - 用户openid
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserFavorites: (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/favorites`,
      method: 'GET',
      params: params
    });
  },

  /**
   * 获取用户发布的帖子
   * @param {string} openid - 用户openid
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserPosts: (openid, params = {}) => {
    if (!openid) {
      logger.warn('获取用户帖子失败: openid为空');
      return Promise.resolve([]);
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts`,
      method: 'GET',
      params: { ...params, openid },
      showError: false
    }).catch(error => {
      logger.error('获取用户帖子失败:', error);
      return [];
    });
  }
};

/**
 * 获取本地备用用户信息，在API请求失败时使用
 * @param {string} openid - 用户openid
 * @returns {Object} - 本地备用用户信息
 */
function getLocalFallbackUserInfo(openid) {
  try {
    // 尝试从本地存储获取
    const localUserInfo = wx.getStorageSync('userInfo') || {};
    
    // 如果本地存储有匹配ID的用户信息，直接返回
    if (localUserInfo && (localUserInfo.id == openid || localUserInfo.openid == openid)) {
      logger.debug('使用本地存储的用户信息作为备用');
      return localUserInfo;
    }
    
    // 构建基础用户信息
    return {
      id: openid,
      openid: openid,
      nick_name: '未知用户',
      avatar: '/assets/icons/default-avatar.png',
      status: 1,
      is_local: true
    };
  } catch (error) {
    logger.error('获取本地备用用户信息失败:', error);
    return {
      id: openid,
      openid: openid,
      nick_name: '未知用户',
      avatar: '/assets/icons/default-avatar.png',
      status: 1,
      is_local: true
    };
  }
}

module.exports = userAPI; 