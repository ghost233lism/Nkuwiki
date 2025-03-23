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
  
  // 处理标准响应格式：{ code: 200, message: 'success', data: {...} }
  if (res.data && typeof res.data === 'object' && res.data.code !== undefined) {
    // 检查响应码是否成功
    if (res.data.code === 200 || res.data.code === 0) {
      // 成功响应，返回data字段并确保包含success标志
      let responseData = res.data.data;
      
      // 如果返回的不是对象，包装成对象
      if (!responseData || typeof responseData !== 'object') {
        responseData = { 
          success: true, 
          data: responseData 
        };
      } else if (responseData.success === undefined) {
        // 如果是对象但没有success字段，添加success字段
        responseData.success = true;
      }
      
      return responseData;
    } else {
      // 业务错误，抛出异常
      const error = new Error(res.data.message || '业务处理失败');
      error.code = res.data.code;
      error.data = res.data;
      throw error;
    }
  }
  
  // 非标准响应，使用HTTP状态码判断
  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
    // 成功的HTTP状态码，返回响应数据并确保包含success标志
    if (typeof res.data === 'object' && res.data !== null) {
      if (res.data.success === undefined) {
        res.data.success = true;
      }
      return res.data;
    } else {
      // 非对象类型数据，包装成对象
      return {
        success: true,
        data: res.data
      };
    }
  }
  
  // 其他错误情况
  const error = new Error('未知响应格式或请求失败');
  error.statusCode = res.statusCode;
  error.data = res.data;
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
  
  // 使用Promise包装请求
  return new Promise((resolve, reject) => {
    // 执行请求函数
    const executeRequest = (retryAttempt = 0) => {
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
      
      // 记录完整的URL
      logger.debug(`发起请求[${retryAttempt > 0 ? '重试#' + retryAttempt : '首次'}]: ${options.method || 'GET'} ${url}`);
      if (requestData) {
        logger.debug(`请求体参数: ${JSON.stringify(requestData)}`);
      }
      
      // 获取token并添加到请求头
      let headers = options.header || { 'Content-Type': 'application/json' };
      const token = wx.getStorageSync('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 记录请求开始时间用于性能分析
      const startTime = Date.now();
      
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
    };
    
    // 开始执行请求
    executeRequest();
  });
};

/**
 * 处理头像URL，确保小程序环境可以正确显示
 * @param {string} avatarUrl - 原始头像URL
 * @returns {string} 处理后的头像URL
 */
function processAvatarUrl(avatarUrl) {
  if (!avatarUrl) {
    return '/assets/icons/default-avatar.png';
  }
  
  // 如果已经是https或绝对路径，直接返回
  if (avatarUrl.startsWith('https://') || avatarUrl.startsWith('/')) {
    return avatarUrl;
  }
  
  // 如果是http开头，替换为https
  if (avatarUrl.startsWith('http://')) {
    return avatarUrl.replace('http://', 'https://');
  }
  
  // 其他情况，拼接基础URL
  return API.BASE_URL + (avatarUrl.startsWith('/') ? '' : '/') + avatarUrl;
}

module.exports = {
  API,
  logger,
  request,
  processAvatarUrl
}; 