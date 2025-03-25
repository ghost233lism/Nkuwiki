// core.js
// 封装基础请求功能和日志工具

// 获取全局应用实例
let app = null; 
try {
  app = getApp();
} catch (error) {
  console.warn('getApp()调用失败，可能是在App实例化之前');
}

const debug = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null;

// 日志工具
const logger = {
  debug: (msg) => {
    if (debug) {
      debug.debug(msg);
    } else {
      console.debug(`[DEBUG] ${msg}`);
    }
  },
  info: (msg) => {
    if (debug) {
      debug.info(msg);
    } else {
      console.info(`[INFO] ${msg}`);
    }
  },
  warn: (msg) => {
    if (debug) {
      debug.warn(msg);
    } else {
      console.warn(`[WARN] ${msg}`);
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
  // API基础URL
  BASE_URL: '',
  
  // API前缀定义
  PREFIX: {
    WXAPP: '/api/wxapp',  // 微信小程序API
    AGENT: '/api/agent'    // 智能体API
  },

  // HTTP状态码
  STATUS: {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
  },

  // 发送请求的通用方法
  request: function(options) {
    const { 
      url, 
      method = 'GET', 
      data, 
      params, 
      showError = true, 
      showLoading = false, 
      loadingText = '加载中...', 
      statusCodeCallback, 
      retryCount = 0, 
      retryDelay = 1000, 
      useCloud = false, 
      hasParams = false, 
      hasData = true, 
      fail = null,
      useCache = true // 新增参数，默认使用缓存
    } = options;
    
    // 记录开始请求时间
    const startTime = Date.now();
    
    // 判断参数是否合法
    if (!url) {
      logger.error('请求URL不能为空');
      return Promise.reject(new Error('请求URL不能为空'));
    }
    
    // 合并查询参数
    let fullUrl = url;
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      if (queryString) {
        fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
      }
    }
    
    // 基本URL
    const baseUrl = API.BASE_URL || (app && app.globalData.config ? app.globalData.config.services.app.base_url : 'https://nkuwiki.com');
    
    // 完整请求URL
    const requestUrl = fullUrl.startsWith('http') ? fullUrl : `${baseUrl}${fullUrl}`;
    
    // 缓存处理 - 仅对GET请求启用
    if (method === 'GET' && useCache) {
      try {
        const cacheKey = `api_cache_${requestUrl}`;
        const cachedData = wx.getStorageSync(cacheKey);
        if (cachedData && cachedData.data && cachedData.expiry > Date.now()) {
          logger.debug(`使用缓存数据: ${method} ${url}, 缓存时间: ${new Date(cachedData.timestamp).toISOString()}`);
          return Promise.resolve(cachedData.data);
        }
      } catch (e) {
        logger.warn('读取缓存失败:', e);
      }
    }
    
    // 获取用户信息
    let openid = '';
    try {
      const userInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo;
      openid = userInfo ? userInfo.openid || '' : '';
    } catch (e) {
      logger.warn('获取用户信息失败:', e);
    }
    
    // 请求头
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0',
      'X-Client-Platform': 'wxapp'
    };
    
    // 如果有openid，添加到请求头
    if (openid) {
      headers['X-User-OpenID'] = openid;
    }
    
    // 如果明确指定不使用缓存，添加相应请求头
    if (!useCache) {
      headers['Cache-Control'] = 'no-cache, no-store';
      headers['Pragma'] = 'no-cache';
    }
    
    console.debug('request调用开始, 请求选项:', {
      url: requestUrl, 
      method, 
      hasParams: !!params, 
      hasData: !!data,
      useCache
    });
    
    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: loadingText,
        mask: true
      });
    }
    
    // 执行请求
    return new Promise((resolve, reject) => {
      // 添加时间戳参数以避免缓存（当useCache=false时）
      let finalUrl = requestUrl;
      if (!useCache && method === 'GET') {
        const timestamp = Date.now();
        finalUrl = `${requestUrl}${requestUrl.includes('?') ? '&' : '?'}_t=${timestamp}`;
      }
      
      wx.request({
        url: finalUrl,
        method: method,
        data: data,
        header: headers,
        success: function(res) {
          // 计算请求耗时
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          if (duration > 1000) {
            logger.warn(`请求耗时较长: ${duration}ms, ${method} ${url}`);
          }
          
          // 请求成功，根据API文档，响应格式应为:
          // {code: 200, message: "success", data: {...}, details: null, timestamp: "..."}
          if (res.statusCode >= 200 && res.statusCode < 300) {
            logger.debug(`请求成功: ${method} ${url}, 状态码: ${res.statusCode}`);
            
            // 缓存处理 - 仅对GET请求启用
            if (method === 'GET' && useCache) {
              try {
                const cacheKey = `api_cache_${requestUrl}`;
                const expiry = Date.now() + (5 * 60 * 1000); // 5分钟缓存
                wx.setStorageSync(cacheKey, {
                  data: res.data,
                  timestamp: Date.now(),
                  expiry: expiry
                });
              } catch (e) {
                logger.warn('缓存响应数据失败:', e);
              }
            }
            
            resolve(res.data);
          } 
          // 未找到资源
          else if (res.statusCode === 404) {
            logger.warn(`资源不存在: ${method} ${url}, 状态码: ${res.statusCode}`);
            
            // 检查是否有对应的错误处理函数
            if (statusCodeCallback && statusCodeCallback[404]) {
              return statusCodeCallback[404](res);
            }
            
            if (showError) {
              wx.showToast({
                title: '请求的资源不存在',
                icon: 'none'
              });
            }
            
            reject(new Error(`资源不存在: ${res.statusCode}`));
          }
          // 未授权 
          else if (res.statusCode === 401) {
            logger.warn(`未授权: ${method} ${url}, 状态码: ${res.statusCode}`);
            
            if (showError) {
              wx.showToast({
                title: '请先登录',
                icon: 'none'
              });
            }
            
            // 清除本地存储的用户信息，触发重新登录
            try {
              wx.removeStorageSync('userInfo');
            } catch (e) {
              logger.error('清除用户信息失败:', e);
            }
            
            reject(new Error('请先登录'));
          }
          // 参数错误
          else if (res.statusCode === 400 || res.statusCode === 422) {
            logger.warn(`请求参数错误: ${method} ${url}, 状态码: ${res.statusCode}`);
            
            if (showError) {
              let errorMsg = '请求参数错误';
              
              // 尝试从响应中提取错误信息
              if (res.data && res.data.message) {
                errorMsg = res.data.message;
              } else if (res.data && res.data.details && res.data.details.errors) {
                const errors = res.data.details.errors;
                if (Array.isArray(errors) && errors.length > 0) {
                  errorMsg = errors[0].msg || errorMsg;
                }
              }
              
              wx.showToast({
                title: errorMsg,
                icon: 'none'
              });
            }
            
            reject({
              statusCode: res.statusCode,
              message: res.data?.message || '请求参数错误',
              details: res.data?.details || {},
              data: res.data
            });
          }
          // 服务器错误
          else if (res.statusCode >= 500) {
            logger.error(`服务器错误: ${method} ${url}, 状态码: ${res.statusCode}`);
            
            if (showError) {
              wx.showToast({
                title: '服务器错误，请稍后再试',
                icon: 'none'
              });
            }
            
            reject(new Error(`服务器错误: ${res.statusCode}`));
          } 
          // 其他错误
          else {
            logger.warn(`请求错误: ${method} ${url}, 状态码: ${res.statusCode}`);
            
            // 检查是否有对应的错误处理函数
            if (statusCodeCallback && statusCodeCallback[res.statusCode]) {
              return statusCodeCallback[res.statusCode](res);
            }
            
            if (showError) {
              let errorMsg = '请求失败';
              if (res.data && typeof res.data === 'object' && res.data.message) {
                errorMsg = res.data.message;
              }
              
              wx.showToast({
                title: errorMsg,
                icon: 'none'
              });
            }
            
            reject({
              statusCode: res.statusCode,
              message: res.data?.message || '请求失败',
              details: res.data?.details || {},
              data: res.data
            });
          }
        },
        fail: function(err) {
          // 请求失败
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          logger.error(`请求失败: ${method} ${url}, 错误: ${err.errMsg}, 耗时: ${duration}ms`);
          
          // 检查是否需要重试
          if (retryCount > 0) {
            logger.debug(`准备重试请求: ${method} ${url}, 剩余重试次数: ${retryCount}`);
            
            setTimeout(() => {
              // 递归调用，减少重试次数
              const retryOptions = {
                ...options,
                retryCount: retryCount - 1
              };
              
              API.request(retryOptions)
                .then(resolve)
                .catch(reject);
            }, retryDelay);
            
            return;
          }
          
          // 如果有自定义失败处理函数
          if (typeof fail === 'function') {
            return fail(err);
          }
          
          // 显示错误提示
          if (showError) {
            let errorMsg = '网络连接失败';
            if (err.errMsg && err.errMsg.includes('timeout')) {
              errorMsg = '请求超时，请稍后再试';
            }
            
            wx.showToast({
              title: errorMsg,
              icon: 'none'
            });
          }
          
          reject(err);
        },
        complete: function() {
          // 隐藏加载提示
          if (showLoading) {
            wx.hideLoading();
          }
        }
      });
    });
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

