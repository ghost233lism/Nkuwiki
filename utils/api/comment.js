// comment.js
// 评论相关API

const { API, logger, request } = require('./core');

const commentAPI = {
  /**
   * 创建评论
   * @param {Object} commentData - 评论数据
   * @returns {Promise} - 请求Promise
   */
  createComment: (commentData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'POST',
      data: commentData
    });
  },

  /**
   * 获取评论详情
   * @param {number} commentId - 评论ID
   * @returns {Promise} - 请求Promise
   */
  getCommentDetail: (commentId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`
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
    
    // 否则按照原有逻辑查询所有评论
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'GET',
      params: postIdOrParams,  // 使用params而不是data
      data: {}
    });
  },

  /**
   * 更新评论
   * @param {number} commentId - 评论ID
   * @param {Object} commentData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updateComment: (commentId, commentData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}`,
      method: 'PUT',
      data: commentData
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
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  likeComment: (commentId, userId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}/like`,
      method: 'POST',
      data: { userId }
    });
  },

  /**
   * 取消点赞评论
   * @param {number} commentId - 评论ID
   * @param {number} userId - 用户ID
   * @returns {Promise} - 请求Promise
   */
  unlikeComment: (commentId, userId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}/unlike`,
      method: 'POST',
      data: { userId }
    });
  }
};

module.exports = commentAPI; 