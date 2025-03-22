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

// 获取开发环境
const env = __wxConfig.envVersion;
const isDev = env === 'develop' || env === 'trial';

// 基础配置
const API = {
  // 基础URL - 根据环境选择不同URL
  // 微信小程序必须为HTTPS并且已在微信后台配置的域名
  BASE_URL: getApp().globalData.config?.services?.app?.base_url || 'https://nkuwiki.com',
  
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

// 服务器已知的域名列表
const KNOWN_DOMAINS = [
  'nkuwiki.com',
  '6e6b-nkuwiki-8gcr16ev16f75c.tcb.qcloud.la'
];

// 备用域名索引，用于故障转移
let currentDomainIndex = 0;

/**
 * 尝试使用下一个可用的域名
 * @returns {String} 下一个可用的域名地址
 */
function switchToNextDomain() {
  // 切换到下一个域名
  currentDomainIndex = (currentDomainIndex + 1) % KNOWN_DOMAINS.length;
  
  // 构建完整的URL
  const protocol = 'https://';
  const domain = KNOWN_DOMAINS[currentDomainIndex];
  
  // 记录域名切换
  logger.warn(`切换到备用域名: ${protocol}${domain}`);
  
  return `${protocol}${domain}`;
}

// 处理请求
function request(option = {}) {
  // 默认配置
  const defaultOptions = {
    url: '',
    method: 'GET',
    header: {},
    data: {},
    dataType: 'json',
    responseType: 'text',
    success: () => {},
    fail: () => {},
    complete: () => {}
  };

  // 合并配置
  const options = {
    ...defaultOptions,
    ...option
  };

  // 构建完整URL
  const url = options.url.startsWith('http') ? options.url : API.BASE_URL + options.url;

  // 日志
  logger.debug(`[${options.method}] ${url}`, options.data);

  // 获取token
  const token = wx.getStorageSync('token');
  
  // 合并请求头
  const header = {
    'Content-Type': 'application/json',
    ...options.header
  };
  
  // 如果有token，添加到请求头
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  // 返回Promise
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method,
      data: options.data,
      header,
      success: (res) => {
        logger.debug(`[${options.method}] ${url} 响应:`, res);
        
        // 检查标准响应格式
        if (res.data && res.data.hasOwnProperty('code')) {
          // 标准响应格式，使用code判断
          if (res.data.code === 200 || res.data.code === 0) {
            // 成功响应
            resolve(res.data.data || res.data);
          } else if (res.data.code === 401 || res.data.code === 403) {
            // 未授权
            logger.warn('未授权访问，清除登录信息');
            wx.removeStorageSync('token');
            wx.removeStorageSync('user_info');
            
            // 提示用户
            wx.showToast({
              title: res.data.message || '登录已过期，请重新登录',
              icon: 'none',
              duration: 2000
            });
            
            // 2秒后跳转到登录页
            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/login/login'
              });
            }, 2000);
            
            // 返回错误
            reject(new Error(res.data.message || '未授权'));
          } else {
            // 其他错误
            logger.warn('请求失败:', res.data);
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            });
            reject(new Error(res.data.message || '请求失败'));
          }
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          // 兼容非标准响应，但状态码正常
          
          // 检查响应类型，对特定API进行额外处理
          if (url.includes('/posts')) {
            // 处理posts相关接口
            logger.debug('处理posts接口响应');
            if (res.data && !Array.isArray(res.data) && res.data.data && Array.isArray(res.data.data)) {
              // 如果返回了嵌套的data数组，直接提取
              resolve(res.data.data);
            } else if (Array.isArray(res.data)) {
              // 直接返回数组
              resolve(res.data);
            } else if (res.data && typeof res.data === 'object') {
              // 返回对象
              resolve(res.data);
            } else {
              // 其他情况，返回空数组避免错误
              logger.warn('无法识别的posts响应格式', res.data);
              resolve([]);
            }
          } else {
            // 默认处理
            resolve(res.data);
          }
        } else {
          // 状态码异常
          logger.warn(`请求失败: 状态码 ${res.statusCode}`);
          
          // 对某些特定接口返回空结果而不是错误
          if (url.includes('/posts')) {
            logger.debug('posts接口状态码异常，返回空数组');
            resolve([]);
          } else if (url.includes('/follow-stats')) {
            logger.debug('follow-stats接口状态码异常，返回默认值');
            resolve({ followedCount: 0, followerCount: 0 });
          } else {
            reject(new Error(`网络请求错误 (${res.statusCode})`));
          }
        }
      },
      fail: (err) => {
        logger.error(`[${options.method}] ${url} 失败:`, err);
        
        // 域名错误处理
        if (err.errMsg && (err.errMsg.includes('domain') || err.errMsg.includes('ssl'))) {
          // 非白名单域名错误
          wx.showModal({
            title: '提示',
            content: '请求域名不在白名单中，请检查开发工具设置',
            confirmText: '我知道了',
            showCancel: false
          });
        }
        
        // 对某些特定接口进行容错处理
        if (url.includes('/posts')) {
          logger.debug('posts接口请求失败，返回空数组');
          resolve([]);
        } else if (url.includes('/users') && url.includes('/follow-stats')) {
          logger.debug('用户关注统计接口请求失败，返回默认值');
          resolve({ followedCount: 0, followerCount: 0 });
        } else if (url.includes('/like') || url.includes('/favorite')) {
          logger.debug('点赞/收藏接口请求失败，返回默认成功状态');
          resolve({ success: true });
        } else {
          // 其他情况正常抛出错误
          reject(err);
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
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userId}`
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
   * 获取用户关注和粉丝统计数据
   * @param {string} userId 用户ID
   * @returns {Promise<object>} 关注数据，包含followedCount和followerCount
   */
  getUserFollowStats: async (userId) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/follow-stats`,
        method: 'GET'
      });
      
      // 处理标准响应格式
      if (res && !res.error) {
        if (res.data) {
          // 返回标准格式中的data字段
          return res.data;
        } else if (res.followedCount !== undefined && res.followerCount !== undefined) {
          // 直接返回原始数据
          return res;
        }
      }
      
      logger.debug('关注统计数据格式不符合预期:', res);
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
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/token`,
        method: 'GET'
      });
      
      if (res && !res.error) {
        if (res.data && res.data.token !== undefined) {
          return { token: res.data.token };
        } else if (res.token !== undefined) {
          return { token: res.token };
        }
      }
      
      logger.debug('获取用户Token失败或格式不符合预期:', res);
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
   * @param {number|string} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserPosts: (userId, params = {}) => {
    return new Promise((resolve, reject) => {
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'GET',
        data: { 
          ...params,
          user_id: userId 
        }
      })
        .then(res => {
          // 检查返回的数据是否为数组，如果不是则转换为空数组
          if (Array.isArray(res)) {
            resolve(res);
          } else if (res && Array.isArray(res.data)) {
            resolve(res.data);
          } else {
            logger.debug('获取用户帖子返回的不是数组:', res);
            resolve([]);
          }
        })
        .catch(err => {
          logger.error('获取用户帖子失败:', err);
          // 返回空数组而不是错误，避免前端崩溃
          resolve([]);
        });
    });
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
    return request({
      url: `${API.PREFIX.WXAPP}/posts`,
      method: 'POST',
      data: postData
    });
  },

  /**
   * 获取帖子详情
   * @param {number} postId - 帖子ID 
   * @returns {Promise} - 请求Promise
   */
  getPostDetail: (postId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`
    });
  },

  /**
   * 获取帖子列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getPosts: (params = {}) => {
    return new Promise((resolve, reject) => {
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'GET',
        data: params
      })
        .then(res => {
          // 正常返回数据
          resolve(res);
        })
        .catch(err => {
          console.error('获取帖子列表失败:', err);
          
          // 返回空数据，避免前端崩溃
          resolve({ 
            data: [], 
            success: true, 
            error: err.message 
          });
        });
    });
  },

  /**
   * 更新帖子
   * @param {number} postId - 帖子ID
   * @param {Object} postData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updatePost: (postId, postData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`,
      method: 'PUT',
      data: postData
    });
  },

  /**
   * 删除帖子
   * @param {number} postId - 帖子ID
   * @returns {Promise} - 请求Promise
   */
  deletePost: (postId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`,
      method: 'DELETE'
    });
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
    
    return request({
      url,
      method: 'POST',
      data: { userId }
    });
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
    
    return request({
      url,
      method: 'POST',
      data: { userId }
    });
  },

  /**
   * 获取用户发布的帖子
   * @param {number|string} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserPosts: (userId, params = {}) => {
    return new Promise((resolve, reject) => {
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'GET',
        data: { 
          ...params,
          user_id: userId 
        }
      })
        .then(res => {
          // 检查返回的数据是否为数组，如果不是则转换为空数组
          if (Array.isArray(res)) {
            resolve(res);
          } else if (res && Array.isArray(res.data)) {
            resolve(res.data);
          } else {
            logger.debug('获取用户帖子返回的不是数组:', res);
            resolve([]);
          }
        })
        .catch(err => {
          logger.error('获取用户帖子失败:', err);
          // 返回空数组而不是错误，避免前端崩溃
          resolve([]);
        });
    });
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
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'POST',
      data: commentData
    });
  },

  /**
   * 获取评论详情
   * @param {number} commentId - 评论ID
   * @returns {Promise} - 请求Promise
   */
  getCommentDetail: (commentId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`
    });
  },

  /**
   * 获取评论列表
   * @param {number|Object} postIdOrParams - 帖子ID或查询参数
   * @returns {Promise} - 请求Promise
   */
  getComments: (postIdOrParams = {}) => {
    // 判断是否直接传入了帖子ID
    if (typeof postIdOrParams === 'string' || typeof postIdOrParams === 'number') {
      return request({
        url: `${API.PREFIX.WXAPP}/posts/${postIdOrParams}/comments`,
        method: 'GET'
      });
    }
    
    // 否则按照原有逻辑查询所有评论
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'GET',
      data: postIdOrParams
    });
  },

  /**
   * 更新评论
   * @param {number} commentId - 评论ID
   * @param {Object} commentData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updateComment: (commentId, commentData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`,
      method: 'PUT',
      data: commentData
    });
  },

  /**
   * 删除评论
   * @param {number} commentId - 评论ID
   * @returns {Promise} - 请求Promise
   */
  deleteComment: (commentId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`,
      method: 'DELETE'
    });
  },

  /**
   * 点赞评论
   * @param {number} commentId - 评论ID
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  likeComment: (commentId, userId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}/like`,
      method: 'POST',
      data: { userId }
    });
  },

  /**
   * 取消点赞评论
   * @param {number} commentId - 评论ID
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  unlikeComment: (commentId, userId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}/unlike`,
      method: 'POST',
      data: { userId }
    });
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
    return request({
      url: `${API.PREFIX.AGENT}/chat`,
      method: 'POST',
      data: { query, history }
    });
  },

  /**
   * 知识搜索
   * @param {string} keyword - 搜索关键词
   * @param {number} limit - 返回数量限制
   * @returns {Promise} - 请求Promise
   */
  search: (keyword, limit = 10) => {
    return request({
      url: `${API.PREFIX.AGENT}/search`,
      method: 'POST',
      data: { keyword, limit }
    });
  },

  /**
   * 获取服务状态
   * @returns {Promise} - 请求Promise
   */
  getStatus: () => {
    return request({
      url: `${API.PREFIX.AGENT}/status`,
      method: 'GET'
    });
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
    return request({
      url: `${API.PREFIX.MYSQL}/custom_query`,
      method: 'POST',
      data: { query, params, fetch }
    });
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
    return request({
      url: `${API.PREFIX.MYSQL}/query`,
      method: 'POST',
      data: {
        table_name: tableName,
        conditions,
        order_by: orderBy,
        limit,
        offset
      }
    });
  },

  /**
   * 统计记录数量
   * @param {string} tableName - 表名
   * @param {Object} conditions - 统计条件
   * @returns {Promise} - 请求Promise
   */
  count: (tableName, conditions = {}) => {
    return request({
      url: `${API.PREFIX.MYSQL}/count`,
      method: 'POST',
      data: {
        table_name: tableName,
        conditions
      }
    });
  }
};

