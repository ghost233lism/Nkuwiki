// comment.js
// 评论相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

const commentAPI = {
  /**
   * 创建评论
   * @param {Object} commentData - 评论数据
   * @returns {Promise} - 请求Promise
   */
  createComment: (commentData) => {
    // 确保只发送后端支持的字段
    const safeCommentData = {
      post_id: commentData.post_id,
      openid: commentData.openid,
      nick_name: commentData.nick_name,
      avatar: commentData.avatar,
      content: commentData.content,
      parent_id: commentData.parent_id || null,
      images: commentData.images || []
    };
    
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'POST',
      data: safeCommentData
    });
  },

  /**
   * 获取评论详情
   * @param {number} commentId - 评论ID
   * @returns {Promise} - 请求Promise
   */
  getCommentDetail: (commentId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`,
      method: 'GET'
    });
  },

  /**
   * 获取评论列表
   * @param {number|Object} postIdOrParams - 帖子ID或查询参数
   * @returns {Promise} - 请求Promise
   */
  getComments: (postIdOrParams = {}) => {
    // 判断是否直接传入了帖子ID
    if (typeof postIdOrParams === 'string' || typeof postIdOrParams === 'number') {
      return request({
        url: `${API.PREFIX.WXAPP}/posts/${postIdOrParams}/comments`,
        method: 'GET'
      });
    }
    
    // 查询所有评论
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'GET',
      params: postIdOrParams
    });
  },

  /**
   * 更新评论
   * @param {number} commentId - 评论ID
   * @param {Object} commentData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updateComment: (commentId, commentData) => {
    // 确保只更新允许的字段
    const allowedFields = ['content', 'images', 'status'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (commentData[field] !== undefined) {
        updateData[field] = commentData[field];
      }
    });
    
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`,
      method: 'PUT',
      data: updateData
    });
  },

  /**
   * 删除评论
   * @param {number} commentId - 评论ID
   * @returns {Promise} - 请求Promise
   */
  deleteComment: (commentId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`,
      method: 'DELETE'
    });
  },

  /**
   * 点赞评论
   * @param {number} commentId - 评论ID
   * @param {string} openid - 用户openid
   * @param {boolean} isLike - 是否点赞，true为点赞，false为取消点赞
   * @returns {Promise} - 请求Promise
   */
  likeComment: (commentId, openid, isLike = true) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}/like`,
      method: 'POST',
      params: { openid, is_like: isLike }
    });
  }
};

module.exports = commentAPI; 