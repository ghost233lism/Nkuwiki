/**
 * 搜索相关API
 * 处理搜索查询、搜索建议、搜索历史等功能
 */

const request = require('../request');

/**
 * 综合搜索
 * @param {string} keyword - 搜索关键词
 * @param {string} searchType - 搜索类型，可选值：all(默认)、post、user
 * @param {number} page - 页码，默认1
 * @param {number} limit - 每页结果数量，默认10
 * @returns {Promise<object>} - 搜索结果
 */
function search(keyword, searchType = 'all', page = 1, limit = 10) {
  return request('/api/wxapp/search', 'GET', {}, {}, {
    keyword,
    search_type: searchType,
    page,
    limit
  });
}

/**
 * 获取搜索建议
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<object>} - 搜索建议列表
 */
function getSuggestions(keyword) {
  return request('/api/wxapp/suggestion', 'GET', {}, {}, {
    keyword
  });
}

/**
 * 获取用户搜索历史
 * @param {string} openid - 用户openid
 * @param {number} limit - 返回结果数量，默认10
 * @returns {Promise<object>} - 搜索历史列表
 */
function getSearchHistory(openid, limit = 10) {
  return request('/api/wxapp/history', 'GET', {}, {}, {
    openid,
    limit
  });
}

/**
 * 清空用户搜索历史
 * @param {string} openid - 用户openid
 * @returns {Promise<object>} - 操作结果
 */
function clearSearchHistory(openid) {
  return request('/api/wxapp/history/clear', 'POST', {
    openid
  });
}

/**
 * 获取热门搜索
 * @param {number} limit - 返回结果数量，默认10
 * @returns {Promise<object>} - 热门搜索关键词列表
 */
function getHotSearches(limit = 10) {
  return request('/api/wxapp/hot', 'GET', {}, {}, {
    limit
  });
}

module.exports = {
  search,
  getSuggestions,
  getSearchHistory,
  clearSearchHistory,
  getHotSearches
}; 