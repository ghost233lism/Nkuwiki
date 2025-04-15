/**
 * 通用工具函数集合
 */
const config = {
  defaultAvatar: 'cloud://cloud1-7gu881ir0a233c29.636c-cloud1-7gu881ir0a233c29-1352978573/avatar1.png',
  cloudEnv: 'cloud1-7gu881ir0a233c29',
  version: '0.0.1',
  API_CONFIG: {
    base_url: 'https://nkuwiki.com',
    api_prefix: '/api',
    prefixes: {wxapp: '/wxapp', agent: '/agent'},
    headers: {'Content-Type': 'application/json'}
  },
  // 添加日志级别配置
  LOG_LEVEL: {
    DEBUG: 4,
    INFO: 3, 
    WARN: 2,
    ERROR: 1,
    NONE: 0
  },
  // 设置当前日志级别 - 生产环境可以设置为INFO或更低
  currentLogLevel: 2  // WARN级别，只输出警告和错误
}

// 日志函数，根据级别决定是否输出
function log(level, ...args) {
  const { LOG_LEVEL, currentLogLevel } = config;
  
  if (level <= currentLogLevel) {
    switch(level) {
      case LOG_LEVEL.ERROR:
        console.error(...args);
        break;
      case LOG_LEVEL.WARN:
        console.warn(...args);
        break;
      case LOG_LEVEL.INFO:
        console.info(...args);
        break;
      case LOG_LEVEL.DEBUG:
        console.debug(...args);
        break;
      default:
        // 不输出
        break;
    }
  }
}

// 导出日志函数
const logger = {
  debug: (...args) => log(config.LOG_LEVEL.DEBUG, ...args),
  info: (...args) => log(config.LOG_LEVEL.INFO, ...args),
  warn: (...args) => log(config.LOG_LEVEL.WARN, ...args),
  error: (...args) => log(config.LOG_LEVEL.ERROR, ...args),
  // 设置日志级别
  setLevel: (level) => {
    if (typeof level === 'number' && level >= 0 && level <= 4) {
      config.currentLogLevel = level;
    }
  }
};

async function init() {
  storage.set('defaultAvatar', config.defaultAvatar);
  storage.set('cloudEnv', config.cloudEnv);
  storage.set('API_CONFIG', config.API_CONFIG);
  if (!wx.cloud) {
    logger.debug('请使用 2.2.3 或以上的基础库以使用云能力');
  } else {
    wx.cloud.init({
      env: storage.get('cloudEnv'),
      traceUser: true
    });
  }
  storage.set('API_CONFIG', storage.get('API_CONFIG'));
  const systemInfo = getSystemInfo();
  storage.set('systemInfo', systemInfo);
  // 并行执行三个异步操作
  const results = await Promise.all([
    getAboutInfo().catch(err => {
      logger.debug('获取关于信息出错:', err);
      return null;
    }),
    getUserProfile().catch(err => {
      logger.debug('获取用户信息出错:', err);
      return null;
    }),
    getOpenID().catch(err => {
      logger.debug('获取OPENID出错:', err);
      return null;
    })
  ]);
  
  const [aboutInfo, userProfile, openid] = results;
  
  // 处理获取到的数据
  if (aboutInfo) {
    storage.set('aboutInfo', aboutInfo);
  }
  
  if (userProfile) {
    storage.set('userInfo', userProfile);
  }
  
  if (openid) {
    storage.set('openid', openid);
  }
  
  // 返回所有获取的信息
  return {
    aboutInfo,
    userProfile,
    openid
  };
}
/**
 * 获取关于信息
 * @returns {Promise<Object>} 关于信息
 */
const getAboutInfo = async () => {
  const aboutApi = createApiClient('/api/wxapp', {about: {method: 'GET', path: '/about'}});
  try {
    const res = await aboutApi.about();
    if (res.code === 200) {
      return res.data;
    } else {
      return null;
    }
  } catch (err) {
    return null;
  }
};

/**
 * 获取App信息（兼容函数，同getAboutInfo）
 * @returns {Promise<Object>} App信息
 */
const getAppInfo = async () => {
  return getAboutInfo();
};

/**
 * 获取微信用户信息
 * @returns {Promise<Object>} 用户信息
 */
