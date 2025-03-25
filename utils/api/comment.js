// comment.js
// 评论相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

/**
 * 评论API模块
 */
const commentAPI = {
  /**
   * 创建评论
   * @param {Object} commentData - 评论数据
   * @returns {Promise} - 请求Promise
   */
  createComment: (commentData) => {
    // 从commentData中提取openid，并移除它
    let openid = '';
    if (commentData.openid) {
      openid = commentData.openid;
      delete commentData.openid; // 从请求体中移除
    } else if (userManager && typeof userManager.getOpenid === 'function') {
      openid = userManager.getOpenid() || '';
    }
    
    if (!openid) {
      logger.error('缺少必需的openid参数');
      return Promise.reject(new Error('缺少必需的openid参数'));
    }
    
    // 确保只发送后端支持的字段
    const safeCommentData = {
      post_id: commentData.post_id,
      nick_name: commentData.nick_name,
      avatar: commentData.avatar,
      content: commentData.content,
      parent_id: commentData.parent_id || null,
      images: commentData.images || []
    };
    
    logger.debug('创建评论请求体:', JSON.stringify(safeCommentData));
    logger.debug('创建评论openid (查询参数):', openid);
    
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'POST',
      data: safeCommentData,
      params: { openid } // 将openid添加到URL查询参数
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
   * @param {Object} [params] - 查询参数（当第一个参数为帖子ID时使用）
   * @param {number} [params.limit=20] - 返回记录数量限制
   * @param {number} [params.offset=0] - 分页偏移量
   * @param {string} [params.order_by="create_time DESC"] - 排序方式
   * @returns {Promise} - 请求Promise
   */
  getComments: (postIdOrParams = {}, params = {}) => {
    // 判断是否直接传入了帖子ID
    if (typeof postIdOrParams === 'string' || typeof postIdOrParams === 'number') {
      return request({
        url: `${API.PREFIX.WXAPP}/posts/${postIdOrParams}/comments`,
        method: 'GET',
        params: params
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
    const allowedFields = ['content', 'images', 'status', 'extra'];
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
   * @param {boolean} isLike - 是否点赞，true为点赞，false为取消点赞
   * @returns {Promise} - 请求Promise
   */
  likeComment: (commentId, isLike = true) => {
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('likeComment: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }
    
    const openid = userInfo.openid;
    
    // 根据isLike确定请求URL和方法
    const url = isLike 
      ? `${API.PREFIX.WXAPP}/comments/${commentId}/like` 
      : `${API.PREFIX.WXAPP}/comments/${commentId}/unlike`;
    
    // 根据API文档，两种操作都使用POST方法
    const method = 'POST';
    
    logger.debug(`${isLike ? '点赞' : '取消点赞'}评论，ID: ${commentId}, 用户: ${openid}`);
    
    return request({
      url: url,
      method: method,
      params: { openid }, // 将openid移到查询参数
      data: {} // 空请求体
    }).then(res => {
      logger.debug(`${isLike ? '点赞' : '取消点赞'}评论结果:`, JSON.stringify(res));
      
      // 处理标准API响应格式
      let responseData = res;
      
      // 标准API响应格式: { code: 200, message: "success", data: {...}, details: null, timestamp: "..." }
      if (res && res.code === 200 && res.data) {
        logger.debug('收到标准API响应格式');
        responseData = res.data;
      }
      
      // 提取最终点赞状态和点赞数
      let isLikedFinal = isLike;
      let likeCount = null;
      
      // 从API响应中提取数据
      if (responseData) {
        if (responseData.liked !== undefined) {
          isLikedFinal = !!responseData.liked;
        }
        if (responseData.like_count !== undefined) {
          likeCount = responseData.like_count;
        }
      }
      
      // 更新评论缓存状态
      try {
        // 尝试更新评论缓存(如果有的话)
        const cache = getApp()?.globalData?._commentCache || {};
        if (cache[commentId]) {
          cache[commentId].is_liked = isLikedFinal;
          if (likeCount !== null) {
            cache[commentId].like_count = likeCount;
          }
          logger.debug('评论缓存已更新');
        }
      } catch (cacheError) {
        logger.error('更新评论缓存失败:', cacheError);
      }
      
      return res;
    }).catch(err => {
      logger.error(`${isLike ? '点赞' : '取消点赞'}评论失败:`, err);
      throw err;
    });
  },

  /**
   * 添加评论（别名方法，内部调用createComment）
   * @param {Object} params - 评论参数
   * @param {string} params.post_id - 帖子ID
   * @param {string} params.content - 评论内容
   * @param {string} [params.parent_id] - 父评论ID（回复时使用）
   * @param {string} [params.openid] - 用户openid，不传则使用当前用户
   * @param {Array} [params.images] - 图片列表
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
    
    // 构建请求体，注意将openid从请求体移除，将作为URL参数传递
    const data = {
      post_id, // 确保post_id在请求体中
      content,
      // 添加用户昵称和头像，后端可能会使用
      nick_name: userInfo.nick_name || userInfo.nickName || '用户',
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
    
    logger.debug('添加评论，请求体:', JSON.stringify(data));
    logger.debug('添加评论，openid (查询参数):', openid);
    
    return request({
      url: `${API.PREFIX.WXAPP}/comments`,
      method: 'POST',
      data,
      params: { openid }, // 将openid作为查询参数
      showError: true
    }).then(res => {
      logger.debug('评论API响应成功:', JSON.stringify(res));
      
      // 操作完成后，通知全局数据需要更新
      const app = getApp();
      if (app && app.globalData) {
        // 如果有帖子ID，更新该帖子的评论计数
        if (post_id) {
          notifyPostCommentUpdate(post_id);
        }
      }
      
      return res;
    }).catch(error => {
      logger.error('评论API请求失败:', error);
      throw error;
    });
  },

  /**
   * 获取用户评论列表
   * @param {string} openid - 用户openid
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserComments: (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo ? userInfo.openid : '';
    }
    
    if (!openid) {
      return Promise.reject(new Error('缺少用户openid'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/comments`,
      method: 'GET',
      params: params
    });
  },

  /**
   * 举报评论
   * @param {number} commentId - 评论ID
   * @param {string} reason - 举报原因
   * @returns {Promise} - 请求Promise
   */
  reportComment: (commentId, reason) => {
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('reportComment: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }
    
    const openid = userInfo.openid;
    
    if (!commentId) {
      logger.error('reportComment: 缺少评论ID');
      return Promise.reject(new Error('缺少评论ID'));
    }
    
    if (!reason) {
      logger.error('reportComment: 缺少举报原因');
      return Promise.reject(new Error('缺少举报原因'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/comments/${commentId}/report`,
      method: 'POST',
      data: { reason },
      params: { openid } // 将openid移到查询参数
    });
  },
  
  /**
   * 搜索评论
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 搜索关键词
   * @param {number} [params.page=1] - 页码
   * @param {number} [params.page_size=10] - 每页结果数
   * @returns {Promise} - 请求Promise
   */
  searchComments: (params) => {
    if (!params || !params.keyword) {
      return Promise.reject(new Error('缺少搜索关键词'));
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/search/comments`,
      method: 'GET',
      params: params
    }).catch(err => {
      logger.error('搜索评论失败:', err);
      return {
        comments: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 10
      };
    });
  }
};

/**
 * 通知帖子评论数更新
 * @param {string|number} postId - 帖子ID
 */
function notifyPostCommentUpdate(postId) {
  try {
    const app = getApp();
    if (app && app.globalData) {
      // 存储最新操作结果
      if (!app.globalData.postUpdates) {
        app.globalData.postUpdates = {};
      }
      
      // 如果之前已经有对这个帖子的更新，合并数据
      const existingUpdate = app.globalData.postUpdates[postId] || {};
      const newCommentCount = (existingUpdate.comment_count || 0) + 1;
      
      logger.debug('更新全局评论数据，帖子ID:', postId, '新评论数:', newCommentCount);
      
      app.globalData.postUpdates[postId] = {
        ...existingUpdate,
        id: postId,
        comment_count: newCommentCount,
        updateTime: Date.now()
      };
      
      // 设置需要更新的标志
      app.globalData.needUpdatePosts = true;
      
      // 通知页面需要刷新
      if (typeof app.notifyPagesUpdate === 'function') {
        app.notifyPagesUpdate();
      }
    }
  } catch (error) {
    logger.error('通知帖子评论更新失败:', error);
  }
}

module.exports = commentAPI; 