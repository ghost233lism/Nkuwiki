/**
 * 通用工具函数集合
 */

// ==================== 配置引入 ====================
// 从全局App获取API配置，避免循环依赖
const getAPIConfig = () => {
  try {
    const app = getApp();
    return app ? app.globalData.API_CONFIG : {
      base_url: 'https://nkuwiki.com',
      api_prefix: '/api',
      prefixes: {
        wxapp: '/wxapp',
        agent: '/agent',
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (err) {
    console.debug('获取API_CONFIG失败，使用默认配置:', err);
    return {
      base_url: 'https://nkuwiki.com',
      api_prefix: '/api',
      prefixes: {
        wxapp: '/wxapp',
        agent: '/agent',
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};

// ==================== 日期时间处理 ====================

const formatNumber = n => n.toString().padStart(2, '0')

const formatTime = date => {
  const [year, month, day, hour, minute, second] = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ]
  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

function formatRelativeTime(timestamp) {
  if (typeof timestamp === 'string' && /[年月天时分秒]前|刚刚发布/.test(timestamp)) {
    return timestamp
  }

  if (!timestamp) return '刚刚发布'

  let date
  try {
    date = timestamp instanceof Date ? timestamp :
           typeof timestamp === 'string' || typeof timestamp === 'number' ? new Date(timestamp) :
           timestamp.toDate ? timestamp.toDate() : new Date()
  } catch (err) {
    console.debug('时间格式化错误:', err)
    return '刚刚发布'
  }

  if (isNaN(date.getTime())) return '刚刚发布'

  const diff = Date.now() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  
  const timeUnits = [
    { unit: '年', value: 365 * 24 * 60 * 60 },
    { unit: '个月', value: 30 * 24 * 60 * 60 },
    { unit: '天', value: 24 * 60 * 60 },
    { unit: '小时', value: 60 * 60 },
    { unit: '分钟', value: 60 },
    { unit: '秒', value: 1 }
  ]

  if (seconds < 0) return '刚刚发布'
  if (seconds < 15) return '刚刚发布'

  for (const { unit, value } of timeUnits) {
    const count = Math.floor(seconds / value)
    if (count > 0) return `${count}${unit}前`
  }

  return '刚刚发布'
}

// ==================== 系统信息 ====================

function getSystemInfo() {
  try {
    const appBaseInfo = wx.getAppBaseInfo()
    const deviceInfo = wx.getDeviceInfo()
    const windowInfo = wx.getWindowInfo()
    const systemSetting = wx.getSystemSetting()
    const appAuthorizeSetting = wx.getAppAuthorizeSetting()
    
    return {
      // 基础信息
      platform: appBaseInfo.platform,
      language: appBaseInfo.language,
      version: appBaseInfo.version,
      SDKVersion: appBaseInfo.SDKVersion,
      theme: appBaseInfo.theme,
      enableDebug: appBaseInfo.enableDebug,
      host: appBaseInfo.host,
      
      // 设备信息
      brand: deviceInfo.brand,
      model: deviceInfo.model,
      system: deviceInfo.system,
      platform: deviceInfo.platform,
      
      // 窗口信息
      screenWidth: windowInfo.screenWidth,
      screenHeight: windowInfo.screenHeight,
      windowWidth: windowInfo.windowWidth,
      windowHeight: windowInfo.windowHeight,
      statusBarHeight: windowInfo.statusBarHeight,
      safeArea: windowInfo.safeArea,
      pixelRatio: windowInfo.pixelRatio,
      
      // 系统设置
      bluetoothEnabled: systemSetting.bluetoothEnabled,
      locationEnabled: systemSetting.locationEnabled,
      wifiEnabled: systemSetting.wifiEnabled,
      deviceOrientation: systemSetting.deviceOrientation,
      
      // 授权设置
      albumAuthorized: appAuthorizeSetting.albumAuthorized,
      bluetoothAuthorized: appAuthorizeSetting.bluetoothAuthorized,
      cameraAuthorized: appAuthorizeSetting.cameraAuthorized,
      locationAuthorized: appAuthorizeSetting.locationAuthorized,
      locationReducedAccuracy: appAuthorizeSetting.locationReducedAccuracy,
      microphoneAuthorized: appAuthorizeSetting.microphoneAuthorized,
      notificationAuthorized: appAuthorizeSetting.notificationAuthorized,
      notificationAlertAuthorized: appAuthorizeSetting.notificationAlertAuthorized,
      notificationBadgeAuthorized: appAuthorizeSetting.notificationBadgeAuthorized,
      notificationSoundAuthorized: appAuthorizeSetting.notificationSoundAuthorized
    }
  } catch (err) {
    console.debug('获取系统信息失败:', err)
    return {}
  }
}

// ==================== 存储操作 ====================

const storage = {
  get: key => {
    try {
      return wx.getStorageSync(key)
    } catch (e) {
      console.debug(`获取Storage失败[${key}]:`, e)
      return null
    }
  },
  
  set: (key, data) => {
    try {
      wx.setStorageSync(key, data)
      return true
    } catch (e) {
      console.debug(`设置Storage失败[${key}]:`, e)
      return false
    }
  },
  
  remove: key => {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (e) {
      console.debug(`移除Storage失败[${key}]:`, e)
      return false
    }
  }
}

// ==================== UI操作 ====================

const ToastType = {
  SUCCESS: 'success',
  LOADING: 'loading',
  ERROR: 'error',
  NONE: 'none'
}

const ui = {
  showToast: (title, { type = ToastType.NONE, duration = 1500, mask = false } = {}) => {
    if (type === ToastType.LOADING) {
      wx.showLoading({ title, mask })
    } else {
      wx.showToast({
        title,
        icon: type,
        duration,
        mask
      })
    }
  },

  hideToast: () => {
    wx.hideLoading()
    wx.hideToast()
  },

  /**
   * 显示模态对话框
   * @param {Object} options 配置对象
   * @param {String} options.title 标题
   * @param {String} options.content 内容
   * @param {String} [options.confirmText='确定'] 确认按钮文字
   * @param {String} [options.cancelText='取消'] 取消按钮文字
   * @param {Boolean} [options.showCancel=true] 是否显示取消按钮
   * @returns {Promise<Boolean>} 用户点击确认返回 true，取消返回 false
   */
  showModal: ({ title = '提示', content = '', confirmText = '确定', cancelText = '取消', showCancel = true } = {}) => {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText,
        showCancel,
        success: (res) => {
          if (res.confirm) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        fail: (err) => {
          console.error('wx.showModal 调用失败:', err);
          reject(err);
        }
      });
    });
  },

  showActionSheet: items => {
    return new Promise((resolve, reject) => {
      wx.showActionSheet({
        itemList: items,
        success: res => resolve(res.tapIndex),
        fail: err => reject(err)
      })
    })
  },

  copyText: (text, tip = '复制成功') => {
    wx.setClipboardData({
      data: text,
      success: () => ui.showToast(tip)
    })
  }
}

// ==================== 导航操作 ====================

const nav = {
  setTitle: title => wx.setNavigationBarTitle({ title }),

  back: (delta = 1) => {
    console.debug('导航: 返回', delta, '页');
    return new Promise((resolve, reject) => {
      wx.navigateBack({ 
        delta,
        success: resolve,
        fail: err => {
          console.error('返回失败:', err);
          reject(err);
        }
      });
    });
  },

  to: (url, params) => {
    if (!url) {
      console.error('导航错误: url不能为空');
      return Promise.reject(new Error('导航错误: url不能为空'));
    }
    
    if (params) {
      const query = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + query;
    }
    
    console.debug('导航: 跳转到', url);
    return new Promise((resolve, reject) => {
      wx.navigateTo({
        url,
        success: resolve,
        fail: err => {
          console.error('跳转失败:', url, err);
          // 尝试fallback到redirectTo
          if (err.errMsg?.includes('limit')) {
            console.debug('已达到页面栈最大值，尝试redirectTo');
            wx.redirectTo({
              url,
              success: resolve,
              fail: redirectErr => {
                console.error('redirectTo也失败了:', redirectErr);
                reject(redirectErr);
              }
            });
          } else {
            reject(err);
          }
        }
      });
    });
  },

  // 添加navigateTo作为to方法的别名
  navigateTo: function(url, params) {
    return this.to(url, params);
  },

  redirect: (url, params) => {
    if (!url) {
      console.error('导航错误: url不能为空');
      return Promise.reject(new Error('导航错误: url不能为空'));
    }
    
    if (params) {
      const query = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + query;
    }
    
    console.debug('导航: 重定向到', url);
    return new Promise((resolve, reject) => {
      wx.redirectTo({
        url,
        success: resolve,
        fail: err => {
          console.error('重定向失败:', url, err);
          reject(err);
        }
      });
    });
  },

  redirectTo: function(url, params) {
    return this.redirect(url, params);
  },

  switchTab: url => {
    if (!url) {
      console.error('导航错误: url不能为空');
      return Promise.reject(new Error('导航错误: url不能为空'));
    }
    
    console.debug('导航: 切换到标签页', url);
    return new Promise((resolve, reject) => {
      wx.switchTab({
        url,
        success: resolve,
        fail: err => {
          console.error('切换标签页失败:', url, err);
          reject(err);
        }
      });
    });
  },

  reLaunch: url => {
    if (!url) {
      console.error('导航错误: url不能为空');
      return Promise.reject(new Error('导航错误: url不能为空'));
    }
    
    console.debug('导航: 重启并跳转到', url);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.debug('重启跳转超时:', url);
        // 仍然解析为成功，避免阻塞其他操作
        resolve({success: true, timeout: true});
      }, 3000); // 3秒超时
      
      wx.reLaunch({
        url,
        success: res => {
          clearTimeout(timeout);
          resolve(res);
        },
        fail: err => {
          clearTimeout(timeout);
          console.error('重启跳转失败:', url, err);
          // 如果是超时错误，也解析为成功
          if (err.errMsg && err.errMsg.includes('timeout')) {
            resolve({success: true, timeout: true});
          } else {
            reject(err);
          }
        }
      });
    });
  }
}

