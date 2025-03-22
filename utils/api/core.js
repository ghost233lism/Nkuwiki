// core.js
// 封装基础请求功能和日志工具

// 获取全局应用实例
const app = getApp();
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

// 基础请求函数
const request = (options = {}) => {
  // 设置默认参数
  const defaultOptions = {
    showError: true,  // 是否显示错误提示
    retryCount: 2,    // 重试次数
    retryDelay: 1000, // 重试延迟
    timeout: 15000,   // 超时时间
    showLoading: false, // 是否显示加载提示 (改为默认不显示)
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
      if (options.params && Object.keys(options.params).length > 0) {
        const queryParams = [];
        
        for (const key in options.params) {
          if (options.params[key] !== undefined && options.params[key] !== null) {
            queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(options.params[key])}`);
          }
        }
        
        // 添加查询参数到URL
        if (queryParams.length > 0) {
          const queryString = queryParams.join('&');
          url += (url.includes('?') ? '&' : '?') + queryString;
          logger.debug(`添加查询参数: ${queryString}`);
        }
      }
      
      logger.debug(`发起请求[${retryAttempt > 0 ? '重试#' + retryAttempt : '首次'}]: ${options.method || 'GET'} ${url}`);
      if (options.data) {
        logger.debug(`请求体参数: ${JSON.stringify(options.data)}`);
      }
      
      // 获取token并添加到请求头
      let headers = options.header || { 'Content-Type': 'application/json' };
      const token = wx.getStorageSync('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        logger.debug('添加认证令牌到请求头');
      }
      
      // 记录请求开始时间用于性能分析
      const startTime = Date.now();
      
      // 发起请求
      const requestTask = wx.request({
        url: url,
        data: options.data,
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
          
          // 请求日志
          if (res.statusCode >= 200 && res.statusCode < 300) {
            logger.debug(`请求成功: ${options.method || 'GET'} ${url}, 状态码: ${res.statusCode}`);
          } else {
            logger.warn(`请求异常: ${options.method || 'GET'} ${url}, 状态码: ${res.statusCode}`);
          }
          
          // 处理标准响应格式
          if (res.data && res.data.code !== undefined) {
            if (res.data.code === 200 || res.data.code === 0) {
              // 成功响应
              if (res.data.data !== undefined) {
                logger.debug('服务器返回标准数据格式, 提取data字段');
                resolve(res.data.data);
              } else {
                logger.debug('服务器返回标准格式但无data字段，返回完整响应');
                resolve(res.data);
              }
            } else if (res.data.code === 401) {
              // 未授权, 引导用户重新登录
              logger.warn('服务器返回未授权状态码 (401)');
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
              logger.warn(`请求返回错误 (code=${res.data.code}): ${res.data.message || '未知错误'}`);
              
              // 如果明确指出需要重试的错误类型
              const retryableErrorCodes = [408, 429, 500, 502, 503, 504];
              if (retryableErrorCodes.includes(res.data.code) && retryAttempt < options.retryCount) {
                logger.warn(`服务器建议重试 (code=${res.data.code})，${options.retryDelay}ms后重试`);
                setTimeout(() => {
                  executeRequest(retryAttempt + 1).then(resolve).catch(reject);
                }, options.retryDelay);
                return;
              }
              
              // 如果有自定义失败处理器，则调用它
              if (typeof options.fail === 'function') {
                try {
                  const result = options.fail(new Error(res.data.message || '请求失败'));
                  if (result !== undefined) {
                    resolve(result);
                    return;
                  }
                } catch (err) {
                  logger.error('自定义fail处理器出错:', err);
                }
              }
              
              // 显示错误
              if (options.showError) {
                wx.showToast({
                  title: res.data.message || '请求失败',
                  icon: 'none'
                });
              }
              reject(new Error(res.data.message || '请求失败'));
            }
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            // 兼容非标准响应，但状态码正常
            logger.debug('非标准响应格式，但状态码正常');
            resolve(res.data);
          } else {
            // 状态码异常
            logger.warn(`请求状态码异常: ${res.statusCode}`);
            
            // 判断是否需要重试
            const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
            if (retryableStatusCodes.includes(res.statusCode) && retryAttempt < options.retryCount) {
              logger.warn(`状态码${res.statusCode}建议重试，${options.retryDelay}ms后重试`);
              setTimeout(() => {
                executeRequest(retryAttempt + 1).then(resolve).catch(reject);
              }, options.retryDelay);
              return;
            }
            
            // 如果有自定义失败处理器，则调用它
            if (typeof options.fail === 'function') {
              try {
                const result = options.fail(new Error(`网络请求错误 (${res.statusCode})`));
                if (result !== undefined) {
                  resolve(result);
                  return;
                }
              } catch (err) {
                logger.error('自定义fail处理器出错:', err);
              }
            }
            
            // 其他错误情况
            reject(new Error(`网络请求错误 (${res.statusCode})`));
          }
        },
        fail: (err) => {
          logger.error(`请求失败: ${url}`, err);
          logger.error('错误详情:', err.errMsg);
          
          // 隐藏加载中
          if (loadingShown) {
            wx.hideLoading();
            loadingShown = false;
          }
          
          // 如果有自定义失败处理器，则调用它
          if (typeof options.fail === 'function') {
            try {
              const result = options.fail(err);
              if (result !== undefined) {
                resolve(result);
                return;
              }
            } catch (failErr) {
              logger.error('自定义fail处理器出错:', failErr);
            }
          }
          
          // 判断是否需要重试
          if (retryAttempt < options.retryCount) {
            logger.warn(`请求失败，${options.retryDelay}ms后重试:`, err.errMsg);
            setTimeout(() => {
              executeRequest(retryAttempt + 1).then(resolve).catch(reject);
            }, options.retryDelay);
            return;
          }
          
          // 判断是否需要域名切换
          if (err.errMsg && (
              err.errMsg.includes('timeout') || 
              err.errMsg.includes('domain name resolution failed') ||
              err.errMsg.includes('SSL handshake failed') ||
              err.errMsg.includes('-204'))) {
            
            // 尝试切换到备用域名
            if (KNOWN_DOMAINS.length > 1) {
              const newBaseUrl = switchToNextDomain();
              API.BASE_URL = newBaseUrl;
              
              logger.warn(`检测到可能的网络问题，切换到备用域名: ${newBaseUrl}`);
              
              // 立即使用新域名重试
              setTimeout(() => {
                executeRequest(0).then(resolve).catch(reject);
              }, 500);
              return;
            }
          }
          
          // 域名错误处理
          if (err.errMsg && (err.errMsg.includes('domain') || err.errMsg.includes('ssl'))) {
            // 非白名单域名错误
            logger.error('域名校验错误:', err.errMsg);
            wx.showModal({
              title: '提示',
              content: '请求域名不在白名单中，请检查开发工具设置',
              confirmText: '我知道了',
              showCancel: false
            });
          }
          
          // 其他情况正常抛出错误
          reject(err);
        },
        complete: () => {
          logger.debug(`请求完成: ${url}`);
          
          // 确保加载状态被关闭
          if (loadingShown) {
            wx.hideLoading();
          }
        }
      });
      
      // 记录请求ID，方便跟踪
      logger.debug('请求已发送，请求ID:', requestTask ? (requestTask.requestID || '未知') : '未知');
    };
    
    // 执行请求
    executeRequest(0);
  });
};

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
      const userManager = require('../user_manager');
      return await userManager.getTempFileURL(avatarUrl);
    } catch (error) {
      logger.error('转换头像URL失败:', error);
      return avatarUrl;
    }
  }
  
  return avatarUrl;
}

module.exports = {
  API,
  logger,
  request,
  processAvatarUrl,
  switchToNextDomain
}; 