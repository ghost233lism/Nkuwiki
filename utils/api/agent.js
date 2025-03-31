/**
 * 智能体相关API封装
 */

const { post, get, API_PREFIXES } = require('../request');

/**
 * 与智能体聊天
 * @param {Object} params - 请求参数
 * @param {string} params.query - 用户消息
 * @param {string} params.bot_tag - 机器人标识
 * @param {boolean} params.stream - 是否使用流式响应
 * @returns {Promise} - 返回Promise对象
 */
async function chat(params = {}) {
  if (!params.query) {
    throw new Error('query参数不能为空');
  }
  
  const data = {
    query: params.query,
    bot_tag: params.bot_tag || 'default',
    stream: params.stream || false
  };
  
  return await post(API_PREFIXES.agent + '/chat', data);
}

/**
 * 检索增强生成（RAG）- 基于nkuwiki平台的数据进行检索并生成回答
 * @param {Object} params - 请求参数
 * @param {string} params.query - 用户提问
 * @param {Array<string>} params.tables - 要检索的数据表列表
 * @param {number} params.max_results - 每个数据源返回的最大结果数
 * @param {boolean} params.stream - 是否使用流式响应
 * @param {string} params.format - 返回格式
 * @returns {Promise} - 返回Promise对象
 */
async function rag(params = {}) {
  if (!params.query) {
    throw new Error('query参数不能为空');
  }
  
  if (!params.tables || !Array.isArray(params.tables) || params.tables.length === 0) {
    throw new Error('tables参数必须是非空数组');
  }
  
  const data = {
    query: params.query,
    table: params.tables,
    max_result: params.max_results || 5,
    stream: params.stream || false,
    format: params.format || 'markdown'
  };
  
  return await post(API_PREFIXES.agent + '/', data);
}

/**
 * 获取Agent状态
 * @returns {Promise} - 返回Promise对象
 */
async function getStatus() {
  return await get(API_PREFIXES.agent + '/status');
}

// 导出所有方法
module.exports = {
  chat,
  rag,
  getStatus
};