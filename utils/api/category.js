/**
 * 分类和标签相关API封装
 */

const request = require('../request');

/**
 * 获取分类列表
 * @returns {Promise} - 返回Promise对象
 */
async function getCategories() {
  try {
    const result = await request.get('/api/wxapp/categories');
    
    return result;
  } catch (err) {
    console.error('获取分类列表失败:', err);
    return {
      success: false,
      message: '获取分类列表失败: ' + (err.message || '未知错误')
    };
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
      return {
        success: false,
        message: '分类ID不能为空'
      };
    }
    
    const result = await request.get(`/api/wxapp/categories/${categoryId}`);
    
    return result;
  } catch (err) {
    console.error('获取分类详情失败:', err);
    return {
      success: false,
      message: '获取分类详情失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取热门标签列表
 * @param {number} limit - 限制返回数量
 * @returns {Promise} - 返回Promise对象
 */
async function getHotTags(limit = 20) {
  try {
    const result = await request.get(`/api/wxapp/tags/hot?limit=${limit}`);
    
    return result;
  } catch (err) {
    console.error('获取热门标签失败:', err);
    return {
      success: false,
      message: '获取热门标签失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 搜索标签
 * @param {string} keyword - 搜索关键词
 * @param {number} limit - 限制返回数量
 * @returns {Promise} - 返回Promise对象
 */
async function searchTags(keyword, limit = 10) {
  try {
    if (!keyword) {
      return {
        success: false,
        message: '搜索关键词不能为空'
      };
    }
    
    const result = await request.get(`/api/wxapp/tags/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
    
    return result;
  } catch (err) {
    console.error('搜索标签失败:', err);
    return {
      success: false,
      message: '搜索标签失败: ' + (err.message || '未知错误')
    };
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
      return {
        success: false,
        message: '标签ID不能为空'
      };
    }
    
    const result = await request.get(`/api/wxapp/tags/${tagId}`);
    
    return result;
  } catch (err) {
    console.error('获取标签详情失败:', err);
    return {
      success: false,
      message: '获取标签详情失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 关注标签
 * @param {string} tagId - 标签ID
 * @returns {Promise} - 返回Promise对象
 */
async function followTag(tagId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!tagId) {
      return {
        success: false,
        message: '标签ID不能为空'
      };
    }
    
    const result = await request.post(`/api/wxapp/tags/${tagId}/follow`, { openid });
    
    return result;
  } catch (err) {
    console.error('关注标签失败:', err);
    return {
      success: false,
      message: '关注标签失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消关注标签
 * @param {string} tagId - 标签ID
 * @returns {Promise} - 返回Promise对象
 */
async function unfollowTag(tagId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!tagId) {
      return {
        success: false,
        message: '标签ID不能为空'
      };
    }
    
    const result = await request.post(`/api/wxapp/tags/${tagId}/unfollow`, { openid });
    
    return result;
  } catch (err) {
    console.error('取消关注标签失败:', err);
    return {
      success: false,
      message: '取消关注标签失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  getCategories,
  getCategoryDetail,
  getHotTags,
  searchTags,
  getTagDetail,
  followTag,
  unfollowTag
}; 