// =============== 新增模块 ===============

// 消息通知接口
const notificationAPI = {
  /**
   * 获取用户的通知列表
   * @param {string} userId 用户ID
   * @param {Object} params 查询参数，可包含type、is_read等条件
   * @returns {Promise<Object>} 通知列表数据
   */
  getUserNotifications: async (userId, params = {}) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/notifications`,
        method: 'GET',
        data: params
      });
      
      if (res && res.notifications) {
        return res;
      } else if (res && res.data && res.data.notifications) {
        return res.data;
      }
      
      logger.debug('获取通知列表返回格式不符合预期:', res);
      return { notifications: [], unread_count: 0, total: 0 };
    } catch (error) {
      logger.error('获取用户通知列表失败:', error);
      return { notifications: [], unread_count: 0, total: 0, error: error.message };
    }
  },
  
  /**
   * 获取通知详情
   * @param {number} notificationId 通知ID
   * @returns {Promise<Object>} 通知详情
   */
  getNotificationDetail: async (notificationId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'GET'
    });
  },
  
  /**
   * 标记通知为已读
   * @param {number} notificationId 通知ID
   * @returns {Promise<Object>} 更新结果
   */
  markAsRead: async (notificationId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'PUT',
      data: { is_read: true }
    });
  },
  
  /**
   * 标记所有通知为已读
   * @param {string} userId 用户ID
   * @param {string} type 可选，通知类型
   * @returns {Promise<Object>} 操作结果
   */
  markAllAsRead: async (userId, type = null) => {
    const data = type ? { type } : {};
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userId}/notifications/read-all`,
      method: 'PUT',
      data
    });
  },
  
  /**
   * 删除通知
   * @param {number} notificationId 通知ID
   * @returns {Promise<Object>} 操作结果
   */
  deleteNotification: async (notificationId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'DELETE'
    });
  }
};

