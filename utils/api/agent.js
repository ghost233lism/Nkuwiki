// agent.js
// 智能体相关API

const { API, logger, request } = require('./core');

const agentAPI = {
  /**
   * 智能体对话
   * @param {string} query - 用户问题
   * @param {Array} history - 对话历史
   * @returns {Promise} - 请求Promise
   */
  chat: (query, history = []) => {
    return request({
      url: `${API.PREFIX.AGENT}/chat`,
      method: 'POST',
      data: { query, history }
    });
  },

  /**
   * 知识搜索
   * @param {string} keyword - 搜索关键词
   * @param {number} limit - 返回数量限制
   * @returns {Promise} - 请求Promise
   */
  search: (keyword, limit = 10) => {
    return request({
      url: `${API.PREFIX.AGENT}/search`,
      method: 'POST',
      data: { keyword, limit }
    });
  },

  /**
   * 获取服务状态
   * @returns {Promise} - 请求Promise
   */
  getStatus: () => {
    return request({
      url: `${API.PREFIX.AGENT}/status`,
      method: 'GET'
    });
  }
};

module.exports = agentAPI; 