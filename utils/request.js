/**
 * 后端API请求工具类
 */
const { API_CONFIG } = require('./config');

const API_BASE_URL = API_CONFIG.base_url;
const API_PREFIXES = API_CONFIG.prefixes;
const API_PREFIX = API_CONFIG.api_prefix;
const getStorage = require('./util').getStorage;

/**
 * 处理请求URL
 * @param {string} url - 接口路径
 * @returns {string} - 返回处理后的URL
 */
function processUrl(url) {
  // 确保URL以/开头
  let finalUrl = url.startsWith('/') ? url : '/' + url;
  // 添加API前缀
  if (!finalUrl.startsWith(API_PREFIX)) {
    finalUrl = API_PREFIX + finalUrl;
  }
  return finalUrl;
}

/**
 * 处理响应结果
 * @param {object} res - 响应对象
 * @returns {object} - 标准化的响应结果
 */
function processResponse(res) {
  // 如果已经是标准格式就直接返回
  if (res && typeof res === 'object' && 'code' in res && 'message' in res) {
    return res;
  }

  // 转换为标准格式
  return {
    code: res?.code || 200,
    message: res?.message || 'success',
    data: res?.data || res || null,
    details: res?.details || null,
    timestamp: res?.timestamp || new Date().toISOString()
  };
}

/**
 * 处理错误响应
 * @param {Error} err - 错误对象
 * @returns {object} - 标准化的错误响应
 */
function processError(err) {
  return {
    code: err.code || 500,
    message: err.message || 'error',
    data: null,
    details: {
      message: err.details?.message || err.message || '未知错误'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * GET请求方法
 * @param {string} url - 接口路径
 * @param {object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function get(url, params = {}) {
  const openid = getStorage('openid') || '';
  
  // 处理URL
  const finalUrl = processUrl(url);
  
  // 过滤有效的查询参数
  const validParams = { ...params };
  
  // 如果有openid但params没有，添加到params
  if (openid && !validParams.openid) {
    validParams.openid = openid;
  }
  
  // 构建查询字符串
  const queryParams = Object.entries(validParams)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  const requestUrl = queryParams ? 
    `${API_BASE_URL}${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${queryParams}` : 
    `${API_BASE_URL}${finalUrl}`;
  
  console.debug(`GET请求: ${requestUrl}`);
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method: 'GET',
      header: {
        'content-type': 'application/json',
        ...(openid ? {'X-User-OpenID': openid} : {})
      },
      success(res) {
        console.debug(`GET响应:`, res.data);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(processResponse(res.data));
        } else {
          reject(processError({
            code: res.data.code || res.statusCode,
            message: res.data.message || '请求失败',
            details: res.data.details || { message: res.data.message || '请求失败' }
          }));
        }
      },
      fail(err) {
        console.error('网络请求失败:', err);
        reject(processError({
          code: -1,
          message: '网络请求失败',
          details: { message: err.errMsg || '未知错误' }
        }));
      }
    });
  });
}

/**
 * POST请求方法
 * @param {string} url - 接口路径
 * @param {object} data - 请求数据
 * @returns {Promise} - 返回Promise对象
 */
async function post(url, data = {}) {
  const openid = wx.getStorageSync('openid') || '';
  
  // 处理URL
  const finalUrl = processUrl(url);
  
  // 如果有openid但data没有，添加到data
  const postData = { ...data };
  if (openid && !postData.openid) {
    postData.openid = openid;
  }
  
  console.debug(`POST请求: ${finalUrl}`, postData);
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${finalUrl}`,
      method: 'POST',
      data: postData,
      header: {
        'content-type': 'application/json',
        ...(openid ? {'X-User-OpenID': openid} : {})
      },
      success(res) {
        console.debug(`POST响应:`, res.data);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(processResponse(res.data));
        } else {
          reject(processError({
            code: res.data.code || res.statusCode,
            message: res.data.message || '请求失败',
            details: res.data.details || { message: res.data.message || '请求失败' }
          }));
        }
      },
      fail(err) {
        console.error('网络请求失败:', err);
        reject(processError({
          code: -1,
          message: '网络请求失败',
          details: { message: err.errMsg || '未知错误' }
        }));
      }
    });
  });
}

module.exports = {
  get,
  post,
  API_PREFIXES,
  processResponse,
  processError
}; 