const getUserProfile = () => {
  return new Promise((resolve) => {
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
        resolve(null);
      }
    });
  });
};

/**
 * 获取openid
 * @returns {Promise<String>} openid
 */
const getOpenID = async () => {
  const openid = storage.get('openid');
  if (openid) {
    return openid; 
  }
  try {
    if (!wx.cloud) {
      return null;
    }
    // 添加await确保获取到结果
    const res = await wx.cloud.callFunction({ name: 'getOpenID' });
    if (res.result && res.result.code === 200) {
      const openid = res.result.data?.openid;
      if (openid) {
        return openid;
      }
    } else {
      return null;
    }
  } catch (err) {
    return null;
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
const get = async (apiUrl, requestData = {}) => {
  const openid = storage.get('openid')
  if (!apiUrl) {
    return Promise.reject({ code: -1, message: '未指定API路径' })
  }
  
  let requestUrl = `${storage.get('API_CONFIG').base_url}${apiUrl}`
  if (Object.keys(requestData).length) {
    const queryParams = Object.entries(requestData)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    requestUrl += `${apiUrl.includes('?') ? '&' : '?'}${queryParams}`
  }
  
  // 使用高级别日志，生产环境不会输出
  logger.debug('GET请求:', requestUrl)
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method: 'GET',
      header: {
        ...storage.get('API_CONFIG').headers,
        ...(openid ? {'X-User-OpenID': openid} : {})
      },
      success(res) {
        // 使用高级别日志，生产环境不会输出
        logger.debug('GET响应:', res.data)
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
        // 使用警告级别，生产环境会输出
        logger.warn('GET请求失败:', err)
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
  const apiUrl = finalUrl.startsWith(storage.get('API_CONFIG').api_prefix) ? finalUrl : storage.get('API_CONFIG').api_prefix + finalUrl
  const requestUrl = `${storage.get('API_CONFIG').base_url}${apiUrl}`
  
  const requestData = { ...data }
  if (openid && !requestData.openid) {
    requestData.openid = openid
  }
  
  // 使用高级别日志，生产环境不会输出
  logger.debug('POST请求:', requestUrl, requestData)
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method: 'POST',
      data: requestData,
      header: {
        ...storage.get('API_CONFIG').headers,
        ...(openid ? {'X-User-OpenID': openid} : {})
      },
      success(res) {
        // 使用高级别日志，生产环境不会输出
        logger.debug('POST响应:', res.data)
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
        // 使用警告级别，生产环境会输出
        logger.warn('POST请求失败:', err)
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
          if (openid && typeof openid === 'string') {
            data.openid = openid;
          }
          // 如果不存在且是必要参数，下面的必填参数验证会捕获这个错误
        } else if (data.openid && typeof data.openid !== 'string') {
          // 确保 openid 是字符串类型
          console.debug('openid 参数不是字符串类型，将尝试转换');
          // 如果是对象，尝试从 storage 获取
          data.openid = storage.get('openid') || '';
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
 */
const { createChunkRes } = require('./chunkUtil');

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
          if (openid && typeof openid === 'string') {
            data.openid = openid;
          }
        } else if (data.openid && typeof data.openid !== 'string') {
          // 确保 openid 是字符串类型
          console.debug('流式请求: openid 参数不是字符串类型，将尝试转换');
          // 如果是对象，尝试从 storage 获取
          data.openid = storage.get('openid') || '';
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
      const chunkRes = createChunkRes();
      
      // 准备请求数据
      const openid = storage.get('openid');
      const finalUrl = url.startsWith('/') ? url : '/' + url;
      const apiUrl = finalUrl.startsWith(storage.get('API_CONFIG').api_prefix) ? finalUrl : storage.get('API_CONFIG').api_prefix + finalUrl;
      
      let requestUrl = `${storage.get('API_CONFIG').base_url}${apiUrl}`;
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
          ...storage.get('API_CONFIG').headers,
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
  // 初始化
  init,

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
  getUserProfile,
  getSystemInfo,
  getOpenID,
  parseUrl,
  parseImageUrl,
  getAboutInfo,
  getAppInfo,
  
  // 日志工具
  logger
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
