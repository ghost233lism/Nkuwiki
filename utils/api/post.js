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
   * 获取帖子实时更新数据（点赞数、收藏数、评论数）
   * @param {string|string[]} postIds - 单个帖子ID或ID数组
   * @returns {Promise} - 包含最新数据的Promise
   */
  getPostUpdates: (postIds) => {
    // 支持单个ID或ID数组
    const ids = Array.isArray(postIds) ? postIds : [postIds];
    
    if (!ids.length) {
      return Promise.resolve([]);
    }
    
    logger.debug('获取帖子更新数据，IDs:', ids);
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts/stats`,
      method: 'GET',
      params: { ids: ids.join(',') },
      showError: false
    }).then(res => {
      // 处理不同的响应格式
      if (Array.isArray(res)) {
        return res;
      } else if (res && Array.isArray(res.data)) {
        return res.data;
      } else if (res && res.stats && Array.isArray(res.stats)) {
        return res.stats;
      }
      // 如果是单个ID请求，且响应不是数组，构造数组返回
      else if (typeof res === 'object' && res.id) {
        return [res];
      }
      return [];
    }).catch(err => {
      logger.error('获取帖子更新数据失败:', err);
      return [];
    });
  },

  /**
   * 点赞/取消点赞帖子
   * @param {String} postId 帖子ID
   * @param {Boolean} isLike 是否点赞 (true:点赞, false:取消点赞)
   */
  likePost: async function(postId, isLike = true) {
    const openid = userManager.getOpenid();
    if (!openid) {
      logger.error('likePost: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }

    if (!postId) {
      logger.error('likePost: 缺少帖子ID');
      return Promise.reject(new Error('缺少帖子ID'));
    }

    logger.debug(`用户${openid}${isLike ? '点赞' : '取消点赞'}帖子${postId}`);

    // 构建请求URL
    const action = isLike ? 'like' : 'unlike';
    const url = `${API.PREFIX.WXAPP}/posts/${postId}/${action}`;
    
    try {
      const res = await request({
        url,
        method: 'POST',
        data: { openid }
      });
      
      logger.debug(`${isLike ? '点赞' : '取消点赞'}结果:`, JSON.stringify(res));
      
      // 通知全局的帖子更新事件
      const app = getApp();
      if (app && app.globalData) {
        // 更新帖子点赞状态
        const updatedPost = { _id: postId, isLiked: isLike };
        this.notifyPostUpdate(updatedPost);
      }
      
      return res;
    } catch (err) {
      logger.error(`${isLike ? '点赞' : '取消点赞'}失败:`, err);
      throw err;
    }
  },

  /**
   * 收藏帖子
   * @param {number|string} postId - 帖子ID
   * @param {boolean|string} isFavoriteOrOpenid - 是否收藏(布尔值)或用户openid(字符串)
   * @param {boolean} [isFavorite] - 是否收藏，true为收藏，false为取消收藏，仅在第二个参数为openid时使用
   * @returns {Promise} - 请求Promise
   */
  favoritePost: (postId, isFavoriteOrOpenid, isFavorite) => {
    // 处理两种调用方式
    let openid;
    let shouldFavorite = true;
    
    // 根据参数类型判断调用方式
    if (typeof isFavoriteOrOpenid === 'boolean') {
      // 新的调用方式: favoritePost(postId, isFavorite)
      shouldFavorite = isFavoriteOrOpenid;
      // 获取当前用户openid
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    } else if (typeof isFavoriteOrOpenid === 'string') {
      // 旧的调用方式: favoritePost(postId, openid, isFavorite)
      openid = isFavoriteOrOpenid;
      shouldFavorite = isFavorite !== undefined ? isFavorite : true;
    } else {
      // 如果未提供，尝试获取当前用户
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    logger.info('收藏操作，帖子ID:', postId, '用户openid:', openid, '操作:', shouldFavorite ? '收藏' : '取消收藏');
    
    // 根据shouldFavorite确定请求URL
    const url = shouldFavorite 
      ? `${API.PREFIX.WXAPP}/posts/${postId}/favorite` 
      : `${API.PREFIX.WXAPP}/posts/${postId}/unfavorite`;
    
    return request({
      url: url,
      method: 'POST',
      params: { openid },
      success: (res) => {
        // 确保响应中包含收藏数
        if (res && res.data && typeof res.data === 'object') {
          if (res.data.favorite_count === undefined && res.data.favoriteCount !== undefined) {
            res.data.favorite_count = res.data.favoriteCount;
          }
        }
        logger.info('收藏API响应成功:', JSON.stringify(res));
        return res;
      }
    }).then(res => {
      // 操作完成后，通知全局事件系统
      const app = getApp();
      if (app && app.globalData) {
        // 存储最新操作结果
        if (!app.globalData.postUpdates) {
          app.globalData.postUpdates = {};
        }
        
        // 如果之前已经有对这个帖子的更新，合并数据
        const existingUpdate = app.globalData.postUpdates[postId] || {};
        
        app.globalData.postUpdates[postId] = {
          ...existingUpdate,
          id: postId,
          isFavorited: shouldFavorite,
          favorite_count: res.favorite_count || res.favoriteCount,
          updateTime: Date.now()
        };
        
        // 设置需要更新的标志
        app.globalData.needUpdatePosts = true;
        
        // 立即通知页面更新，不等待下一次同步
        if (typeof app.notifyPagesUpdate === 'function') {
          logger.info('调用notifyPagesUpdate通知页面更新收藏状态');
          app.notifyPagesUpdate();
        } else {
          logger.error('notifyPagesUpdate方法不存在或不可用');
        }
      } else {
        logger.error('获取app实例或globalData失败');
      }
      
      return res;
    }).catch(error => {
      logger.error('收藏API请求失败:', error);
      throw error;
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