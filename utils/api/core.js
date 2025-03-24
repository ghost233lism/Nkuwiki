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
  // 基础URL - 将改为动态获取
  get BASE_URL() {
    try {
      const currentApp = getApp();
      if (currentApp && currentApp.globalData && currentApp.globalData.config) {
        return currentApp.globalData.config.services.app.base_url || 'https://nkuwiki.com';
      }
    } catch (error) {
      logger.warn('获取BASE_URL失败，使用默认值', error);
    }
    return 'https://nkuwiki.com';
  },
  
  // 各模块前缀
  PREFIX: {
    WXAPP: '/api/wxapp',
    AGENT: '/api/agent'
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

// 基础请求函数
const request = (options = {}) => {
  // 设置默认参数
  const defaultOptions = {
    showError: true,  // 是否显示错误提示
    retryCount: 2,    // 重试次数
    retryDelay: 1000, // 重试延迟
    timeout: 15000,   // 超时时间
    showLoading: false, // 是否显示加载提示 (默认不显示)
    loadingText: '加载中...',
    params: {}        // 查询参数
  };
  
  // 合并选项
  options = Object.assign({}, defaultOptions, options);
  
  // 检查参数有效性
  if (!options.url) {
    const errorMsg = '请求缺少URL参数';
    logger.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
  
  // 使用Promise包装请求
  return new Promise((resolve, reject) => {
    // 执行请求函数
    const executeRequest = (retryAttempt = 0) => {
      try {
        // 显示加载中
        let loadingShown = false;
        if (options.showLoading) {
          loadingShown = true;
          wx.showLoading({
            title: options.loadingText,
            mask: true
          });
        }
        
        // 构建完整URL
        let url = options.url;
        if (!url.startsWith('http')) {
          url = API.BASE_URL + url;
        }
        
        // 处理查询参数
        url = processUrl(url, options.params);
        
        // 确保data是一个对象而不是字符串
        let requestData = options.data;
        if (requestData && typeof requestData === 'string') {
          try {
            requestData = JSON.parse(requestData);
            logger.debug('请求数据从字符串转换为对象');
          } catch (e) {
            logger.error('请求数据解析失败，保持原样', e);
          }
        }
        
        // 确保所有字段值都不是undefined（微信请求会自动剔除undefined值）
        if (requestData && typeof requestData === 'object') {
          Object.keys(requestData).forEach(key => {
            if (requestData[key] === undefined) {
              logger.warn(`请求数据中发现undefined值，字段: ${key}，已移除`);
              delete requestData[key]; // 移除undefined值
            }
          });
          
          // 特别检查帖子创建请求
          if (url.includes('/posts') && options.method === 'POST') {
            // 检查title字段
            if (!requestData.title && requestData.title !== 0) {
              logger.error('发帖请求缺少title字段，这将导致422错误');
            } else {
              logger.debug(`发帖请求title字段: "${requestData.title}", 类型: ${typeof requestData.title}, 长度: ${requestData.title.length}`);
            }
          }
        }
        
        // 记录完整的URL
        logger.debug(`准备发起请求[${retryAttempt > 0 ? '重试#' + retryAttempt : '首次'}]: ${options.method || 'GET'} ${url}`);
        if (requestData) {
          // 增强日志记录，完整显示请求体
          try {
            const requestDataStr = JSON.stringify(requestData, null, 2);
            logger.debug(`完整请求体: ${requestDataStr}`);
          } catch (e) {
            logger.debug(`请求体参数: ${requestData}`);
          }
        }
        
        // 获取token并添加到请求头
        let headers = options.header || { 'Content-Type': 'application/json' };
        const token = wx.getStorageSync('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 记录请求开始时间用于性能分析
        const startTime = Date.now();

        // 捕获并记录任何异常
        try {
          logger.debug('发送请求参数:', {
            url, 
            method: options.method || 'GET',
            data: requestData,
            header: headers
          });
          
          // 发起请求
          const requestTask = wx.request({
            url: url,
            data: requestData,
            method: options.method || 'GET',
            header: headers,
            timeout: options.timeout,
            success: (res) => {
              // 记录响应时间
              const responseTime = Date.now() - startTime;
              logger.debug(`响应时间: ${responseTime}ms`);
              
              // 隐藏加载中
              if (loadingShown) {
                wx.hideLoading();
                loadingShown = false;
              }
              
              try {
                // 请求日志
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  logger.info(`请求成功: ${options.method || 'GET'} ${url}, 状态码: ${res.statusCode}`);
                  
                  // 响应体详细日志（针对重要接口）
                  if (url.includes('/like') || url.includes('/favorite') || url.includes('/comments')) {
                    logger.info(`关键接口响应数据: ${JSON.stringify(res.data)}`);
                  }
                  
                  // 处理标准响应
                  const data = handleResponse(res);
                  resolve(data);
                } else if (res.statusCode === 401) {
                  // 未授权, 引导用户重新登录
                  logger.warn('服务器返回未授权状态码 (401)');
                  wx.removeStorageSync('token');
                  wx.removeStorageSync('userInfo');
                  
                  // 提示用户
                  wx.showToast({
                    title: '登录已过期，请重新登录',
                    icon: 'none',
                    duration: 2000
                  });
                  
                  // 2秒后跳转到登录页
                  setTimeout(() => {
                    wx.redirectTo({
                      url: '/pages/login/login'
                    });
                  }, 2000);
                  
                  reject(new Error('未授权'));
                } else {
                  // 其他错误状态码
                  logger.warn(`请求返回错误状态码: ${res.statusCode}, 响应数据: ${JSON.stringify(res.data)}`);
                  
                  // 特殊处理422错误，详细输出验证失败信息
                  if (res.statusCode === 422) {
                    try {
                      // 尝试解析详细的验证错误信息
                      const errorData = res.data;
                      logger.error('数据验证失败(422)，原始错误信息:', JSON.stringify(errorData));
                      
                      // 尝试提取具体的字段错误信息
                      let errorMsg = '数据验证失败';
                      
                      if (errorData && errorData.details && errorData.details.errors) {
                        // 标准FastAPI验证错误格式
                        const errors = errorData.details.errors;
                        errorMsg = errors.map(err => `字段 ${err.loc.join('.')} 错误: ${err.msg}`).join('; ');
                      } else if (errorData && errorData.detail && Array.isArray(errorData.detail)) {
                        // 另一种常见的FastAPI验证错误格式
                        errorMsg = errorData.detail.map(err => {
                          if (typeof err === 'object') {
                            return `字段 ${err.loc?.join('.') || '未知'}: ${err.msg || JSON.stringify(err)}`;
                          }
                          return String(err);
                        }).join('; ');
                      } else if (errorData && errorData.detail) {
                        // 简单的详情字符串
                        errorMsg = String(errorData.detail);
                      } else if (errorData && errorData.message) {
                        // 使用message字段
                        errorMsg = String(errorData.message);
                      } else if (errorData && Array.isArray(errorData)) {
                        // 直接是一个错误数组
                        errorMsg = errorData.map(err => {
                          if (typeof err === 'object') {
                            return JSON.stringify(err);
                          }
                          return String(err);
                        }).join('; ');
                      } else if (errorData && typeof errorData === 'object') {
                        // 如果是对象，尝试序列化
                        errorMsg = JSON.stringify(errorData);
                      }
                      
                      logger.error('解析后的错误信息:', errorMsg);
                      
                      // 显示更友好的错误提示
                      if (options.showError) {
                        wx.showModal({
                          title: '数据验证失败',
                          content: errorMsg,
                          showCancel: false
                        });
                      }
                      
                      // 为帖子创建请求特殊处理
                      if (url.includes('/posts') && options.method === 'POST') {
                        logger.error('发帖失败，详细错误:', errorMsg);
                        logger.error('请检查以下字段：title, content, images, tags 等必填字段');
                      }
                      
                      reject(new Error(errorMsg));
                      return;
                    } catch (parseError) {
                      logger.error('解析422错误详情失败:', parseError);
                    }
                  }
                  
                  // 检查是否需要重试
                  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
                  if (retryableStatusCodes.includes(res.statusCode) && retryAttempt < options.retryCount) {
                    logger.warn(`状态码${res.statusCode}需要重试，${options.retryDelay}ms后重试`);
                    setTimeout(() => {
                      executeRequest(retryAttempt + 1);
                    }, options.retryDelay);
                    return;
                  }
                  
                  // 状态码回调处理
                  if (options.statusCodeCallback && options.statusCodeCallback[res.statusCode]) {
                    try {
                      const result = options.statusCodeCallback[res.statusCode](res);
                      if (result instanceof Promise) {
                        result.then(resolve).catch(reject);
                      } else {
                        resolve(result);
                      }
                      return;
                    } catch (callbackError) {
                      logger.error(`状态码回调处理错误: ${callbackError.message}`);
                    }
                  }
                  
                  // 显示错误提示
                  if (options.showError) {
                    wx.showToast({
                      title: `请求失败: ${res.statusCode}`,
                      icon: 'none',
                      duration: 2000
                    });
                  }
                  
                  reject(new Error(`请求失败，状态码: ${res.statusCode}`));
                }
              } catch (error) {
                // 处理响应解析错误
                logger.error(`响应处理错误: ${error.message}, 原始响应: ${JSON.stringify(res.data)}`);
                
                if (loadingShown) {
                  wx.hideLoading();
                  loadingShown = false;
                }
                
                if (options.showError) {
                  wx.showToast({
                    title: error.message || '数据处理错误',
                    icon: 'none',
                    duration: 2000
                  });
                }
                
                reject(error);
              }
            },
            fail: (err) => {
              // 请求失败
              const responseTime = Date.now() - startTime;
              logger.error(`请求失败: ${err.errMsg}, 耗时: ${responseTime}ms`);
              
              if (loadingShown) {
                wx.hideLoading();
                loadingShown = false;
              }
              
              // 检查是否需要重试
              const networkErrors = ['request:fail', 'timeout', 'DNSLookupFailed'];
              const shouldRetry = networkErrors.some(errType => err.errMsg && err.errMsg.includes(errType));
              
              if (shouldRetry && retryAttempt < options.retryCount) {
                logger.warn(`网络错误需要重试，${options.retryDelay}ms后重试`);
                setTimeout(() => {
                  executeRequest(retryAttempt + 1);
                }, options.retryDelay);
                return;
              }
              
              // 尝试域名切换
              if (networkErrors.some(errType => err.errMsg && err.errMsg.includes(errType)) && 
                  retryAttempt === options.retryCount && 
                  !url.includes(KNOWN_DOMAINS[currentDomainIndex + 1 % KNOWN_DOMAINS.length])) {
                
                // 切换域名
                API.BASE_URL = switchToNextDomain();
                logger.warn(`尝试使用备用域名重试请求: ${API.BASE_URL}`);
                
                // 延迟后重试
                setTimeout(() => {
                  executeRequest(0); // 重置重试计数
                }, options.retryDelay);
                return;
              }
              
              // 自定义失败处理
              if (options.fail && typeof options.fail === 'function') {
                try {
                  const result = options.fail(err);
                  if (result !== undefined) {
                    resolve(result);
                    return;
                  }
                } catch (failHandlerError) {
                  logger.error(`自定义失败处理器错误: ${failHandlerError.message}`);
                }
              }
              
              // 显示错误提示
              if (options.showError) {
                wx.showToast({
                  title: '网络请求失败',
                  icon: 'none',
                  duration: 2000
                });
              }
              
              reject(err);
            },
            complete: () => {
              // 确保加载框被关闭
              if (loadingShown) {
                wx.hideLoading();
              }
            }
          });
          
          // 返回请求任务，允许调用者取消请求
          return requestTask;
        } catch (requestError) {
          logger.error('wx.request调用出错:', requestError);
          if (loadingShown) {
            wx.hideLoading();
          }
          reject(new Error(`发送请求失败: ${requestError.message || '未知错误'}`));
        }
      } catch (outerError) {
        logger.error('executeRequest外层错误:', outerError);
        reject(outerError);
      }
    };
    
    // 开始执行请求
    try {
      executeRequest();
    } catch (startError) {
      logger.error('启动请求失败:', startError);
      reject(startError);
    }
  });
};

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
  request,
  processAvatarUrl
}; 