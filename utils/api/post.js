// post.js
// 帖子相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

/**
 * 帖子API模块
 */
const postAPI = {
  /**
   * 创建帖子
   * @param {Object} postData - 帖子数据
   * @returns {Promise} - 请求Promise
   */
  createPost: (postData) => {
    // 标准化帖子数据 - 适配新版API
    const safePostData = {
      // 必需字段
      title: postData.title?.trim() || '',
      content: postData.content?.trim() || '',
      
      // 媒体字段
      images: postData.images || [],
      
      // 分类和标签
      tags: postData.tags || [],
      category_id: postData.category_id || null,
      
      // 设置
      is_public: postData.is_public !== undefined ? postData.is_public : true,
      allow_comment: postData.allow_comment !== undefined ? postData.allow_comment : true,
      
      // 位置信息
      location: postData.location || '',
      
      // 兼容字段 - 会被后端API忽略但保留以兼容旧代码
      openid: postData.openid || userManager.getOpenid() || '',
      nick_name: postData.nick_name || '',
      avatar: postData.avatar || ''
    };
    
    // 参数验证
    if (!safePostData.title) {
      logger.warn('创建帖子失败: 标题不能为空');
      return Promise.reject(new Error('标题不能为空'));
    }
    
    if (!safePostData.content) {
      logger.warn('创建帖子失败: 内容不能为空');
      return Promise.reject(new Error('内容不能为空'));
    }
    
    logger.debug('准备创建帖子，标题:', safePostData.title.substring(0, 20) + (safePostData.title.length > 20 ? '...' : ''));
    
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
   * @param {number} [params.limit=20] - 返回记录数量限制
   * @param {number} [params.offset=0] - 分页偏移量
   * @param {string} [params.order_by] - 排序方式
   * @param {number} [params.category_id] - 分类ID
   * @param {number} [params.status] - 帖子状态
   * @param {string} [params.tag] - 标签
   * @param {boolean} [params.with_comments] - 是否包含评论
   * @param {boolean} [params.with_user] - 是否包含用户信息
   * @param {string} [params.openid] - 用户ID筛选
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
   * 获取帖子统计数据（点赞数、收藏数、评论数）
   * @param {string|string[]} postIds - 单个帖子ID或ID数组
   * @returns {Promise} - 包含最新数据的Promise
   */
  getPostStats: (postIds) => {
    // 支持单个ID或ID数组
    const ids = Array.isArray(postIds) ? postIds : [postIds];
    
    if (!ids.length) {
      return Promise.resolve([]);
    }
    
    logger.debug('获取帖子统计数据，IDs:', ids);
    
    return request({
      url: `${API.PREFIX.WXAPP}/posts/stats`,
      method: 'GET',
      params: { ids: ids.join(',') },
      showError: false
    }).then(res => {
      // 处理不同的响应格式
      if (Array.isArray(res)) {
        return res;
      } else if (res && Array.isArray(res.stats)) {
        return res.stats;
      } else if (res && typeof res === 'object' && res.id) {
        // 单个ID请求，构造数组返回
        return [res];
      }
      return [];
    }).catch(err => {
      logger.error('获取帖子统计数据失败:', err);
      return [];
    });
  },
  
  /**
   * 获取帖子更新数据（点赞数、收藏数、评论数）
   * 兼容旧版API，内部调用getPostStats
   * @param {string|string[]} postIds - 单个帖子ID或ID数组
   * @returns {Promise} - 包含最新数据的Promise
   */
  getPostUpdates: (postIds) => {
    return postAPI.getPostStats(postIds);
  },

  /**
   * 点赞/取消点赞帖子
   * @param {String} postId 帖子ID
   * @param {Boolean} isLike 是否点赞 (true:点赞, false:取消点赞)
   * @returns {Promise} - 请求Promise
   */
  likePost: (postId, isLike = true) => {
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('likePost: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }

    if (!postId) {
      logger.error('likePost: 缺少帖子ID');
      return Promise.reject(new Error('缺少帖子ID'));
    }

    logger.debug(`用户${userInfo.openid}${isLike ? '点赞' : '取消点赞'}帖子${postId}`);

    // 构建请求URL和方法
    const action = isLike ? 'like' : 'unlike';
    const url = `${API.PREFIX.WXAPP}/posts/${postId}/${action}`;
    const method = isLike ? 'PUT' : 'POST';
    
    return request({
      url,
      method,
      data: { openid: userInfo.openid }
    }).then(res => {
      logger.debug(`${isLike ? '点赞' : '取消点赞'}结果:`, JSON.stringify(res));
      
      // 通知全局的帖子更新事件
      const app = getApp();
      if (app && app.globalData) {
        // 更新帖子点赞状态
        const updatedPost = { id: postId, is_liked: isLike };
        notifyPostUpdate(updatedPost);
      }
      
      return res;
    }).catch(err => {
      logger.error(`${isLike ? '点赞' : '取消点赞'}失败:`, err);
      throw err;
    });
  },

  /**
   * 收藏/取消收藏帖子
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
    
    if (!openid) {
      logger.error('favoritePost: 缺少用户openid');
      return Promise.reject(new Error('缺少用户openid'));
    }
    
    logger.debug('收藏操作，帖子ID:', postId, '用户openid:', openid, '操作:', shouldFavorite ? '收藏' : '取消收藏');
    
    // 根据shouldFavorite确定请求URL和方法
    const url = shouldFavorite 
      ? `${API.PREFIX.WXAPP}/posts/${postId}/favorite` 
      : `${API.PREFIX.WXAPP}/posts/${postId}/unfavorite`;
    
    const method = shouldFavorite ? 'PUT' : 'POST';
    
    return request({
      url: url,
      method: method,
      data: { openid }
    }).then(res => {
      logger.debug('收藏API响应成功:', JSON.stringify(res));
      
      // 通知全局的帖子更新事件
      const app = getApp();
      if (app && app.globalData) {
        // 更新帖子收藏状态
        const updatedPost = { id: postId, is_favorited: shouldFavorite };
        notifyPostUpdate(updatedPost);
      }
      
      return res;
    }).catch(err => {
      logger.error('收藏API请求失败:', err);
      throw err;
    });
  },

  /**
   * 获取帖子分类列表
   * @returns {Promise} - 请求Promise
   */
  getCategories: () => {
    return request({
      url: `${API.PREFIX.WXAPP}/categories`,
      method: 'GET',
      showError: false
    }).catch(err => {
      logger.error('获取分类列表失败:', err);
      return [];
    });
  },

  /**
   * 搜索帖子
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 搜索关键词
   * @param {number} [params.page=1] - 页码
   * @param {number} [params.page_size=10] - 每页结果数
   * @param {string} [params.sort_by="relevance"] - 排序方式
   * @param {number} [params.status=1] - 帖子状态
   * @param {boolean} [params.include_deleted=false] - 是否包含已删除帖子
   * @returns {Promise} - 请求Promise
   */
  searchPosts: (params) => {
    if (!params || !params.keyword) {
      logger.error('搜索帖子缺少必要参数: keyword');
      return Promise.reject(new Error('缺少必要参数: keyword'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/search/posts`,
      method: 'GET',
      params: params
    }).catch(err => {
      logger.error('搜索帖子失败:', err);
      return {
        posts: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 10
      };
    });
  },

  /**
   * 举报帖子
   * @param {number|string} postId - 帖子ID
   * @param {Object} reportData - 举报数据
   * @param {string} reportData.reason - 举报原因
   * @param {string} [reportData.description] - 详细描述
   * @returns {Promise} - 请求Promise
   */
  reportPost: (postId, reportData) => {
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('reportPost: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }

    if (!postId) {
      logger.error('reportPost: 缺少帖子ID');
      return Promise.reject(new Error('缺少帖子ID'));
    }

    if (!reportData || !reportData.reason) {
      logger.error('reportPost: 缺少举报原因');
      return Promise.reject(new Error('缺少举报原因'));
    }

    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}/report`,
      method: 'POST',
      data: {
        ...reportData,
        openid: userInfo.openid
      }
    });
  },

  /**
   * 获取热门标签
   * @param {number} [limit=20] - 返回标签数量
   * @returns {Promise} - 请求Promise
   */
  getHotTags: (limit = 20) => {
    return request({
      url: `${API.PREFIX.WXAPP}/tags/hot`,
      method: 'GET',
      params: { limit },
      showError: false
    }).catch(err => {
      logger.error('获取热门标签失败:', err);
      return [];
    });
  }
};

/**
 * 通知帖子数据更新
 * @param {Object} postData - 帖子更新数据
 */
function notifyPostUpdate(postData) {
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.needUpdatePosts = true;
      
      // 保存最近更新的帖子数据
      if (!app.globalData.postUpdates) {
        app.globalData.postUpdates = {};
      }
      
      // 使用帖子ID作为键
      const postId = postData.id || postData._id;
      if (postId) {
        app.globalData.postUpdates[postId] = {
          ...app.globalData.postUpdates[postId],
          ...postData,
          updateTime: Date.now()
        };
      }
      
      // 更新时间戳
      app.globalData.postUpdateTimestamp = Date.now();
      
      // 通知页面需要刷新
      if (typeof app.notifyPagesUpdate === 'function') {
        app.notifyPagesUpdate();
      }
    }
  } catch (error) {
    logger.error('通知帖子更新失败:', error);
  }
}

module.exports = postAPI; 