// ==================== 错误处理 ====================

const ErrorType = {
  NETWORK: 'NETWORK_ERROR',    // 网络错误
  API: 'API_ERROR',           // 接口错误
  PARAMS: 'PARAMS_ERROR',     // 参数错误
  VALIDATION: 'VALIDATION_ERROR', // 验证错误
  AUTH: 'AUTH_ERROR',         // 认证错误
  PERMISSION: 'PERMISSION_ERROR', // 权限错误
  DATA: 'DATA_ERROR',         // 数据错误
  FILE: 'FILE_ERROR',         // 文件错误
  UNKNOWN: 'UNKNOWN_ERROR'    // 未知错误
}

const error = {
  create: (message, code = 400, details = null) => {
    const err = new Error(message);
    err.code = code;
    err.details = details;
    return err;
  },
  
  report: (err) => {
    console.debug('错误上报:', err);
    // 可以在这里添加错误上报逻辑，如发送到服务器
  },
  
  handle: (err, defaultMsg = '操作失败') => {
    const message = err?.message || (typeof err === 'string' ? err : defaultMsg);
    ui.showToast(message, { type: ToastType.ERROR });
    console.debug('错误详情:', err);
    return { error: true, message };
  }
}

// ==================== HTTP请求 ====================

/**
 * GET请求
 * @param {string} url - 请求URL
 * @param {object} [params] - 请求参数
 * @returns {Promise<object>} - 响应数据
 */
