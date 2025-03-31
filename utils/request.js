/**
 * 后端API请求工具类
 */

// API基础路径
const BASE_URL = 'https://nkuwiki.com';

/**
 * 封装微信请求方法
 * @param {string} url - 接口路径
 * @param {string} method - 请求方法
 * @param {object} data - 请求数据
 * @param {object} header - 请求头
 * @param {object} query - URL查询参数
 * @returns {Promise} - 返回Promise对象
 */
function request(url, method = 'GET', data = {}, header = {}, query = {}) {
  // 获取存储的openid
  const openid = wx.getStorageSync('openid') || '';
  
  // 默认请求头
  const defaultHeader = {
    'content-type': 'application/json',
  };
  
  // 若有openid则添加到请求头
  if (openid) {
    defaultHeader['X-User-OpenID'] = openid;
    
    // 如果是 GET 或 DELETE 请求，可以考虑添加openid作为查询参数
    if ((method === 'GET' || method === 'DELETE') && data && !data.openid) {
      data.openid = openid;
    }
    
    // 注意：对于PUT请求，openid通常在URL中而不是请求体，因此不在这里添加
  }

  // 合并请求头
  const finalHeader = {...defaultHeader, ...header};
  
  // 处理查询参数
  let finalUrl = url;
  if (query && Object.keys(query).length > 0) {
    const queryString = Object.keys(query)
      .filter(key => query[key] !== undefined && query[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');
    
    if (queryString) {
      finalUrl += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  // 调试输出
  console.debug(`请求: ${method} ${finalUrl}`, {
    method: method,
    url: `${BASE_URL}${finalUrl}`,
    data: data,
    header: finalHeader
  });
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${finalUrl}`,
      method,
      data,
      header: finalHeader,
      success(res) {
        console.debug(`响应: ${method} ${finalUrl}`, {
          statusCode: res.statusCode,
          data: res.data
        });
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 请求成功
          resolve(res.data);
        } else {
          // HTTP请求成功，但业务状态失败
          console.error('请求失败:', {
            url: `${BASE_URL}${finalUrl}`,
            method: method,
            requestData: data,
            statusCode: res.statusCode,
            response: res.data
          });
          reject({
            code: res.data.code || res.statusCode,
            message: res.data.message || '请求失败',
            details: res.data.details
          });
        }
      },
      fail(err) {
        // 请求失败
        console.error('网络请求失败:', {
          url: `${BASE_URL}${finalUrl}`,
          method: method,
          requestData: data,
          error: err
        });
        reject({
          code: -1,
          message: '网络请求失败: ' + (err.errMsg || '未知错误')
        });
      }
    });
  });
}

/**
 * 流式请求方法，用于处理SSE响应
 * @param {string} url - 接口路径
 * @param {string} method - 请求方法，默认POST
 * @param {object} data - 请求数据
 * @param {object} options - 配置选项
 * @param {function} options.onMessage - 消息回调
 * @param {function} options.onError - 错误回调
 * @param {function} options.onComplete - 完成回调
 * @returns {object} - 返回requestTask对象
 */
function streamRequest(url, method = 'POST', data = {}, options = {}) {
  const { onMessage, onError, onComplete } = options;
  
  // 确保回调函数存在
  if (!onMessage || typeof onMessage !== 'function') {
    throw new Error('流式请求必须提供onMessage回调函数');
  }
  
  // 获取存储的openid
  const openid = wx.getStorageSync('openid') || '';
  
  // 默认请求头
  const header = {
    'content-type': 'application/json',
    'Accept': 'text/event-stream'
  };
  
  // 若有openid则添加到请求头
  if (openid) {
    header['X-User-OpenID'] = openid;
    
    // 如果数据中没有openid，则添加
    if (data && !data.openid) {
      data.openid = openid;
    }
  }
  
  console.debug(`流式请求: ${method} ${url}`, {
    url: `${BASE_URL}${url}`,
    data: data,
    header: header
  });
  
  // 使用wx.request实现流式请求
  const requestTask = wx.request({
    url: `${BASE_URL}${url}`,
    method,
    data,
    header,
    enableChunked: true, // 启用分块传输
    responseType: 'arraybuffer',
    success(res) {
      console.debug('流式请求初始化成功');
    },
    fail(err) {
      console.error('流式请求失败:', err);
      if (onError && typeof onError === 'function') {
        onError(err);
      }
    },
    complete() {
      console.debug('流式请求完成');
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    }
  });

  // 处理数据流
  requestTask.onChunkReceived(function(res) {
    try {
      // 将二进制数据转换为字符串
      let text;
      try {
        text = new TextDecoder('utf-8').decode(new Uint8Array(res.data));
      } catch (e) {
        // 兼容旧版本微信小程序
        text = String.fromCharCode.apply(null, new Uint8Array(res.data));
      }

      // 处理SSE格式
      if (text.includes('data:')) {
        const matches = text.match(/data:\s*({.+?})/g) || [];
        for (const match of matches) {
          try {
            const jsonStr = match.replace(/^data:\s*/, '');
            const data = JSON.parse(jsonStr);
            
            if (data.content !== undefined) {
              // 处理Unicode编码
              let content = data.content;
              if (typeof content === 'string' && content.includes('\\u')) {
                try {
                  content = JSON.parse('"' + content.replace(/"/g, '\\"') + '"');
                } catch (e) {
                  console.debug('Unicode解码失败:', e);
                }
              }
              
              // 调用回调函数
              onMessage(content);
            }
            
            // 如果是最后一个数据块
            if (data.done) {
              onComplete && onComplete();
            }
          } catch (e) {
            console.debug('解析数据失败:', e);
          }
        }
      } else if (text.includes('content')) {
        // 尝试解析非标准格式
        try {
          const data = JSON.parse(text);
          if (data.content) {
            onMessage(data.content);
          }
        } catch (e) {
          console.debug('解析JSON失败:', e);
        }
      }
    } catch (error) {
      console.error('处理数据块失败:', error);
      onError && onError(error);
    }
  });

  return requestTask;
}

// 导出请求方法
module.exports = {
  // 导出基础URL
  BASE_URL,
  
  // 获取基础URL（兼容性方法）
  getBaseUrl: () => BASE_URL,
  
  // GET请求
  get: (url, data = {}, header = {}, query = {}) => request(url, 'GET', data, header, query),
  
  // POST请求
  post: (url, data = {}, header = {}, query = {}) => request(url, 'POST', data, header, query),
  
  // PUT请求
  put: (url, data = {}, header = {}, query = {}) => request(url, 'PUT', data, header, query),
  
  // DELETE请求
  delete: (url, data = {}, header = {}, query = {}) => request(url, 'DELETE', data, header, query),
  
  // 流式请求
  streamRequest,
  
  // 基础请求方法
  request
}; 