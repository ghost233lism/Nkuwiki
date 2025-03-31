/**
 * 评论相关API封装
 */

const request = require('../request');

/**
 * 创建评论
 * @param {Object} commentData - 评论数据
 * @returns {Promise} - 返回Promise对象
 */
async function createComment(commentData) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentData.post_id) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    if (!commentData.content && (!commentData.images || commentData.images.length === 0)) {
      return {
        success: false,
        message: '评论内容不能为空'
      };
    }
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 准备评论数据
    const data = {
      ...commentData,
      openid,
      nick_name: userInfo.nick_name,
      avatar: userInfo.avatar
    };
    
    // 更新API路径
    const result = await request.post('/api/wxapp/comment', data);
    
    return {
      success: result.data.code === 200,
      data: result.data.data,
      message: result.data.details?.message || '评论成功'
    };
  } catch (err) {
    console.error('发表评论失败:', err);
    return {
      success: false,
      message: '发表评论失败: ' + (err.message || '未知错误')
    };
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
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    // 准备评论数据
    const data = {
      ...commentData,
      comment_id: commentId,
      openid
    };
    
    // 更新API路径和参数
    const result = await request.post('/api/wxapp/comment/update', data);
    
    return {
      success: result.data.code === 200,
      data: result.data.data,
      message: result.data.details?.message || '更新成功'
    };
  } catch (err) {
    console.error('更新评论失败:', err);
    return {
      success: false,
      message: '更新评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 删除评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function deleteComment(commentId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    // 更新API路径和参数
    const result = await request.post('/api/wxapp/comment/delete', {
      comment_id: commentId,
      openid
    });
    
    return {
      success: result.data.code === 200,
      message: result.data.details?.message || '删除成功'
    };
  } catch (err) {
    console.error('删除评论失败:', err);
    return {
      success: false,
      message: '删除评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 点赞评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function likeComment(commentId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    // 更新API路径和参数
    const result = await request.post('/api/wxapp/comment/like', {
      comment_id: commentId,
      openid
    });
    
    return {
      success: result.data.code === 200,
      data: result.data.data,
      message: result.data.details?.message || '点赞成功'
    };
  } catch (err) {
    console.error('点赞评论失败:', err);
    return {
      success: false,
      message: '点赞评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消点赞评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function unlikeComment(commentId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    // 更新API路径和参数
    const result = await request.post('/api/wxapp/comment/unlike', {
      comment_id: commentId,
      openid
    });
    
    return {
      success: true,
      message: result.data.message || '取消点赞成功',
      liked: false,
      like_count: result.data.like_count,
      comment_id: result.data.comment_id,
      action: 'unlike'
    };
  } catch (err) {
    console.error('取消点赞评论失败:', err);
    return {
      success: false,
      message: '取消点赞评论失败: ' + (err.message || '未知错误')
    };
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
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    // 更新API路径和参数
    const result = await request.get('/api/wxapp/comment/detail', {
      comment_id: commentId
    });
    
    return {
      success: true,
      comment: result.data
    };
  } catch (err) {
    console.error('获取评论详情失败:', err);
    return {
      success: false,
      message: '获取评论详情失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取评论列表
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getCommentList(params = {}) {
  try {
    // 提取查询参数
    const { 
      post_id,
      limit = 20, 
      offset = 0,
      order_by = 'create_time DESC' 
    } = params;
    
    if (!post_id) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 构建查询参数
    const queryParams = {
      post_id,
      limit,
      offset,
      order_by
    };
    
    // 获取评论列表
    const result = await request.get('/api/wxapp/comment/list', queryParams);
    
    return {
      success: true,
      comments: result.data.data,
      pagination: result.data.pagination
    };
  } catch (err) {
    console.error('获取评论列表失败:', err);
    return {
      success: false,
      message: '获取评论列表失败: ' + (err.message || '未知错误')
    };
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