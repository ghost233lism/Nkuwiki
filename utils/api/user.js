// user.js
// 用户相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');
const postAPI = require('./post');

/**
 * 当本地/远程获取用户信息失败时的fallback处理
 * @param {string} openid - 用户openid
 * @returns {Object} 本地用户信息
 */
function getLocalFallbackUserInfo(openid) {
  logger.warn(`无法从服务器获取用户信息，尝试使用本地缓存, openid=${openid}`);
  const localUser = userManager.getCurrentUser();
  
  if (localUser && localUser.openid === openid) {
    return Promise.resolve(localUser);
  }
  
  return Promise.reject(new Error('无法获取用户信息'));
}

/**
 * 用户API模块
 */
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
   * @param {string} userData.openid - 微信openid
   * @param {string} userData.nick_name - 用户昵称
   * @param {string} userData.avatar - 用户头像URL
   * @param {number} userData.gender - 性别 0-未知 1-男 2-女
   * @param {Object} userData.location - 位置信息
   * @param {string} userData.language - 语言
   * @returns {Promise} - 请求Promise 
   */
  syncUser: (userData) => {
    // 检查必要字段
    if (!userData.openid) {
      logger.error('同步用户信息失败: 缺少openid');
      return Promise.reject(new Error('缺少必要参数: openid'));
    }
    
    // 准备请求数据
    const requestData = {
      openid: userData.openid,
      nick_name: userData.nick_name || userData.nickName || '',
      avatar: userData.avatar || userData.avatarUrl || '',
      gender: userData.gender || 0
    };
    
    // 位置信息
    if (userData.location || (userData.province && userData.city)) {
      requestData.location = userData.location || {
        province: userData.province || '',
        city: userData.city || '',
        country: userData.country || ''
      };
    }
    
    // 语言
    if (userData.language) {
      requestData.language = userData.language;
    }
    
    logger.debug('同步用户信息:', JSON.stringify(requestData));
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/sync`,
      method: 'POST',
      data: requestData,
      showLoading: true,
      loadingText: '同步用户信息...'
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
          logger.debug(`用户openid ${openid} 不存在，尝试获取当前用户信息`);
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
   * @param {number} params.limit - 返回记录数量限制，默认20，最大100
   * @param {number} params.offset - 分页偏移量，默认0
   * @param {number} params.status - 用户状态：1-正常，0-禁用，可选
   * @param {string} params.order_by - 排序方式，默认"create_time DESC"
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
    logger.debug('进入updateUser方法:', { openid: openid.substring(0, 8) + '...', userData });
    
    if (!openid) {
      logger.error('更新用户信息失败: openid为空');
      return Promise.reject(new Error('openid为空'));
    }
    
    if (!userData || typeof userData !== 'object') {
      logger.error('更新用户信息失败: userData不是有效对象', userData);
      return Promise.reject(new Error('更新数据无效'));
    }
    
    // 确保数据是可序列化的对象
    const cleanUserData = {};
    try {
      // 复制简单数据类型
      Object.keys(userData).forEach(key => {
        const value = userData[key];
        // 跳过函数和复杂对象
        if (typeof value !== 'function' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
          cleanUserData[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          // 尝试将复杂对象转换为字符串
          try {
            cleanUserData[key] = JSON.stringify(value);
          } catch (e) {
            logger.warn(`无法序列化字段 ${key}，已跳过`);
          }
        }
      });
    } catch (err) {
      logger.error('清理用户数据失败:', err);
    }
    
    logger.debug(`准备发送更新用户请求, openid=${openid.substring(0, 8)}..., 清理后数据:`, cleanUserData);
    
    // 使用简化的方法直接调用请求
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}`,
      method: 'PUT',
      data: cleanUserData,
      showError: showError,
      retryCount: 2,
      showLoading: true,
      loadingText: '保存中...'
    }).then(result => {
      logger.debug('用户信息更新成功:', JSON.stringify(result));
      return result || { success: true }; // 确保始终返回成功对象
    }).catch(error => {
      logger.error('用户信息更新失败:', error);
      // 如果是因为网络或者超时导致的错误，模拟成功响应
      if (error.errMsg && (error.errMsg.includes('timeout') || error.errMsg.includes('fail'))) {
        logger.warn('因网络问题模拟成功响应');
        return { 
          success: true, 
          simulated: true,
          message: '网络不稳定，但数据可能已保存' 
        };
      }
      throw error;
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
      logger.debug('获取关注统计失败: 没有提供openid');
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
      logger.debug('获取Token失败: 没有提供openid');
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
      logger.debug('获取用户帖子失败: openid为空');
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
  },

  /**
   * 关注用户
   * @param {string} targetOpenid - 目标用户openid
   * @returns {Promise} - 请求Promise
   */
  followUser: (targetOpenid) => {
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      return Promise.reject(new Error('未登录用户无法执行此操作'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userInfo.openid}/follow`,
      method: 'POST',
      data: { 
        target_openid: targetOpenid 
      }
    });
  },

  /**
   * 取消关注用户
   * @param {string} targetOpenid - 目标用户openid
   * @returns {Promise} - 请求Promise
   */
  unfollowUser: (targetOpenid) => {
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      return Promise.reject(new Error('未登录用户无法执行此操作'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userInfo.openid}/unfollow`,
      method: 'POST',
      data: { 
        target_openid: targetOpenid 
      }
    });
  },

  /**
   * 获取用户关注列表
   * @param {string} openid - 用户openid
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserFollowing: (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/following`,
      method: 'GET',
      params: params
    });
  },

  /**
   * 获取用户粉丝列表
   * @param {string} openid - 用户openid
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserFollowers: (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/followers`,
      method: 'GET',
      params: params
    });
  },

  /**
   * 检查是否已关注用户
   * @param {string} targetOpenid - 目标用户openid
   * @returns {Promise<boolean>} - 是否已关注
   */
  checkFollowing: (targetOpenid) => {
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      return Promise.resolve(false);
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userInfo.openid}/check-following`,
      method: 'GET',
      params: { target_openid: targetOpenid },
      showError: false
    }).then(res => {
      return res && res.is_following === true;
    }).catch(() => {
      return false;
    });
  },

  /**
   * 获取用户统计信息
   * @param {string} openid - 用户openid，不传则使用当前登录用户
   * @returns {Promise} - 请求Promise，返回用户统计信息(发帖数、获赞数、关注数、粉丝数)
   */
  getUserStats: (openid) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo?.openid;
      
      if (!openid) {
        logger.debug('获取用户统计信息失败: 未登录且未提供openid');
        return Promise.resolve({
          posts_count: 0,
          likes_received: 0,
          following_count: 0,
          followers_count: 0
        });
      }
    }
    
    logger.debug(`获取用户${openid}统计信息`);
    
    // 由于/users/{openid}/stats接口不存在，使用组合API调用代替
    return Promise.all([
      // 获取用户帖子列表 - 使用getPosts函数并传入openid参数
      postAPI.getPosts({ openid: openid }),
      // 获取用户关注和粉丝统计
      userAPI.getUserFollowStats(openid)
    ])
    .then(([postsResult, followStats]) => {
      // 从帖子结果中提取实际的帖子数组
      let posts = [];
      if (Array.isArray(postsResult)) {
        // 旧版格式
        posts = postsResult;
      } else if (postsResult && postsResult.posts && Array.isArray(postsResult.posts)) {
        // 新版格式
        posts = postsResult.posts;
      } else if (postsResult && Array.isArray(postsResult.data)) {
        // 另一种可能的格式
        posts = postsResult.data;
      }
      
      // 计算帖子数量
      const postsCount = posts.length;
      
      // 计算获赞总数
      let likesReceived = 0;
      posts.forEach(post => {
        likesReceived += parseInt(post.like_count || post.likes || 0);
      });
      
      // 获取关注和粉丝数量
      const followingCount = followStats?.followedCount || 0;
      const followersCount = followStats?.followerCount || 0;
      
      // 返回统计数据
      const stats = {
        posts_count: postsCount,
        likes_received: likesReceived,
        following_count: followingCount,
        followers_count: followersCount
      };
      
      logger.debug(`用户统计数据组合结果:`, stats);
      return stats;
    })
    .catch(err => {
      logger.error('获取用户统计信息失败:', err);
      return {
        posts_count: 0,
        likes_received: 0,
        following_count: 0,
        followers_count: 0
      };
    });
  }
};

module.exports = userAPI; 