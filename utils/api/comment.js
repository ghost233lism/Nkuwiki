/**
 * 评论相关API封装
 */

const { get, post, API_PREFIXES, processResponse } = require('../request');
const { getStorage } = require('../util');

/**
 * 创建评论
 * @param {Object} data - 评论数据 
 * @returns {Promise}
 */
async function createComment(data) {
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
        details: { message: '帖子ID不能为空' }
      });
    }
    
    if (!data.content || data.content.trim() === '') {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '评论内容不能为空' }
      });
    }
    
    // 获取本地用户信息
    const userInfo = getStorage('userInfo') || {};
    
    // 准备评论数据，确保符合API要求的格式
    const commentData = {
      openid: openid,
      post_id: data.post_id,
      content: data.content,
      parent_id: data.parent_id || null,
      nickname: userInfo.nickName || userInfo.nickname,
      avatar: userInfo.avatarUrl || userInfo.avatar,
      image: data.image || []
    };
    
    return await post(API_PREFIXES.wxapp + '/comment', commentData);
  } catch (err) {
    console.error('创建评论失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '创建评论失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 更新评论
 * @param {string} commentId - 评论ID
 * @param {Object} commentData - 评论数据
 * @returns {Promise} - 返回Promise对象
 */
async function updateComment(commentId, commentData) {
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
    
    if (!commentId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '评论ID不能为空' }
      });
    }
    
    // 准备评论数据
    const data = {
      ...commentData,
      comment_id: commentId,
      openid
    };
    
    return await post(API_PREFIXES.wxapp + '/comment/update', data);
  } catch (err) {
    console.error('更新评论失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '更新评论失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 删除评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function deleteComment(commentId) {
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
    
    if (!commentId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '评论ID不能为空' }
      });
    }
    
    return await post(API_PREFIXES.wxapp + '/comment/delete', {
      comment_id: commentId,
      openid
    });
  } catch (err) {
    console.error('删除评论失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '删除评论失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 点赞评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function likeComment(commentId) {
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
    
    if (!commentId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '评论ID不能为空' }
      });
    }
    
    return await post(API_PREFIXES.wxapp + '/comment/like', {
      comment_id: commentId,
      openid
    });
  } catch (err) {
    console.error('点赞评论失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '点赞评论失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 取消点赞评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function unlikeComment(commentId) {
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
    
    if (!commentId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '评论ID不能为空' }
      });
    }
    
    return await post(API_PREFIXES.wxapp + '/comment/unlike', {
      comment_id: commentId,
      openid
    });
  } catch (err) {
    console.error('取消点赞评论失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '取消点赞评论失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取评论详情
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function getCommentDetail(commentId) {
  try {
    if (!commentId) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '评论ID不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + '/comment/detail', { comment_id: commentId });
  } catch (err) {
    console.error('获取评论详情失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取评论详情失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取评论列表
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getCommentList(params = {}) {
  try {
    return await get(API_PREFIXES.wxapp + '/comment/list', params);
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

module.exports = {
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentDetail,
  getCommentList
}; 