/**
 * 处理请求URL，添加查询参数
 * @param {string} url - 原始URL
 * @param {Object} params - 查询参数
 * @returns {string} 处理后的URL
 */
function processUrl(url, params) {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  
  const queryParams = [];
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null) {
      // 确保不会截断用户ID等参数，使用完整的参数值
      const paramValue = encodeURIComponent(String(params[key]));
      queryParams.push(`${encodeURIComponent(key)}=${paramValue}`);
    }
  }
  
  // 添加查询参数到URL
  if (queryParams.length > 0) {
    const queryString = queryParams.join('&');
    return url + (url.includes('?') ? '&' : '?') + queryString;
  }
  
  return url;
}

/**
 * 统一处理响应
 * @param {Object} res - 微信请求响应
 * @returns {Object} 处理后的响应数据
 */
function handleResponse(res) {
  // 检查响应是否存在
  if (!res) {
    throw new Error('响应为空');
  }

  // 记录原始响应用于调试
  logger.debug(`响应状态码: ${res.statusCode}, 响应数据类型: ${typeof res.data}`);
  
  // 对于422状态码(数据验证错误)，进行特殊处理
  if (res.statusCode === 422) {
    logger.error('收到422状态码(数据验证错误), 原始响应:', JSON.stringify(res.data));
    
    let errorMsg = '数据验证失败';
    const errorData = res.data;
    
    try {
      // 尝试构建更详细的错误信息
      if (Array.isArray(errorData)) {
        // 数组格式的错误
        errorMsg = errorData.map(item => {
          if (typeof item === 'object') {
            return JSON.stringify(item);
          }
          return String(item);
        }).join('; ');
      } else if (errorData && typeof errorData === 'object') {
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // FastAPI常见的验证错误格式
            errorMsg = errorData.detail.map(err => {
              if (typeof err === 'object') {
                if (err.loc && err.msg) {
                  return `字段 ${err.loc.join('.')} 错误: ${err.msg}`;
                }
                return JSON.stringify(err);
              }
              return String(err);
            }).join('; ');
          } else {
            errorMsg = String(errorData.detail);
          }
        } else if (errorData.message) {
          errorMsg = String(errorData.message);
        } else {
          // 其他对象格式，序列化为字符串
          errorMsg = JSON.stringify(errorData);
        }
      }
      
      logger.error('解析后的422错误信息:', errorMsg);
    } catch (e) {
      logger.error('解析422错误信息时出错:', e);
      // 保留默认错误信息
    }
    
    // 创建包含详细信息的错误对象
    const error = new Error(errorMsg);
    error.statusCode = 422;
    error.data = errorData;
    error.originalResponse = res;
    throw error;
  }
  
  // 简化处理逻辑：如果HTTP状态码为2xx，一律视为成功
  if (res.statusCode >= 200 && res.statusCode < 300) {
    // 返回data部分，如果没有则返回整个响应
    let responseData = res.data;
    
    // 检查是否有标准响应格式
    if (responseData && typeof responseData === 'object') {
      // 如果有data字段，优先返回data内容
      if (responseData.data !== undefined) {
        // 如果data字段为对象，添加成功标志
        if (typeof responseData.data === 'object' && responseData.data !== null) {
          responseData.data.success = true;
          return responseData.data;
        }
        // 如果data不是对象，包装成对象
        return {
          success: true,
          data: responseData.data,
          code: responseData.code || 200
        };
      }
      
      // 没有data字段，添加成功标志
      responseData.success = true;
      return responseData;
    }
    
    // 非对象类型响应，包装成对象
    return {
      success: true,
      data: responseData,
      code: 200
    };
  }
  
  // 其他错误响应
  const error = new Error(res.data?.message || `请求失败，状态码: ${res.statusCode}`);
  error.statusCode = res.statusCode;
  error.data = res.data;
  error.originalResponse = res;
  throw error;
}

