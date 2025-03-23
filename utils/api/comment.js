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
  },

  /**
   * 添加评论
   * @param {Object} params - 评论参数
   * @param {string} params.post_id - 帖子ID
   * @param {string} params.content - 评论内容
   * @param {string} [params.parent_id] - 父评论ID（回复时使用）
   * @param {string} [params.openid] - 用户openid，不传则使用当前用户
   * @returns {Promise} - 请求Promise
   */
  addComment: (params) => {
    let { post_id, content, parent_id, openid, images } = params;
    
    // 如果没有传入openid，尝试获取当前用户
    let userInfo = null;
    if (!openid) {
      userInfo = userManager.getCurrentUser();
      openid = userInfo ? userInfo.openid : '';
    }
    
    if (!post_id) {
      return Promise.reject(new Error('缺少必要参数：post_id'));
    }
    
    if (!content || content.trim() === '') {
      return Promise.reject(new Error('评论内容不能为空'));
    }
    
    if (!openid) {
      return Promise.reject(new Error('用户未登录，无法评论'));
    }
    
    // 确保获取完整的用户信息
    if (!userInfo) {
      userInfo = userManager.getCurrentUser();
    }
    
    const data = {
      post_id,
      content,
      openid,
      // 添加用户昵称和头像，后端要求这些字段
      nick_name: userInfo.nickname || userInfo.nickName || '用户',
      avatar: userInfo.avatar || userInfo.avatarUrl || '/assets/icons/default-avatar.png'
    };
    
    // 如果有父评论ID，添加到请求数据
    if (parent_id) {
      data.parent_id = parent_id;
    }
    
    // 如果有图片，添加到请求数据
    if (images && Array.isArray(images)) {
      data.images = images;
    }
    
    logger.debug('添加评论，参数:', JSON.stringify(data));
    
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'POST',
      data,
      showError: true
    }).then(res => {
      logger.info('评论API响应成功:', JSON.stringify(res));
      
      // 操作完成后，通知全局数据需要更新
      const app = getApp();
      if (app && app.globalData) {
        // 存储最新操作结果
        if (!app.globalData.postUpdates) {
          app.globalData.postUpdates = {};
        }
        
        // 如果之前已经有对这个帖子的更新，合并数据
        const existingUpdate = app.globalData.postUpdates[post_id] || {};
        const newCommentCount = (existingUpdate.comment_count || 0) + 1;
        
        logger.info('更新全局评论数据，帖子ID:', post_id, '新评论数:', newCommentCount);
        
        app.globalData.postUpdates[post_id] = {
          ...existingUpdate,
          id: post_id,
          comment_count: newCommentCount,
          updateTime: Date.now()
        };
        
        // 设置需要更新的标志
        app.globalData.needUpdatePosts = true;
        
        // 立即通知页面更新，不等待下一次同步
        if (typeof app.notifyPagesUpdate === 'function') {
          logger.info('调用notifyPagesUpdate通知页面更新评论状态');
          app.notifyPagesUpdate();
        } else {
          logger.error('notifyPagesUpdate方法不存在或不可用');
        }
      } else {
        logger.error('获取app实例或globalData失败');
      }
      
      return res;
    }).catch(error => {
      logger.error('评论API请求失败:', error);
      throw error;
    });
  }
};

module.exports = commentAPI; 