const get = async (url, params = {}) => {
  const openid = storage.get('openid')
  const finalUrl = url.startsWith('/') ? url : '/' + url
  const apiUrl = finalUrl.startsWith(getAPIConfig().api_prefix) ? finalUrl : getAPIConfig().api_prefix + finalUrl
  
  const requestData = { ...params }
  if (openid && !requestData.openid) {
    requestData.openid = openid
  }
  
  let requestUrl = `${getAPIConfig().base_url}${apiUrl}`
  if (Object.keys(requestData).length) {
    const queryParams = Object.entries(requestData)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    requestUrl += `${apiUrl.includes('?') ? '&' : '?'}${queryParams}`
  }
  
  console.debug('GET请求:', requestUrl)
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method: 'GET',
      header: {
        ...getAPIConfig().headers,
        ...(openid ? {'X-User-OpenID': openid} : {})
      },
      success(res) {
        console.debug('GET响应:', res.data)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject({
            code: res.data.code || res.statusCode,
            message: res.data.message || '请求失败'
          })
        }
      },
      fail(err) {
        console.debug('GET请求失败:', err)
        reject({
          code: -1,
          message: err.errMsg || '网络请求失败'
        })
      }
    })
  })
}

/**
 * POST请求
 * @param {string} url - 请求URL
 * @param {object} [data] - 请求数据
 * @returns {Promise<object>} - 响应数据
 */