/**
 * 处理头像URL，确保小程序环境可以正确显示
 * @param {string} avatarUrl - 原始头像URL
 * @returns {string} 处理后的头像URL
 */
function processAvatarUrl(avatarUrl) {
  // 默认头像路径，优先使用云端默认图
  const DEFAULT_AVATAR = 'cloud://nkuwiki-0g6bkdy9e8455d93.6e6b-nkuwiki-0g6bkdy9e8455d93-1319858646/static/default-avatar.png';
  // 备用头像路径，使用配置中的base_url
  const FALLBACK_AVATAR = API.BASE_URL + '/static/default-avatar.png';
  
  if (!avatarUrl) {
    return DEFAULT_AVATAR;
  }
  
  // 如果URL包含default.png，使用云端默认头像
  if (avatarUrl.includes('default.png')) {
    return DEFAULT_AVATAR;
  }
  
  // 如果是本地资源路径，直接返回
  if (avatarUrl.startsWith('/')) {
    return avatarUrl;
  }
  
  // 如果已经是https链接，直接返回
  if (avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // 如果是http开头，替换为https
  if (avatarUrl.startsWith('http://')) {
    return avatarUrl.replace('http://', 'https://');
  }
  
  // 如果是相对路径但不带斜杠，加上斜杠
  if (avatarUrl && !avatarUrl.includes('://')) {
    return '/' + avatarUrl;
  }
  
  return avatarUrl || DEFAULT_AVATAR;
}

module.exports = {
  API,
  logger,
  request: API.request,
  processAvatarUrl
}; 