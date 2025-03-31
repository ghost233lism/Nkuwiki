/**
 * 智能体相关API封装
 */

const request = require('../request');
// 从request.js获取基础URL
const BASE_URL = request.BASE_URL;

/**
 * 与智能体聊天
 * @param {Object} params - 请求参数
 * @param {string} params.message - 用户消息
 * @param {Array} params.history - 聊天历史
 * @param {Object} options - 配置选项
 * @param {function} options.onMessage - 消息回调
 * @param {function} options.onError - 错误回调
 * @param {function} options.onComplete - 完成回调
 * @returns {Promise} - 返回Promise对象
 */
async function chatWithAgent(params = {}, options = {}) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!params.message) {
      throw new Error('消息不能为空');
    }
    
    // 准备请求数据
    const requestData = {
      openid: openid,
      message: params.message,
      history: params.history || [],
      stream: false, // 不再使用流式响应
      model: params.model || 'gpt-3.5',
      max_tokens: params.max_tokens || 2000
    };
    
    console.debug('发送聊天请求:', requestData);
    
    // 使用普通POST请求代替流式请求
    const result = await request.post('/api/agent/chat', requestData);
    
    // 如果设置了回调函数，模拟一次性回调（不再支持流式响应）
    if (options.onMessage && typeof options.onMessage === 'function') {
      options.onMessage(result.data.response || '');
    }
    
    if (options.onComplete && typeof options.onComplete === 'function') {
      options.onComplete();
    }
    
    return {
      success: true,
      message: result.data.response || '',
      sources: result.data.sources || []
    };
  } catch (err) {
    console.error('聊天请求失败:', err);
    
    if (options.onError && typeof options.onError === 'function') {
      options.onError(err);
    }
    
    return {
      success: false,
      message: '聊天请求失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 使用AI生成内容
 * @param {Object} params - 请求参数
 * @param {string} params.prompt - 提示词
 * @param {string} params.type - 生成类型
 * @param {Object} options - 配置选项
 * @param {function} options.onMessage - 消息回调
 * @param {function} options.onError - 错误回调
 * @param {function} options.onComplete - 完成回调
 * @returns {Promise} - 返回Promise对象
 */
async function generateContent(params = {}, options = {}) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!params.prompt) {
      throw new Error('提示词不能为空');
    }
    
    // 准备请求数据
    const requestData = {
      openid: openid,
      prompt: params.prompt,
      type: params.type || 'text',
      stream: false, // 不再使用流式响应
      model: params.model || 'gpt-3.5',
      max_tokens: params.max_tokens || 2000
    };
    
    console.debug('发送生成内容请求:', requestData);
    
    // 使用普通POST请求代替流式请求
    const result = await request.post('/api/agent', requestData);
    
    // 如果设置了回调函数，模拟一次性回调（不再支持流式响应）
    if (options.onMessage && typeof options.onMessage === 'function') {
      options.onMessage(result.data.content || '');
    }
    
    if (options.onComplete && typeof options.onComplete === 'function') {
      options.onComplete();
    }
    
    return {
      success: true,
      content: result.data.content || '',
      message: '生成内容成功'
    };
  } catch (err) {
    console.error('生成内容失败:', err);
    
    if (options.onError && typeof options.onError === 'function') {
      options.onError(err);
    }
    
    return {
      success: false,
      message: '生成内容失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 检索增强生成（RAG）- 基于南开Wiki平台的数据进行信息检索并生成回答
 * @param {Object} options - RAG参数
 * @param {string} options.query - 用户提问内容
 * @param {Array<string>} options.table - 要检索的数据表列表，如["wxapp_post", "website_nku", "wechat_nku"]
 * @param {number} options.max_result - 每个数据源返回的最大结果数，默认5
 * @param {string} options.format - 响应格式，支持"markdown"、"text"，默认"markdown"
 * @param {boolean} options.mock - 是否使用模拟模式，默认false
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
    
    if (!options.table || !Array.isArray(options.table) || options.table.length === 0) {
      throw new Error('table参数必须是非空数组');
    }

    // 获取用户openid
    const openid = wx.getStorageSync('openid') || '';
    
    // 构建请求参数
    const requestData = {
      query: options.query,
      openid: openid,
      table: options.table,
      max_result: options.max_result || 5,
      stream: false, // 不支持流式响应
      format: options.format || 'markdown',
      mock: options.mock !== undefined ? options.mock : false
    };

    console.debug('RAG请求参数:', requestData);

    // 使用普通POST请求
    const result = await request.post('/api/agent', requestData);
    
    if (options.onComplete && typeof options.onComplete === 'function') {
      options.onComplete();
    }
    
    return {
      success: true,
      original_query: result.data?.original_query || options.query,
      rewritten_query: result.data?.rewritten_query || options.query,
      response: result.data?.response || '',
      source: result.data?.source || [],
      suggested_question: result.data?.suggested_question || [],
      format: result.data?.format || 'markdown',
      retrieved_count: result.data?.retrieved_count || 0,
      response_time: result.data?.response_time || 0
    };
  } catch (err) {
    console.error('RAG API调用失败:', err);
    
    if (options.onError && typeof options.onError === 'function') {
      options.onError(err);
    }
    
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
      capability: result.data?.capability || [],
      format: result.data?.format || []
    };
  } catch (err) {
    console.error('获取Agent状态失败:', err);
    return {
      success: false,
      message: '获取状态失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取可用模型列表
 * @returns {Promise} - 返回Promise对象
 */
async function getModels() {
  try {
    const result = await request.get('/api/agent/models');
    
    return {
      success: true,
      models: result.data?.models || []
    };
  } catch (err) {
    console.error('获取模型列表失败:', err);
    return {
      success: false,
      message: '获取模型列表失败: ' + (err.message || '未知错误')
    };
  }
}

// 导出API方法
module.exports = {
  chatWithAgent,
  generateContent,
  rag,
  getStatus,
  getModels
};