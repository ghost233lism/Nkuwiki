// post.js
// 帖子相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

const postAPI = {
  /**
   * 创建帖子
   * @param {Object} postData - 帖子数据
   * @returns {Promise} - 请求Promise
   */
  createPost: (postData) => {
    // 确保只发送后端支持的字段，并根据API文档调整
    const safePostData = {
      openid: postData.openid,
      title: postData.title,
      content: postData.content,
      images: postData.images,
      tags: postData.tags || [],
      category_id: postData.category_id || null,
      location: postData.location || '',
      nick_name: postData.nick_name,
      avatar: postData.avatar
    };
    
    logger.debug('准备创建帖子，数据:', JSON.stringify(safePostData));
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts`,
      method: 'POST',
      data: safePostData,
      showError: true
    });
  },

  /**
   * 获取帖子详情
   * @param {number} postId - 帖子ID 
   * @param {boolean} updateView - 是否更新浏览量，默认true
   * @returns {Promise} - 请求Promise
   */
  getPostDetail: (postId, updateView = true) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`,
      method: 'GET',
      params: { update_view: updateView }
    });
  },

  /**
   * 获取帖子列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getPosts: (params = {}) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts`,
      method: 'GET',
      params: params
    }).catch(err => {
      logger.error('获取帖子列表失败:', err);
      // 返回空数据，避免前端崩溃
      return { 
        posts: [], 
        total: 0,
        limit: params.limit || 20,
        offset: params.offset || 0
      };
    });
  },

  /**
   * 更新帖子
   * @param {number} postId - 帖子ID
   * @param {Object} postData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updatePost: (postId, postData) => {
    // 确保只发送需要更新的字段
    const updateData = {};
    
    // API文档中允许更新的字段
    const allowedFields = [
      'title', 'content', 'images', 'tags', 
      'category_id', 'location', 'status', 'extra'
    ];
    
    // 只保留允许更新的字段
    allowedFields.forEach(field => {
      if (postData[field] !== undefined) {
        updateData[field] = postData[field];
      }
    });
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`,
      method: 'PUT',
      data: updateData
    });
  },

  /**
   * 删除帖子
   * @param {number} postId - 帖子ID
   * @returns {Promise} - 请求Promise
   */
  deletePost: (postId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`,
      method: 'DELETE'
    });
  },

  /**
   * 点赞帖子
   * @param {number} postId - 帖子ID
   * @param {string} openid - 用户openid
   * @returns {Promise} - 请求Promise
   */
  likePost: (postId, openid) => {
    if (!openid) {
      // 尝试获取当前用户
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    logger.debug('点赞操作，帖子ID:', postId, '用户openid:', openid);
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}/like`,
      method: 'POST',
      params: { openid }
    });
  },

  /**
   * 收藏帖子
   * @param {number} postId - 帖子ID
   * @param {string} openid - 用户openid
   * @param {boolean} isFavorite - 是否收藏，true为收藏，false为取消收藏
   * @returns {Promise} - 请求Promise
   */
  favoritePost: (postId, openid, isFavorite = true) => {
    if (!openid) {
      // 尝试获取当前用户
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    logger.debug('收藏操作，帖子ID:', postId, '用户openid:', openid, '操作:', isFavorite ? '收藏' : '取消');
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}/${isFavorite ? 'favorite' : 'unfavorite'}`,
      method: 'POST',
      params: { openid }
    });
  },

  /**
   * 获取帖子评论
   * @param {number} postId - 帖子ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getPostComments: (postId, params = {}) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}/comments`,
      method: 'GET',
      params: params
    });
  },

  /**
   * 获取用户发布的帖子
   * @param {string} openid - 用户openid
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserPosts: (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts`,
      method: 'GET',
      params: { ...params, openid },
      showError: false
    }).catch(err => {
      logger.error('获取用户帖子失败:', err);
      return [];
    });
  }
};

module.exports = postAPI; 