// 意见反馈接口
const feedbackAPI = {
  /**
   * 提交意见反馈
   * @param {Object} feedbackData 反馈数据
   * @returns {Promise<Object>} 提交结果
   */
  submitFeedback: async (feedbackData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/feedback`,
      method: 'POST',
      data: feedbackData
    });
  },
  
  /**
   * 获取用户的反馈列表
   * @param {string} userId 用户ID
   * @param {Object} params 查询参数
   * @returns {Promise<Object>} 反馈列表
   */
  getUserFeedback: async (userId, params = {}) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/feedback`,
        method: 'GET',
        data: params
      });
      
      if (res && res.feedbacks) {
        return res;
      } else if (res && res.data && res.data.feedbacks) {
        return res.data;
      }
      
      logger.debug('获取反馈列表返回格式不符合预期:', res);
      return { feedbacks: [], total: 0 };
    } catch (error) {
      logger.error('获取用户反馈列表失败:', error);
      return { feedbacks: [], total: 0, error: error.message };
    }
  },
  
  /**
   * 获取反馈详情
   * @param {number} feedbackId 反馈ID
   * @returns {Promise<Object>} 反馈详情
   */
  getFeedbackDetail: async (feedbackId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/feedback/${feedbackId}`,
      method: 'GET'
    });
  }
};

// 关于我们接口
const aboutAPI = {
  /**
   * 获取平台信息
   * @returns {Promise<Object>} 平台信息
   */
  getPlatformInfo: async () => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/about`,
        method: 'GET'
      });
      
      if (res && res.data) {
        return res.data;
      }
      
      return res || {};
    } catch (error) {
      logger.error('获取平台信息失败:', error);
      return { error: error.message };
    }
  },
  
  /**
   * 获取版本更新历史
   * @param {number} limit 限制返回数量
   * @returns {Promise<Object>} 版本更新历史
   */
  getVersionHistory: async (limit = 10) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/versions`,
        method: 'GET',
        data: { limit }
      });
      
      if (res && res.data) {
        return res.data;
      }
      
      return res || { versions: [] };
    } catch (error) {
      logger.error('获取版本历史失败:', error);
      return { versions: [], error: error.message };
    }
  },
  
  /**
   * 获取用户协议或隐私政策
   * @param {string} type 协议类型：user-用户协议, privacy-隐私政策
   * @returns {Promise<Object>} 协议内容
   */
  getAgreement: async (type) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/agreement/${type}`,
        method: 'GET'
      });
      
      if (res && res.data) {
        return res.data;
      }
      
      return res || { content: '' };
    } catch (error) {
      logger.error(`获取${type}协议失败:`, error);
      return { content: '', error: error.message };
    }
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
  mysqlAPI,
  
  // 新增模块API
  notificationAPI,
  feedbackAPI,
  aboutAPI
}; 