// api.js
// 封装后端API调用的工具文件

const app = getApp();
const debug = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null;

// 日志工具
const logger = {
  debug: (msg) => {
    if (debug) {
      debug.debug(msg);
    } else {
      console.log(`[DEBUG] ${msg}`);
    }
  },
  info: (msg) => {
    if (debug) {
      debug.info(msg);
    } else {
      console.log(`[INFO] ${msg}`);
    }
  },
  warn: (msg) => {
    if (debug) {
      debug.warn(msg);
    } else {
      console.log(`[WARN] ${msg}`);
    }
  },
  error: (msg, err) => {
    if (debug) {
      debug.error(msg, err);
    } else {
      console.error(`[ERROR] ${msg}`, err);
    }
  }
};

// 基础配置
const API = {
  // 基础URL
  BASE_URL: getApp().globalData.config.services.app.base_url || 'https://nkuwiki.com',
  BACKUP_URL: getApp().globalData.config.services.app.backup_url || 'http://localhost:8000',
  
  // 各模块前缀
  PREFIX: {
    WXAPP: '/wxapp',
    AGENT: '/agent',
    MYSQL: '/mysql'
  },

  // HTTP状态码
  STATUS: {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
  }
};

// 是否已经降级到备用URL
let isUsingBackupUrl = false;

/**
 * 发起请求
 * @param {String} url - 接口地址
 * @param {String} method - 请求方法
 * @param {Object} data - 请求数据
 * @param {Object} header - 请求头
 * @param {Boolean} showLoading - 是否显示加载中
 * @returns {Promise} - 请求Promise
 */
