/**
 * 智能体相关API封装
 */

const request = require('../request');
// 从request.js获取基础URL
const BASE_URL = request.BASE_URL;

/**
 * 与智能体聊天
 * @param {Object} options - 聊天参数
 * @param {string} options.query - 用户提问内容
 * @param {boolean} options.stream - 是否使用流式响应，默认false
 * @param {string} options.format - 响应格式，支持"markdown"、"text"、"html"，默认"markdown"
 * @param {string} options.bot_tag - 指定使用的机器人，默认"default"
 * @param {function} options.onMessage - 流式响应消息回调
 * @param {function} options.onError - 错误回调
 * @param {function} options.onComplete - 完成回调
 * @returns {Promise} - 返回Promise对象，非流式情况下直接返回结果，流式情况下由回调函数处理
 */
async function chat(options = {}) {
  try {
    // 确保必要参数
    if (!options.query) {
      throw new Error('query参数不能为空');
    }

    // 获取用户openid
    const openid = wx.getStorageSync('openid') || '';
    
    // 构建请求参数
    const requestData = {
      query: options.query,
      openid: openid,
      stream: options.stream !== undefined ? options.stream : false,
      format: options.format || 'markdown',
      bot_tag: options.bot_tag || 'default'
    };

    console.debug('聊天请求参数:', requestData);

    // 非流式请求
    if (!requestData.stream) {
      const result = await request.post('/api/agent/chat', requestData);
      return {
        success: true,
        message: result.data?.message || '',
        sources: result.data?.sources || [],
        format: result.data?.format || 'markdown'
      };
    } 
    // 流式请求需要通过回调处理
    else {
      if (!options.onMessage || typeof options.onMessage !== 'function') {
        throw new Error('流式请求需要提供onMessage回调函数');
      }

      // 使用流式请求方法
      const requestTask = request.streamRequest('/api/agent/chat', 'POST', requestData, {
        onMessage: options.onMessage,
        onError: options.onError,
        onComplete: options.onComplete
      });

      return {
        success: true,
        requestTask
      };
    }
  } catch (err) {
    console.error('聊天API调用失败:', err);
    return {
      success: false,
      message: '聊天失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 检索增强生成（RAG）- 基于南开Wiki平台的数据进行信息检索并生成回答
 * @param {Object} options - RAG参数
 * @param {string} options.query - 用户提问内容
 * @param {Array<string>} options.tables - 要检索的数据表列表，如["wxapp_posts", "website_nku", "wechat_nku"]
 * @param {number} options.max_results - 每个数据源返回的最大结果数，默认5
 * @param {boolean} options.stream - 是否使用流式响应，默认false
 * @param {string} options.format - 响应格式，支持"markdown"、"text"，默认"markdown"
 * @param {boolean} options.mock - 是否使用模拟模式，默认false
 * @param {function} options.onMessage - 流式响应消息回调
 * @param {function} options.onError - 错误回调
 * @param {function} options.onComplete - 完成回调
 * @returns {Promise} - 返回Promise对象
 */
async function rag(options = {}) {
  try {
    // 确保必要参数
    if (!options.query) {
      throw new Error('query参数不能为空');
    }
    
    if (!options.tables || !Array.isArray(options.tables) || options.tables.length === 0) {
      throw new Error('tables参数必须是非空数组');
    }

    // 获取用户openid
    const openid = wx.getStorageSync('openid') || '';
    
    // 构建请求参数
    const requestData = {
      query: options.query,
      openid: openid,
      tables: options.tables,
      max_results: options.max_results || 5,
      stream: options.stream !== undefined ? options.stream : false,
      format: options.format || 'markdown',
      mock: options.mock !== undefined ? options.mock : false
    };

    console.debug('RAG请求参数:', requestData);

    // 非流式请求
    if (!requestData.stream) {
      const result = await request.post('/api/agent', requestData);
      return {
        success: true,
        original_query: result.data?.original_query || options.query,
        rewritten_query: result.data?.rewritten_query || options.query,
        response: result.data?.response || '',
        sources: result.data?.sources || [],
        suggested_questions: result.data?.suggested_questions || [],
        format: result.data?.format || 'markdown',
        retrieved_count: result.data?.retrieved_count || 0,
        response_time: result.data?.response_time || 0
      };
    } 
    // 流式请求需要通过回调处理
    else {
      if (!options.onMessage && !options.onContent && !options.onSources && !options.onSuggestions) {
        throw new Error('流式请求需要提供至少一个回调函数');
      }

      // 自定义流式处理函数，处理SSE格式的事件
      const handleStreamMessage = (message) => {
        try {
          const data = typeof message === 'string' ? JSON.parse(message) : message;
          
          // 根据事件类型调用不同的回调
          switch (data.type) {
            case 'query':
              options.onQuery && options.onQuery({
                original: data.original,
                rewritten: data.rewritten
              });
              break;
            case 'content':
              options.onContent && options.onContent(data.chunk);
              break;
            case 'sources':
              options.onSources && options.onSources(data.sources);
              break;
            case 'suggested':
              options.onSuggestions && options.onSuggestions(data.questions);
              break;
            case 'done':
              options.onComplete && options.onComplete();
              break;
            case 'error':
              options.onError && options.onError(new Error(data.message || '未知错误'));
              break;
            default:
              console.debug('未知的流式事件类型:', data.type);
              // 尝试作为普通消息处理
              options.onMessage && options.onMessage(data);
          }
        } catch (e) {
          console.error('处理流式消息失败:', e);
          options.onError && options.onError(e);
        }
      };

      // 使用流式请求方法
      const requestTask = request.streamRequest('/api/agent', 'POST', requestData, {
        onMessage: handleStreamMessage,
        onError: options.onError,
        onComplete: options.onComplete
      });

      return {
        success: true,
        requestTask
      };
    }
  } catch (err) {
    console.error('RAG API调用失败:', err);
    return {
      success: false,
      message: 'RAG检索失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取Agent状态
 * @returns {Promise} - 返回Promise对象
 */
async function getStatus() {
  try {
    const result = await request.get('/api/agent/status');
    
    return {
      success: true,
      status: result.data?.status || 'unknown',
      version: result.data?.version || '',
      capabilities: result.data?.capabilities || [],
      formats: result.data?.formats || []
    };
  } catch (err) {
    console.error('获取Agent状态失败:', err);
    return {
      success: false,
      message: '获取状态失败: ' + (err.message || '未知错误')
    };
  }
}

// 旧版搜索函数，保留向下兼容
async function search(params = {}) {
  console.warn('search函数已弃用，请使用rag函数代替');
  try {
    // 确保必要参数
    if (!params.keyword) {
      throw new Error('keyword参数不能为空');
    }

    return await rag({
      query: params.keyword,
      tables: ["wxapp_post", "website_nku", "wechat_nku"],
      max_results: params.limit || 10
    });
  } catch (err) {
    console.error('搜索API调用失败:', err);
    return {
      success: false,
      message: '搜索失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  chat,
  rag,
  getStatus,
  search
}; 