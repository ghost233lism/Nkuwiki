/**
 * 搜索相关API
 * 处理搜索查询、搜索建议、搜索历史等功能
 */

const { get, API_PREFIXES, processResponse } = require('../request');
const { getStorage } = require('../util');

/**
 * 综合搜索
 * @param {string} keyword - 搜索关键词
 * @param {string} searchType - 搜索类型，可选值：all(默认)、post、user
 * @param {number} page - 页码，默认1
 * @param {number} limit - 每页结果数量，默认10
 * @returns {Promise<object>} - 搜索结果
 */
async function search(keyword, searchType = 'all', page = 1, limit = 10) {
  try {
    if (!keyword) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: [],
        details: { message: '搜索关键词不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + '/search', {
      keyword,
      search_type: searchType,
      page,
      limit
    });
  } catch (err) {
    console.error('搜索失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '搜索失败',
      data: [],
      details: { 
        message: err.message || '未知错误',
        pagination: {
          total: 0,
          page: page,
          limit: limit,
          has_more: false
        }
      }
    });
  }
}

/**
 * 获取搜索建议
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<object>} - 搜索建议列表
 */
async function getSuggestion(keyword) {
  try {
    if (!keyword) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: [],
        details: { message: '搜索关键词不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + '/suggestion', { keyword });
  } catch (err) {
    console.error('获取搜索建议失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取搜索建议失败',
      data: [],
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取用户搜索历史
 * @param {Object} params - 请求参数
 * @param {number} params.limit - 返回结果数量，默认10
 * @returns {Promise<object>} - 搜索历史列表
 */
async function getSearchHistory(params = {}) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }
    
    const queryParams = {
      openid,
      limit: params.limit || 10
    };
    
    return await get(API_PREFIXES.wxapp + '/history', queryParams);
  } catch (err) {
    console.error('获取搜索历史失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取搜索历史失败',
      data: [],
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 清空用户搜索历史
 * @param {string} openid - 用户openid
 * @returns {Promise<object>} - 操作结果
 */
async function clearSearchHistory(openid) {
  try {
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/history/clear', {
      openid
    });
    
    return result;
  } catch (err) {
    console.error('清空搜索历史失败:', err);
    return {
      success: false,
      message: '清空搜索历史失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取热门搜索
 * @param {number} limit - 返回结果数量，默认10
 * @returns {Promise<object>} - 热门搜索关键词列表
 */
async function getHotSearch(params = {}) {
  try {
    const queryParams = {
      limit: params.limit || 10
    };
    
    const result = await get(API_PREFIXES.wxapp + '/hot', queryParams);
    
    return result;
  } catch (err) {
    console.error('获取热门搜索失败:', err);
    return {
      success: false,
      message: '获取热门搜索失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  search,
  getSuggestion,
  getSearchHistory,
  clearSearchHistory,
  getHotSearch
}; 