const post = async (url, data = {}) => {
  const openid = storage.get('openid')
  const finalUrl = url.startsWith('/') ? url : '/' + url
  const apiUrl = finalUrl.startsWith(getAPIConfig().api_prefix) ? finalUrl : getAPIConfig().api_prefix + finalUrl
  const requestUrl = `${getAPIConfig().base_url}${apiUrl}`
  
  const requestData = { ...data }
  if (openid && !requestData.openid) {
    requestData.openid = openid
  }
  
  console.debug('POST请求:', requestUrl, requestData)
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method: 'POST',
      data: requestData,
      header: {
        ...getAPIConfig().headers,
        ...(openid ? {'X-User-OpenID': openid} : {})
      },
      success(res) {
        console.debug('POST响应:', res.data)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject({
            code: res.data.code || res.statusCode,
            message: res.data.message || '请求失败'
          })
        }
      },
      fail(err) {
        console.debug('POST请求失败:', err)
        reject({
          code: -1,
          message: err.errMsg || '网络请求失败'
        })
      }
    })
  })
}

// ==================== API客户端工厂 ====================

// API客户端缓存，避免重复创建相同的客户端
const apiClientCache = {};

/**
 * 创建API客户端
 * @param {String} basePath API基础路径
 * @param {Object} endpoints API端点配置
 * @returns {Object} API客户端
 */
function createApiClient(basePath, endpoints = {}) {
  // 标准化基础路径，确保以/开头
  const normalizedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
  
  // 缓存key = 基础路径 + 端点JSON
  const cacheKey = `${normalizedBasePath}_${JSON.stringify(endpoints)}`;
  
  // 如果已缓存，直接返回缓存的客户端
  if (apiClientCache[cacheKey]) {
    return apiClientCache[cacheKey];
  }
  
  const client = {};
  
  // 构建每个端点的方法
  for (const [name, config] of Object.entries(endpoints)) {
    client[name] = async (data = {}) => {
      // 始终尝试获取openid并添加到请求数据中（如果API需要）
      if (config.params && config.params.openid) {
        // 先检查传入的数据中是否已有openid
        if (!data.openid) {
          // 尝试从storage获取
          const openid = storage.get('openid');
          // 如果存在，添加到请求数据
          if (openid) {
            data.openid = openid;
          }
          // 如果不存在且是必要参数，下面的必填参数验证会捕获这个错误
        }
      }
      
      // 验证必填参数
      if (config.params) {
        const missingParams = Object.entries(config.params)
          .filter(([_, required]) => required === true)
          .map(([key]) => key)
          .filter(key => !data.hasOwnProperty(key) || data[key] === undefined || data[key] === null || data[key] === '');
        
        if (missingParams.length > 0) {
          console.debug(`API请求缺少必填参数: ${missingParams.join(', ')}`);
          return {
            code: 400,
            message: `参数错误: 缺少${missingParams.join(', ')}`,
            data: null
          };
        }
      }
      
      // 构建请求路径
      let url = normalizedBasePath;
      if (config.path) {
        url = `${normalizedBasePath}${config.path.startsWith('/') ? config.path : `/${config.path}`}`;
      }
      
      // 设置请求方法（仅支持GET和POST）
      const method = (config.method || 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'POST') {
        console.debug(`不支持的请求方法: ${method}，将使用GET方法`);
        method = 'GET';
      }
      
      try {
        // 根据请求方法发送请求
        let response;
        if (method === 'GET') {
          response = await get(url, data);
        } else {
          response = await post(url, data);
        }
        
        // 确保返回标准格式
        if (response && typeof response === 'object' && 'code' in response) {
          return response;
        }
        
        // 包装非标准响应
        return {
          code: 200,
          message: 'success',
          data: response
        };
      } catch (err) {
        console.debug(`API请求错误: ${url}`, err);
        return {
          code: err.code || 500,
          message: err.message || '网络请求失败',
          data: null,
          error: err
        };
      }
    };
  }
  
  // 缓存并返回客户端
  apiClientCache[cacheKey] = client;
  return client;
}

/**
 * 导入流式响应处理工具
 * 如果无法直接导入，请确保在使用前已加载ChunkRes函数
 */