function request(url, method = 'GET', data = {}, header = {}, showLoading = true) {
  // 完整URL
  const baseUrl = isUsingBackupUrl ? API.BACKUP_URL : API.BASE_URL;
  const fullUrl = baseUrl + url;
  
  // 合并请求头
  const headers = {
    'content-type': 'application/json',
    ...header
  };

  // 获取token
  const token = wx.getStorageSync('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 是否显示加载中
  if (showLoading) {
    wx.showLoading({
      title: '加载中...',
    });
  }

  // 日志
  logger.debug(`[${method}] ${fullUrl}`);
  if (method !== 'GET') {
    logger.debug(`RequestBody: ${JSON.stringify(data)}`);
  }

  // 发起请求
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header: headers,
      success: (res) => {
        logger.debug(`Response Status: ${res.statusCode}`);
        if (res.statusCode === API.STATUS.SUCCESS) {
          logger.debug(`Response Data: ${JSON.stringify(res.data)}`);
          resolve(res.data);
        } else if (res.statusCode === API.STATUS.UNAUTHORIZED) {
          // 未授权，清除登录信息并跳转到登录页
          wx.clearStorageSync();
          wx.navigateTo({
            url: '/pages/login/login'
          });
          reject(new Error('未授权，请重新登录'));
        } else if (res.statusCode === API.STATUS.SERVER_ERROR) {
          // 服务器内部错误，记录更多信息
          logger.error(`服务器内部错误(500): ${fullUrl}`, {
            url: fullUrl,
            method,
            requestData: data,
            response: res.data
          });
          const errorMsg = res.data?.detail || res.data?.message || '服务器内部错误，请稍后重试';
          reject(new Error(errorMsg));
        } else {
          // 其他错误
          const errorMsg = res.data?.detail || res.data?.message || '请求失败';
          logger.error(`请求失败(${res.statusCode}): ${errorMsg}`, res);
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        logger.error('请求异常', err);
        
        // 网络错误或服务器无响应，尝试备用URL
        if (!isUsingBackupUrl && (err.errMsg.includes('request:fail') || err.errMsg.includes('timeout'))) {
          isUsingBackupUrl = true;
          logger.info(`尝试使用备用URL: ${API.BACKUP_URL}`);
          
          // 重新发起请求，使用备用URL
          wx.request({
            url: API.BACKUP_URL + url,
            method,
            data,
            header: headers,
            success: (res) => {
              if (res.statusCode === API.STATUS.SUCCESS) {
                logger.info('备用URL请求成功');
                resolve(res.data);
              } else {
                reject(err);
              }
            },
            fail: () => {
              reject(err);
            },
            complete: () => {
              if (showLoading) {
                wx.hideLoading();
              }
            }
          });
        } else {
          reject(err);
        }
      },
      complete: () => {
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

/**
 * 处理头像URL，支持微信云存储fileID
 * @param {string} avatarUrl - 头像URL或fileID 
 * @returns {Promise<string>} - 处理后的头像URL
 */
async function processAvatarUrl(avatarUrl) {
  if (!avatarUrl) {
    return '/assets/icons/default-avatar.png';
  }
  
  // 如果是微信云存储fileID，转换为临时URL
  if (avatarUrl.startsWith('cloud://')) {
    try {
      const userManager = require('./user_manager');
      return await userManager.getTempFileURL(avatarUrl);
    } catch (error) {
      console.error('转换头像URL失败:', error);
      return avatarUrl;
    }
  }
  
  return avatarUrl;
}

// =============== 用户接口 ===============
const userAPI = {
  /**
   * 微信登录
   * @param {Object} data - 登录数据，包含微信code
   * @returns {Promise} - 请求Promise 
   */
  login: (data) => {
    return request(`${API.PREFIX.WXAPP}/login`, 'POST', data);
  },
  
  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Promise} - 请求Promise 
   */
  createUser: (userData) => {
    return request(`${API.PREFIX.WXAPP}/users`, 'POST', userData);
  },

  /**
   * 获取用户信息
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  getUserInfo: (userId) => {
    return request(`${API.PREFIX.WXAPP}/users/${userId}`);
  },

  /**
   * 获取用户列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUsers: (params = {}) => {
    return request(`${API.PREFIX.WXAPP}/users`, 'GET', params);
  },

  /**
   * 更新用户信息
   * @param {number} userId - 用户ID 
   * @param {Object} userData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updateUserInfo: (userId, userData) => {
    return request(`${API.PREFIX.WXAPP}/users/${userId}`, 'PUT', userData);
  },

  /**
   * 获取用户关注和粉丝统计数据
   * @param {string} userId 用户ID
   * @returns {Promise<object>} 关注数据，包含followedCount和followerCount
   */
  getUserFollowStats: async (userId) => {
    try {
      const res = await request({
        url: `${API.BASE_URL}/api/users/${userId}/follow-stats`,
        method: 'GET'
      });
      return res;
    } catch (error) {
      console.error('获取用户关注统计失败:', error);
      return { error: error.message || '获取用户关注统计失败' };
    }
  }
};

// =============== 帖子接口 ===============
const postAPI = {
  /**
   * 创建帖子
   * @param {Object} postData - 帖子数据
   * @returns {Promise} - 请求Promise
   */
  createPost: (postData) => {
    return request(`${API.PREFIX.WXAPP}/posts`, 'POST', postData);
  },

  /**
   * 获取帖子详情
   * @param {number} postId - 帖子ID 
   * @returns {Promise} - 请求Promise
   */
  getPostDetail: (postId) => {
    return request(`${API.PREFIX.WXAPP}/posts/${postId}`);
  },

  /**
   * 获取帖子列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getPosts: (params = {}) => {
    return request(`${API.PREFIX.WXAPP}/posts`, 'GET', params);
  },

  /**
   * 更新帖子
   * @param {number} postId - 帖子ID
   * @param {Object} postData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updatePost: (postId, postData) => {
    return request(`${API.PREFIX.WXAPP}/posts/${postId}`, 'PUT', postData);
  },

  /**
   * 删除帖子
   * @param {number} postId - 帖子ID
   * @returns {Promise} - 请求Promise
   */
  deletePost: (postId) => {
    return request(`${API.PREFIX.WXAPP}/posts/${postId}`, 'DELETE');
  },

  /**
   * 点赞帖子
   * @param {number} postId - 帖子ID
   * @param {boolean} isLike - 是否点赞，true为点赞，false为取消点赞
   * @returns {Promise} - 请求Promise
   */
  likePost: (postId, isLike) => {
    const userManager = require('./user_manager');
    const userInfo = userManager.getUserInfoForAPI();
    const userId = userInfo.id;
    
    console.debug('点赞操作，帖子ID:', postId, '用户ID:', userId, '操作:', isLike ? '点赞' : '取消');
    
    // 根据操作类型选择接口
    const url = isLike 
      ? `${API.PREFIX.WXAPP}/posts/${postId}/like`
      : `${API.PREFIX.WXAPP}/posts/${postId}/unlike`;
    
    return request(url, 'POST', { userId });
  },

  /**
   * 收藏帖子
   * @param {number} postId - 帖子ID
   * @param {boolean} isFavorite - 是否收藏，true为收藏，false为取消收藏
   * @returns {Promise} - 请求Promise
   */
  favoritePost: (postId, isFavorite) => {
    const userManager = require('./user_manager');
    const userInfo = userManager.getUserInfoForAPI();
    const userId = userInfo.id;
    
    console.debug('收藏操作，帖子ID:', postId, '用户ID:', userId, '操作:', isFavorite ? '收藏' : '取消');
    
    // 根据操作类型选择接口
    const url = isFavorite 
      ? `${API.PREFIX.WXAPP}/posts/${postId}/favorite`
      : `${API.PREFIX.WXAPP}/posts/${postId}/unfavorite`;
    
    return request(url, 'POST', { userId });
  },

  /**
   * 获取用户收藏的帖子
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  getUserFavorites: (userId) => {
    return request(`${API.PREFIX.WXAPP}/users/${userId}/favorites`);
  }
};

// =============== 评论接口 ===============
const commentAPI = {
  /**
   * 创建评论
   * @param {Object} commentData - 评论数据
   * @returns {Promise} - 请求Promise
   */
  createComment: (commentData) => {
    return request(`${API.PREFIX.WXAPP}/comments`, 'POST', commentData);
  },

  /**
   * 获取评论详情
   * @param {number} commentId - 评论ID
   * @returns {Promise} - 请求Promise
   */
  getCommentDetail: (commentId) => {
    return request(`${API.PREFIX.WXAPP}/comments/${commentId}`);
  },

  /**
   * 获取评论列表
   * @param {number|Object} postIdOrParams - 帖子ID或查询参数
   * @returns {Promise} - 请求Promise
   */
  getComments: (postIdOrParams = {}) => {
    // 判断是否直接传入了帖子ID
    if (typeof postIdOrParams === 'string' || typeof postIdOrParams === 'number') {
      return request(`${API.PREFIX.WXAPP}/posts/${postIdOrParams}/comments`, 'GET');
    }
    
    // 否则按照原有逻辑查询所有评论
    return request(`${API.PREFIX.WXAPP}/comments`, 'GET', postIdOrParams);
  },

  /**
   * 更新评论
   * @param {number} commentId - 评论ID
   * @param {Object} commentData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updateComment: (commentId, commentData) => {
    return request(`${API.PREFIX.WXAPP}/comments/${commentId}`, 'PUT', commentData);
  },

  /**
   * 删除评论
   * @param {number} commentId - 评论ID
   * @returns {Promise} - 请求Promise
   */
  deleteComment: (commentId) => {
    return request(`${API.PREFIX.WXAPP}/comments/${commentId}`, 'DELETE');
  },

  /**
   * 点赞评论
   * @param {number} commentId - 评论ID
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  likeComment: (commentId, userId) => {
    return request(`${API.PREFIX.WXAPP}/comments/${commentId}/like`, 'POST', { userId });
  },

  /**
   * 取消点赞评论
   * @param {number} commentId - 评论ID
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  unlikeComment: (commentId, userId) => {
    return request(`${API.PREFIX.WXAPP}/comments/${commentId}/unlike`, 'POST', { userId });
  }
};

// =============== 智能体接口 ===============
const agentAPI = {
  /**
   * 智能体对话
   * @param {string} query - 用户问题
   * @param {Array} history - 对话历史
   * @returns {Promise} - 请求Promise
   */
  chat: (query, history = []) => {
    return request(`${API.PREFIX.AGENT}/chat`, 'POST', { query, history });
  },

  /**
   * 知识搜索
   * @param {string} keyword - 搜索关键词
   * @param {number} limit - 返回数量限制
   * @returns {Promise} - 请求Promise
   */
  search: (keyword, limit = 10) => {
    return request(`${API.PREFIX.AGENT}/search`, 'POST', { keyword, limit });
  },

  /**
   * 获取服务状态
   * @returns {Promise} - 请求Promise
   */
  getStatus: () => {
    return request(`${API.PREFIX.AGENT}/status`);
  }
};

// =============== MySQL接口 ===============
const mysqlAPI = {
  /**
   * 自定义SQL查询
   * @param {string} query - SQL查询语句
   * @param {Array} params - 查询参数
   * @param {boolean} fetch - 是否获取结果
   * @returns {Promise} - 请求Promise
   */
  customQuery: (query, params = [], fetch = true) => {
    return request(`${API.PREFIX.MYSQL}/custom_query`, 'POST', { query, params, fetch });
  },
  
  /**
   * 查询数据
   * @param {string} tableName - 表名
   * @param {Object} conditions - 查询条件
   * @param {string} orderBy - 排序字段
   * @param {number} limit - 返回数量限制
   * @param {number} offset - 分页偏移量
   * @returns {Promise} - 请求Promise
   */
  query: (tableName, conditions = {}, orderBy = '', limit = 100, offset = 0) => {
    return request(`${API.PREFIX.MYSQL}/query`, 'POST', {
      table_name: tableName,
      conditions,
      order_by: orderBy,
      limit,
      offset
    });
  },

  /**
   * 统计记录数量
   * @param {string} tableName - 表名
   * @param {Object} conditions - 统计条件
   * @returns {Promise} - 请求Promise
   */
  count: (tableName, conditions = {}) => {
    return request(`${API.PREFIX.MYSQL}/count`, 'POST', {
      table_name: tableName,
      conditions
    });
  }
};

module.exports = {
  // 基础请求函数
  request,
  logger,
  processAvatarUrl,
  
  // 模块API
  userAPI,
  postAPI,
  commentAPI,
  agentAPI,
  mysqlAPI
}; 