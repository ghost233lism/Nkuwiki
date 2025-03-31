/**
 * 分类和标签相关API封装
 */

const { get, API_PREFIXES, processResponse } = require('../request');
const { getStorage } = require('../util');

/**
 * 获取分类列表
 * @returns {Promise} - 返回Promise对象
 */
async function getCategoryList() {
  try {
    return await get(API_PREFIXES.wxapp + '/category');
  } catch (err) {
    console.error('获取分类列表失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取分类列表失败',
      data: [],
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取分类详情
 * @param {string} categoryId - 分类ID
 * @returns {Promise} - 返回Promise对象
 */
async function getCategoryDetail(categoryId) {
  try {
    if (!categoryId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '分类ID不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + `/category/${categoryId}`);
  } catch (err) {
    console.error('获取分类详情失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取分类详情失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取热门标签列表
 * @param {number} limit - 限制返回数量
 * @returns {Promise} - 返回Promise对象
 */
async function getHotTag(limit = 20) {
  try {
    return await get(API_PREFIXES.wxapp + '/tag/hot', { limit });
  } catch (err) {
    console.error('获取热门标签失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取热门标签失败',
      data: [],
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 搜索标签
 * @param {string} keyword - 搜索关键词
 * @param {number} limit - 限制返回数量
 * @returns {Promise} - 返回Promise对象
 */
async function searchTag(keyword, limit = 10) {
  try {
    if (!keyword) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: [],
        details: { message: '搜索关键词不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + '/tag/search', { keyword, limit });
  } catch (err) {
    console.error('搜索标签失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '搜索标签失败',
      data: [],
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取标签详情
 * @param {string} tagId - 标签ID
 * @returns {Promise} - 返回Promise对象
 */
async function getTagDetail(tagId) {
  try {
    if (!tagId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '标签ID不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + `/tag/${tagId}`);
  } catch (err) {
    console.error('获取标签详情失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取标签详情失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 关注标签
 * @param {string} tagId - 标签ID
 * @returns {Promise} - 返回Promise对象
 */
async function followTag(tagId) {
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
    
    if (!tagId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '标签ID不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + `/tag/${tagId}/follow`);
  } catch (err) {
    console.error('关注标签失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '关注标签失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 取消关注标签
 * @param {string} tagId - 标签ID
 * @returns {Promise} - 返回Promise对象
 */
async function unfollowTag(tagId) {
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
    
    if (!tagId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '标签ID不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + `/tag/${tagId}/unfollow`);
  } catch (err) {
    console.error('取消关注标签失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '取消关注标签失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

module.exports = {
  getCategoryList,
  getCategoryDetail,
  getHotTag,
  searchTag,
  getTagDetail,
  followTag,
  unfollowTag
}; 