let ChunkRes;
try {
  ChunkRes = require('../chunk-res/chunkRes').ChunkRes;
} catch (err) {
  console.debug('加载ChunkRes模块失败，将在使用时动态获取', err);
  // 会在createStreamApiClient中再次尝试获取
}

/**
 * 创建支持流式响应的API客户端
 * @param {String} basePath API基础路径
 * @param {Object} endpoints API端点配置
 * @returns {Object} 流式响应API客户端
 */
function createStreamApiClient(basePath, endpoints = {}) {
  // 标准化基础路径，确保以/开头
  const normalizedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
  
  // 缓存key = 基础路径 + 端点JSON + stream标识
  const cacheKey = `stream_${normalizedBasePath}_${JSON.stringify(endpoints)}`;
  
  // 如果已缓存，直接返回缓存的客户端
  if (apiClientCache[cacheKey]) {
    return apiClientCache[cacheKey];
  }
  
  // 如果之前没能加载ChunkRes，再次尝试获取
  if (!ChunkRes) {
    try {
      ChunkRes = require('../chunk-res/chunkRes').ChunkRes;
    } catch (err) {
      console.debug('无法加载ChunkRes模块，请确保已正确引入', err);
      throw new Error('创建流式API客户端失败: 无法加载ChunkRes模块');
    }
  }
  
  const client = {};
  
  // 构建每个端点的方法
  for (const [name, config] of Object.entries(endpoints)) {
    client[name] = async (data = {}, callbacks = {}) => {
      // 解构回调函数
      const { onMessage, onComplete, onError } = callbacks;
      
      // 始终尝试获取openid并添加到请求数据中（如果API需要）
      if (config.params && config.params.openid) {
        // 先检查传入的数据中是否已有openid
        if (!data.openid) {
          // 尝试从storage获取
          const openid = storage.get('openid');
          // 如果存在，添加到请求数据
          if (openid) {
            data.openid = openid;
          }
        }
      }
      
      // 验证必填参数
      if (config.params) {
        const missingParams = Object.entries(config.params)
          .filter(([_, required]) => required === true)
          .map(([key]) => key)
          .filter(key => !data.hasOwnProperty(key) || data[key] === undefined || data[key] === null || data[key] === '');
        
        if (missingParams.length > 0) {
          const error = {
            code: 400,
            message: `参数错误: 缺少${missingParams.join(', ')}`,
            data: null
          };
          console.debug(`API请求缺少必填参数: ${missingParams.join(', ')}`);
          if (onError) onError(error);
          return error;
        }
      }
      
      // 构建请求路径
      let url = normalizedBasePath;
      if (config.path) {
        url = `${normalizedBasePath}${config.path.startsWith('/') ? config.path : `/${config.path}`}`;
      }
      
      // 设置请求方法（仅支持GET和POST）
      const method = (config.method || 'POST').toUpperCase();
      if (method !== 'GET' && method !== 'POST') {
        console.debug(`流式响应不支持的请求方法: ${method}，将使用POST方法`);
        method = 'POST';
      }
      
      // 创建流式响应处理器
      const chunkRes = ChunkRes();
      
      // 准备请求数据
      const openid = storage.get('openid');
      const finalUrl = url.startsWith('/') ? url : '/' + url;
      const apiUrl = finalUrl.startsWith(getAPIConfig().api_prefix) ? finalUrl : getAPIConfig().api_prefix + finalUrl;
      
      let requestUrl = `${getAPIConfig().base_url}${apiUrl}`;
      let requestData = { ...data };
      
      // 对GET请求，构建查询字符串
      if (method === 'GET' && Object.keys(requestData).length) {
        const queryParams = Object.entries(requestData)
          .filter(([_, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        requestUrl += `${apiUrl.includes('?') ? '&' : '?'}${queryParams}`;
        requestData = {}; // GET请求不需要请求体
      }
      
      console.debug(`流式${method}请求:`, requestUrl, requestData);
      
      // 创建请求任务
      const task = wx.request({
        url: requestUrl,
        method: method,
        data: method === 'POST' ? requestData : undefined,
        header: {
          ...getAPIConfig().headers,
          ...(openid ? {'X-User-OpenID': openid} : {})
        },
        enableChunked: true,  // 启用分块传输
        success: res => {
          console.debug('流式响应完成:', res);
          // 处理最后的数据块
          const lastChunks = chunkRes.onComplateReturn();
          if (lastChunks && lastChunks.length > 0 && onComplete) {
            onComplete(lastChunks);
          }
        },
        fail: err => {
          console.debug('流式请求失败:', err);
          if (onError) {
            onError({
              code: -1,
              message: err.errMsg || '网络请求失败',
              error: err
            });
          }
        }
      });
      
      // 监听数据块接收
      task.onChunkReceived(res => {
        // 处理数据块
        const chunks = chunkRes.onChunkReceivedReturn(res.data);
        if (chunks && chunks.length > 0 && onMessage) {
          onMessage(chunks);
        }
      });
      
      return task;
    };
  }
  
  // 缓存并返回客户端
  apiClientCache[cacheKey] = client;
  return client;
}

// ==================== 工具函数 ====================

const debounce = (fn, delay = 500) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const throttle = (fn, delay = 500) => {
  let last = 0
  return function(...args) {
    const now = Date.now()
    if (now - last > delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

const isEmptyObject = obj => 
  obj && Object.keys(obj).length === 0 && obj.constructor === Object

const isValidArray = arr => 
  Array.isArray(arr) && arr.length > 0

const parseJsonField = (field, defaultValue = []) => {
  try {
    return field ? JSON.parse(field) : defaultValue
  } catch (e) {
    console.debug('JSON解析失败:', e)
    return defaultValue
  }
}

/**
 * 获取应用信息
 * @param {boolean} forceReload 是否强制刷新
 * @returns {Promise<Object>} 应用信息对象
 */
const getAppInfo = async (forceReload = false) => {
  try {
    const app = getApp();
    if (!app) {
      throw new Error('无法获取应用实例');
    }
    
    return await app.getAboutInfo(forceReload);
  } catch (err) {
    console.debug('获取应用信息失败:', err);
    // 返回默认信息
    return {
      version: '0.0.1'
    };
  }
};

/**
 * 获取微信用户信息
 * @returns {Promise<Object>} 用户信息
 */
const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: res => {
        const { userInfo } = res;
        resolve({
          nickname: userInfo.nickName,
          avatar: userInfo.avatarUrl,
          gender: userInfo.gender,
          country: userInfo.country,
          province: userInfo.province,
          city: userInfo.city,
          language: userInfo.language
        });
      },
      fail: err => {
        console.debug('获取用户信息失败:', err);
        reject(new Error('获取用户信息失败'));
      }
    });
  });
};

// 获取openid
const getOpenID = async (useCache = true) => {
  // 优先从缓存获取
  const cachedOpenid = storage.get('openid');
  if (useCache && cachedOpenid) {
    return cachedOpenid;
  }
  
  try {
    // 调用app实例的wxLogin方法获取
    const app = getApp();
    if (!app) {
      throw new Error('无法获取应用实例');
    }
    
    // 已经登录过，直接返回全局的openid
    if (app.globalData.openid) {
      return app.globalData.openid;
    }
    
    // 触发登录流程获取openid
    const res = await app.wxLogin();
    if (res.code === 200 && res.data && res.data.openid) {
      return res.data.openid;
    }
    
    throw new Error(res.message || '获取openid失败');
  } catch (err) {
    console.debug('获取openid失败:', err);
    throw err;
  }
}

// ==================== 链接处理 ====================

/**
 * 解析各种类型的URL
 * @param {string} url - 原始URL
 * @returns {string} - 处理后的可用URL
 */
const parseUrl = url => {
  if (!url) return '';
  
  // 已经是完整的http/https链接
  if (/^https?:\/\//.test(url)) {
    return url;
  }
  
  // 处理云存储链接
  if (/^cloud:\/\//.test(url)) {
    console.debug('解析云存储链接:', url);
    
    try {
      // 示例: cloud://nkuwiki-xxxx.6e6b-nkuwiki-xxxx-1234567890/path/to/file.jpg
      // 转换为: https://6e6b-nkuwiki-xxxx-1234567890.tcb.qcloud.la/path/to/file.jpg
      const cloudRegex = /^cloud:\/\/([^\/]+)\/(.+)$/;
      const match = url.match(cloudRegex);
      
      if (!match) {
        console.debug('云存储链接格式不匹配:', url);
        return url;
      }
      
      // 提取环境ID和文件路径
      const cloudEnvInfo = match[1]; // nkuwiki-xxxx.6e6b-nkuwiki-xxxx-1234567890
      const filePath = match[2]; // path/to/file.jpg
      
      // 分解环境信息以获取完整的环境ID部分
      const parts = cloudEnvInfo.split('.');
      let envId = cloudEnvInfo;
      
      if (parts.length > 1) {
        // 如果包含.，取第二部分作为环境ID
        envId = parts[1];
      }
      
      // 构建https访问链接
      const result = `https://${envId}.tcb.qcloud.la/${filePath}`;
      console.debug('解析后的云存储链接:', result);
      return result;
    } catch (err) {
      console.debug('解析云存储链接出错:', err);
      return url;
    }
  }
  
  // 对于相对路径，添加基础URL
  if (url.startsWith('/')) {
    return `${getAPIConfig().base_url}${url}`;
  }
  
  return url;
};

/**
 * 解析图片URL数组
 * @param {Array|string} url - 图片URL数组或JSON字符串
 * @returns {Array} - 处理后的图片URL数组
 */
const parseImageUrl = url => {
  let imageArray = [];
  
  // 尝试解析JSON字符串
  if (typeof url === 'string') {
    try {
      imageArray = JSON.parse(url);
    } catch (e) {
      console.debug('解析图片URL失败:', e);
      return [];
    }
  } else if (Array.isArray(url)) {
    imageArray = url;
  }
  
  // 处理每个URL
  return imageArray.map(u => parseUrl(u)).filter(Boolean);
};

module.exports = {
  // 日期时间
  formatTime,
  formatNumber,
  formatRelativeTime,
  
  // 系统信息
  getSystemInfo,
  
  // 存储操作
  storage,
  
  // UI操作
  ui,
  ToastType,
  
  // 导航操作
  nav,
  
  // 错误处理
  error,
  ErrorType,
  
  // HTTP请求
  get,
  post,
  
  // API客户端工厂
  createApiClient,
  createStreamApiClient,
  
  // 工具函数
  debounce,
  throttle,
  isEmptyObject,
  isValidArray,
  parseJsonField,
  getAppInfo,
  getUserProfile,
  getSystemInfo,
  getOpenID,
  parseUrl,
  parseImageUrl
}

/**
 * 流式API客户端使用示例：
 * 
 * // 引入工具库
 * const { createStreamApiClient } = require('../utils/util');
 * 
 * // 创建Agent API客户端（支持流式响应）
 * const agentApi = createStreamApiClient('/api/agent', {
 *   chat: { method: 'POST', path: '/chat', params: { openid: true, message: true } }
 * });
 * 
 * // 在页面中使用
 * Page({
 *   data: {
 *     messages: [],
 *     currentMessage: ''
 *   },
 *   
 *   onLoad() {
 *     // 页面初始化逻辑
 *   },
 *   
 *   // 发送消息
 *   async sendMessage() {
 *     const { messages } = this.data;
 *     const userMessage = {
 *       role: 'user',
 *       content: this.data.currentMessage
 *     };
 *     
 *     // 添加用户消息
 *     messages.push(userMessage);
 *     this.setData({ 
 *       messages,
 *       currentMessage: '' 
 *     });
 *     
 *     // 添加AI消息占位
 *     const aiMessage = {
 *       role: 'assistant',
 *       content: ''
 *     };
 *     messages.push(aiMessage);
 *     this.setData({ messages });
 *     
 *     // 发起流式请求
 *     agentApi.chat(
 *       { message: userMessage.content }, 
 *       {
 *         // 处理流式数据块
 *         onMessage: (chunks) => {
 *           chunks.forEach(chunk => {
 *             aiMessage.content += chunk;
 *             this.setData({ messages });
 *           });
 *         },
 *         // 处理请求完成
 *         onComplete: (chunks) => {
 *           if (chunks && chunks.length) {
 *             chunks.forEach(chunk => {
 *               aiMessage.content += chunk;
 *             });
 *             this.setData({ messages });
 *           }
 *           console.debug('流式响应完成');
 *         },
 *         // 处理错误
 *         onError: (error) => {
 *           console.debug('流式请求出错:', error);
 *           aiMessage.content = '对话出错，请稍后再试';
 *           this.setData({ messages });
 *         }
 *       }
 *     );
 *   }
 * });
 */
