/**
 * 帖子相关API封装
 */

const { get, post, API_PREFIXES, processResponse } = require('../request');
const { 
  safeParseJSON,
  processPostData,
  getStorage,
} = require('../util');

/** 
 * 获取帖子列表
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getPostList(params = {}) {
  try {
    const result = await get(API_PREFIXES.wxapp + '/post/list', params);
    
    // 处理每个帖子的数据
    if (result.data) {
      const posts = Array.isArray(result.data) ? result.data : [];
      const processedPosts = posts.map(post => processPostData(post));
      result.data = processedPosts;
    }
    
    return result;
  } catch (err) {
    console.error('获取帖子列表失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取帖子列表失败',
      data: [],
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取帖子详情
 * @param {string} postId - 帖子ID
 * @param {boolean} updateView - 是否更新浏览量
 * @returns {Promise} - 返回Promise对象
 */
async function getPostDetail(postId, updateView = true) {
  try {
    if (!postId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '帖子ID不能为空' }
      });
    }
    
    const result = await get(API_PREFIXES.wxapp + '/post/detail', { 
      post_id: postId,
      update_view: updateView 
    });
    
    if (result.data) {
      result.data = processPostData(result.data);
    }
    
    return result;
  } catch (err) {
    console.error('获取帖子详情失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取帖子详情失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取帖子评论列表
 * @param {number} postId - 帖子ID
 * @param {object} params - 请求参数
 * @returns {Promise} 评论列表
 */
async function getPostCommentList(postId, params = {}) {
  try {
    console.debug(`获取帖子评论列表，参数: postId=${postId}`, params);
    
    const result = await get(API_PREFIXES.wxapp + '/comment/list', {
      post_id: postId,
      limit: params.limit || 20,
      offset: params.offset || 0,
      ...params
    });
    
    console.debug('评论列表API响应:', result);
    
    return result;
  } catch (err) {
    console.error('获取评论列表失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取评论列表失败',
      data: [],
      details: { 
        message: err.message || '未知错误',
        pagination: {
          total: 0,
          limit: params.limit || 20,
          offset: params.offset || 0,
          has_more: false
        }
      }
    });
  }
}

/**
 * 创建帖子
 * @param {Object} postData - 帖子数据
 * @returns {Promise} - 返回Promise对象
 */
async function createPost(postData) {
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
    
    // 获取用户信息
    const userInfo = getStorage('userInfo') || {};
    
    // 检查必要字段
    if (!postData.title) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '帖子标题不能为空' }
      });
    }
    
    if (!postData.content) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '帖子内容不能为空' }
      });
    }
    
    // 准备帖子数据，确保符合API要求的格式
    const data = {
      openid,
      title: postData.title,
      content: postData.content,
      image: postData.image || [],
      tag: postData.tag || [],
      category_id: postData.category_id || 0,
      location: postData.location || null,
      nickname: userInfo.nickName,
      avatar: userInfo.avatarUrl
    };
    
    return await post(API_PREFIXES.wxapp + '/post', data);
  } catch (err) {
    console.error('创建帖子失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '创建帖子失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 更新帖子
 * @param {Object} data - 要更新的帖子数据
 * @returns {Promise} - 返回Promise对象
 */
async function updatePost(data) {
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
    
    if (!data.post_id) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '缺少帖子ID' }
      });
    }
    
    // 确保有openid
    data.openid = openid;
    
    console.debug('更新帖子:', data);
    
    return await post(API_PREFIXES.wxapp + '/post/update', data);
  } catch (err) {
    console.error('更新帖子失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '更新帖子失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 删除帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function deletePost(postId) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }
    
    console.debug('删除帖子:', { postId, openid });
    
    const result = await post(API_PREFIXES.wxapp + '/post/delete', { post_id: postId, openid });
    
    return {
      success: result.success,
      message: result.message || '删除成功'
    };
  } catch (err) {
    console.error('删除帖子失败:', err);
    return {
      success: false,
      message: '删除帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 收藏帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function favoritePost(postId) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const response = await post(API_PREFIXES.wxapp + '/post/favorite', { post_id: postId, openid });
    
    console.log('收藏API原始响应:', response);
    
    if (response && response.success) {
      const favoriteCount = response.details?.favorite_count;
      const status = response.details?.status || '';
      console.log('API返回的收藏数量:', favoriteCount, '状态:', status);
      
      if (status === 'already_favorited') {
        return {
          success: false,
          message: '已经收藏，请勿重复收藏',
          favorited: true
        };
      }
      
      return {
        success: true,
        message: '收藏成功',
        favorited: true,
        favorite_count: favoriteCount
      };
    } else {
      return {
        success: false,
        message: response?.message || '收藏失败'
      };
    }
  } catch (err) {
    console.error('收藏操作失败:', err);
    return {
      success: false,
      message: '收藏操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消收藏帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function unfavoritePost(postId) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const response = await post(API_PREFIXES.wxapp + '/post/unfavorite', { post_id: postId, openid });
    
    console.log('取消收藏API原始响应:', response);
    
    if (response && response.success) {
      const favoriteCount = response.details?.favorite_count;
      const status = response.details?.status || '';
      console.log('API返回的收藏数量:', favoriteCount, '状态:', status);
      
      return {
        success: true,
        message: '取消收藏成功',
        favorited: false,
        favorite_count: favoriteCount
      };
    } else {
      return {
        success: false,
        message: response?.message || '取消收藏失败'
      };
    }
  } catch (err) {
    console.error('取消收藏操作失败:', err);
    return {
      success: false,
      message: '取消收藏操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户发布的帖子
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid
 * @param {boolean} params.countOnly - 是否只获取数量
 * @param {boolean} params.includePostData - 是否包含帖子详细数据
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise} - 返回Promise对象
 */
async function getUserPost(params = {}) {
  try {
    // 优先使用传入的openid，否则从存储中获取
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      throw new Error('未提供openid且未登录');
    }
    
    console.debug('获取用户帖子:', { openid, params });
    
    // 构建请求参数 - 包含openid用于筛选
    const requestParams = {
      openid: openid,
      limit: params.pageSize || 10,
      offset: ((params.page || 1) - 1) * (params.pageSize || 10)
    };
    
    const result = await get(API_PREFIXES.wxapp + '/post/list', requestParams);
    console.debug('获取用户帖子列表成功:', result);
    
    // 如果只需要数量
    if (params.countOnly) {
      return {
        success: true,
        data: {
          count: result.data.total || 0
        },
        message: '获取帖子数量成功'
      };
    } else {
      return {
        success: true,
        data: {
          post: result.data.post || [],
          total: result.data.total || 0
        },
        message: '获取帖子列表成功'
      };
    }
  } catch (err) {
    console.error('获取用户帖子失败:', err);
    return {
      success: false,
      message: '获取用户帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 点赞/取消点赞帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function likePost(postId) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const response = await post(API_PREFIXES.wxapp + '/post/like', {
      post_id: postId,
      openid: openid
    });
    
    console.log('点赞API原始响应:', response);
    
    if (response && response.success) {
      const likeCount = response.details?.like_count;
      console.log('API返回的点赞数量:', likeCount);
      
      return {
        success: true,
        message: '点赞成功',
        liked: true,
        like_count: likeCount
      };
    } else if (response && !response.success && response.message && response.message.includes('已经点赞')) {
      return {
        success: false,
        message: '已经点赞，请勿重复点赞',
        liked: true
      };
    } else {
      return {
        success: false,
        message: response?.message || '点赞失败'
      };
    }
  } catch (err) {
    console.error('点赞操作失败:', err);
    return {
      success: false,
      message: '点赞操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消点赞帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function unlikePost(postId) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const result = await post(API_PREFIXES.wxapp + '/post/unlike', {
      post_id: postId,
      openid
    });
    
    return result;
  } catch (err) {
    console.error('取消点赞操作失败:', err);
    return {
      success: false,
      message: '取消点赞操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取帖子状态（点赞、收藏等）
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function getPostStatus(postId) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const result = await get(API_PREFIXES.wxapp + '/post/status', {
      post_id: postId,
      openid
    });
    
    return result;
  } catch (err) {
    console.error('获取帖子状态失败:', err);
    return {
      success: false,
      message: '获取帖子状态失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 创建评论
 * @param {Object} commentData - 评论数据
 * @returns {Promise} - 返回Promise对象
 */
async function createComment(commentData) {
  try {
    if (!commentData.post_id) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    if (!commentData.content || commentData.content.trim() === '') {
      return {
        success: false,
        message: '评论内容不能为空'
      };
    }
    
    console.debug('开始提交评论，数据:', JSON.stringify(commentData));
    
    const result = await post(API_PREFIXES.wxapp + '/comment', commentData);
    
    console.debug('评论API返回结果:', JSON.stringify(result));
    
    if (!result || !result.success) {
      console.error('评论API返回失败:', result?.message);
      return {
        success: false,
        message: result?.message || '评论失败'
      };
    }
    
    return {
      success: true,
      comment: result.data,
      message: '评论成功',
      details: result.details
    };
  } catch (err) {
    console.error('创建评论失败:', err);
    return {
      success: false,
      message: '创建评论失败: ' + (err.message || '未知错误')
    };
  }
}

// 导出所有帖子相关API方法
module.exports = {
  getPostList,
  getPostDetail,
  getPostCommentList,
  createPost,
  updatePost,
  deletePost,
  favoritePost,
  unfavoritePost,
  getUserPost,
  likePost,
  unlikePost,
  getPostStatus,
  createComment
}; 