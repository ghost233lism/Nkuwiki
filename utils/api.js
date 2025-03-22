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
    params: {},  // 添加查询参数选项
    dataType: 'json',
    responseType: 'text',
    timeout: 10000,     // 默认10秒超时
    retryCount: 1,      // 默认重试次数
    retryDelay: 1000,   // 重试延迟时间(ms)
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
  let url = options.url.startsWith('http') ? options.url : API.BASE_URL + options.url;
  
  // 处理查询参数
  if (options.params && Object.keys(options.params).length > 0) {
    const queryParams = [];
    console.debug('处理查询参数:', options.params);
    for (const key in options.params) {
      if (options.params[key] !== undefined && options.params[key] !== null) {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(options.params[key])}`);
      }
    }
    
    // 添加查询参数到URL
    if (queryParams.length > 0) {
      const queryString = queryParams.join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
      console.debug('附加查询参数:', queryString);
    }
  }

  // 获取token
  const token = wx.getStorageSync('token');
  if (token) {
    console.debug('使用令牌:', token.substring(0, 10) + '...');
  } else {
    console.debug('请求未使用令牌');
  }
  
  // 合并请求头
  const header = {
    'Content-Type': 'application/json',
    ...options.header
  };
  
  // 如果有token，添加到请求头
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  // 定义执行请求的函数，方便重试
  const executeRequest = (retryAttempt = 0) => {
    // 返回Promise
    return new Promise((resolve, reject) => {
      // 详细日志
      console.debug(`准备发送 [${options.method}] 请求到: ${url} (尝试${retryAttempt+1}/${options.retryCount+1})`);
      console.debug('请求头:', header);
      console.debug('请求体数据:', options.data);
      
      // 请求开始时间戳
      const requestStartTime = Date.now();
    
      // 创建请求任务
      const requestTask = wx.request({
        url,
        method: options.method,
        data: options.data,
        header,
        timeout: options.timeout, // 添加超时设置
        success: (res) => {
          // 计算请求耗时
          const requestDuration = Date.now() - requestStartTime;
          console.debug(`请求成功，状态码: ${res.statusCode}, 耗时: ${requestDuration}ms`);
          
          // 检查响应
          if (res.statusCode >= 500) {
            console.warn(`服务器错误(${res.statusCode})，请求耗时: ${requestDuration}ms`);
            
            // 需要重试的情况
            if (retryAttempt < options.retryCount) {
              console.warn(`将在${options.retryDelay}ms后重试请求 (${retryAttempt+1}/${options.retryCount})`);
              setTimeout(() => {
                executeRequest(retryAttempt + 1).then(resolve).catch(reject);
              }, options.retryDelay);
              return;
            }
          }
          
          console.debug(`响应头:`, res.header);
          console.debug(`响应数据(简略):`, 
            typeof res.data === 'object' ? 
              JSON.stringify(res.data).substring(0, 500) + '...' : 
              res.data
          );
          
          // 检查标准响应格式
          if (res.data && res.data.hasOwnProperty('code')) {
            // 标准响应格式，使用code判断
            console.debug(`响应包含标准code字段: ${res.data.code}`);
            if (res.data.code === 200 || res.data.code === 0) {
              // 成功响应
              console.debug('标准成功响应');
              resolve(res.data.data || res.data);
            } else if (res.data.code === 401 || res.data.code === 403) {
              // 未授权
              console.warn(`未授权访问 (code=${res.data.code})，清除登录信息`);
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
              console.warn(`请求返回错误 (code=${res.data.code}): ${res.data.message || '未知错误'}`);
              
              // 如果明确指出需要重试的错误类型
              const retryableErrorCodes = [408, 429, 500, 502, 503, 504];
              if (retryableErrorCodes.includes(res.data.code) && retryAttempt < options.retryCount) {
                console.warn(`服务器建议重试 (code=${res.data.code})，${options.retryDelay}ms后重试`);
                setTimeout(() => {
                  executeRequest(retryAttempt + 1).then(resolve).catch(reject);
                }, options.retryDelay);
                return;
              }
              
              // 显示错误
              wx.showToast({
                title: res.data.message || '请求失败',
                icon: 'none'
              });
              reject(new Error(res.data.message || '请求失败'));
            }
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            // 兼容非标准响应，但状态码正常
            console.debug('非标准响应格式，但状态码正常');
            
            // 检查响应类型，对特定API进行额外处理
            if (url.includes('/posts')) {
              // 处理posts相关接口
              console.debug('处理posts接口响应');
              if (res.data && !Array.isArray(res.data) && res.data.data && Array.isArray(res.data.data)) {
                // 如果返回了嵌套的data数组，直接提取
                console.debug('提取嵌套的data数组');
                resolve(res.data.data);
              } else if (Array.isArray(res.data)) {
                // 直接返回数组
                console.debug('直接返回数组');
                resolve(res.data);
              } else if (res.data && typeof res.data === 'object') {
                // 返回对象
                console.debug('返回对象');
                resolve(res.data);
              } else {
                // 其他情况，返回空数组避免错误
                console.warn('无法识别的posts响应格式', res.data);
                resolve([]);
              }
            } else {
              // 默认处理
              console.debug('使用默认处理返回数据');
              resolve(res.data);
            }
          } else {
            // 状态码异常
            console.warn(`请求状态码异常: ${res.statusCode}`);
            
            // 判断是否需要重试
            const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
            if (retryableStatusCodes.includes(res.statusCode) && retryAttempt < options.retryCount) {
              console.warn(`状态码${res.statusCode}建议重试，${options.retryDelay}ms后重试`);
              setTimeout(() => {
                executeRequest(retryAttempt + 1).then(resolve).catch(reject);
              }, options.retryDelay);
              return;
            }
            
            // 对某些特定接口返回空结果而不是错误
            if (url.includes('/posts')) {
              console.debug('posts接口状态码异常，返回空数组');
              resolve([]);
            } else if (url.includes('/follow-stats')) {
              console.debug('follow-stats接口状态码异常，返回默认值');
              resolve({ followedCount: 0, followerCount: 0 });
            } else {
              reject(new Error(`网络请求错误 (${res.statusCode})`));
            }
          }
        },
        fail: (err) => {
          console.error(`请求失败: ${url}`, err);
          console.error('错误详情:', err.errMsg);
          
          // 判断是否需要重试
          const shouldRetry = retryAttempt < options.retryCount && (
            err.errMsg.includes('timeout') || 
            err.errMsg.includes('fail') || 
            err.errMsg.includes('socket')
          );
          
          if (shouldRetry) {
            console.warn(`网络错误，${options.retryDelay}ms后重试请求 (${retryAttempt+1}/${options.retryCount})`);
            setTimeout(() => {
              executeRequest(retryAttempt + 1).then(resolve).catch(reject);
            }, options.retryDelay);
            return;
          }
          
          // 域名错误处理
          if (err.errMsg && (err.errMsg.includes('domain') || err.errMsg.includes('ssl'))) {
            // 非白名单域名错误
            console.error('域名校验错误:', err.errMsg);
            wx.showModal({
              title: '提示',
              content: '请求域名不在白名单中，请检查开发工具设置',
              confirmText: '我知道了',
              showCancel: false
            });
          }
          
          // 对某些特定接口进行容错处理
          if (url.includes('/posts')) {
            console.debug('posts接口请求失败，返回空数组');
            resolve([]);
          } else if (url.includes('/users') && url.includes('/follow-stats')) {
            console.debug('用户关注统计接口请求失败，返回默认值');
            resolve({ followedCount: 0, followerCount: 0 });
          } else if (url.includes('/like') || url.includes('/favorite')) {
            console.debug('点赞/收藏接口请求失败，返回默认成功状态');
            resolve({ success: true });
          } else if (url.includes('/token')) {
            console.debug('token接口请求失败，返回默认值0');
            resolve({ token: 0 });
          } else {
            // 其他情况正常抛出错误
            reject(err);
          }
        },
        complete: () => {
          console.debug(`请求完成: ${url}`);
        }
      });
      
      // 记录请求ID，方便跟踪
      console.debug('请求已发送，请求ID:', requestTask.requestID || '未知');
    });
  };
  
  // 执行请求
  return executeRequest(0);
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
   * 获取用户关注和粉丝统计
   * @param {string} userId 用户ID
   * @returns {Promise<object>} 关注和粉丝数据
   */
  getUserFollowStats: async (userId) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/follow-stats`,
        method: 'GET'
      });
      
      logger.debug('获取关注统计原始响应:', res);
      
      // 处理标准响应格式
      if (res && !res.error) {
        // 检查是否嵌套在data字段中
        if (res.data) {
          if (res.data.data) {
            // 可能嵌套了两层data
            return res.data.data;
          }
          // 返回标准格式中的data字段
          return res.data;
        } else if (res.followedCount !== undefined && res.followerCount !== undefined) {
          // 直接返回原始数据
          return res;
        } else if (res.code === 200 || res.code === 0) {
          // 标准响应但data字段不存在
          return { followedCount: 0, followerCount: 0 };
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
      if (!userId) {
        logger.warn('获取Token失败: 没有提供用户ID');
        return { token: 0, error: '无效的用户ID' };
      }
      
      logger.debug(`开始请求用户Token, 用户ID: ${userId}`);
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/token`,
        method: 'GET'
      });
      
      logger.debug('获取Token原始响应:', JSON.stringify(res));
      
      // 处理各种可能的响应格式
      if (res) {
        // 1. 标准响应格式: {data: {token: xxx}}
        if (res.data && typeof res.data === 'object') {
          // 1.1 嵌套data: {data: {data: {token: xxx}}}
          if (res.data.data && typeof res.data.data === 'object') {
            if (res.data.data.token !== undefined) {
              return { token: parseInt(res.data.data.token) || 0 };
            } else if (res.data.data.tokens !== undefined) {
              return { token: parseInt(res.data.data.tokens) || 0 };
            }
          } 
          // 1.2 一级data: {data: {token: xxx}}
          else if (res.data.token !== undefined) {
            return { token: parseInt(res.data.token) || 0 };
          } else if (res.data.tokens !== undefined) {
            return { token: parseInt(res.data.tokens) || 0 };
          }
        } 
        // 2. 直接响应格式: {token: xxx}
        else if (res.token !== undefined) {
          return { token: parseInt(res.token) || 0 };
        } else if (res.tokens !== undefined) {
          return { token: parseInt(res.tokens) || 0 };
        } 
        // 3. 直接返回数字
        else if (typeof res === 'number') {
          return { token: res };
        } 
        // 4. 数字字符串
        else if (typeof res === 'string' && !isNaN(parseInt(res))) {
          return { token: parseInt(res) };
        } 
        // 5. 成功但没有数据
        else if (res.code === 200 || res.code === 0 || res.success) {
          logger.debug('API请求成功但没有返回token数据');
          return { token: 0 };
        }
      }
      
      // 记录非标准响应格式
      logger.warn('获取用户Token响应格式不符合预期:', JSON.stringify(res));
      return { token: 0, error: '返回格式不符合预期' };
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
      
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'GET',
        params: { 
          ...params,
          user_id: userId 
        },
        data: {}
      })
        .then(res => {
          logger.debug(`用户${userId}帖子API响应:`, res);
          
          // 处理各种可能的返回格式
          if (Array.isArray(res)) {
            logger.debug(`直接返回帖子数组，数量:${res.length}`);
            resolve(res);
          } else if (res && res.data && Array.isArray(res.data)) {
            logger.debug(`从res.data提取帖子数组，数量:${res.data.length}`);
            resolve(res.data);
          } else if (res && res.code === 200 && res.data) {
            // 标准响应格式中的data字段可能是数组
            if (Array.isArray(res.data)) {
              logger.debug(`从标准响应中提取帖子数组，数量:${res.data.length}`);
              resolve(res.data);
            } else if (res.data.posts && Array.isArray(res.data.posts)) {
              // 可能有嵌套的posts字段
              logger.debug(`从res.data.posts提取帖子数组，数量:${res.data.posts.length}`);
              resolve(res.data.posts);
            } else {
              logger.debug('标准响应中没有找到帖子数组', res);
              resolve([]);
            }
          } else {
            logger.debug('返回数据格式不符合预期:', res);
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
        params: params, // 改为使用params参数，以查询参数形式传递
        data: {}  // data置为空对象
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
    
    // 使用同一个接口，后端会根据用户ID是否在点赞列表中自动判断是点赞还是取消点赞
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}/like`,
      method: 'POST',
      data: {},  // 不在请求体中传递user_id
      params: { user_id: userId }  // 作为URL查询参数传递
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
    
    // 检查是否有favorite接口
    const url = `${API.PREFIX.WXAPP}/posts/${postId}/favorite`;
    
    return request({
      url,
      method: 'POST',
      data: { is_favorite: isFavorite },  // 通过请求体参数指明是收藏还是取消收藏
      params: { user_id: userId }  // 作为URL查询参数传递
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
        params: { 
          ...params,
          user_id: userId 
        },
        data: {}
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
      params: postIdOrParams,  // 使用params而不是data
      data: {}
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