// post.js
// 帖子相关API

const { API, logger, request } = require('./core');

const postAPI = {
  /**
   * 创建帖子
   * @param {Object} postData - 帖子数据
   * @returns {Promise} - 请求Promise
   */
  createPost: (postData) => {
    // 确保只发送后端支持的字段，并根据API文档调整
    const safePostData = {
      user_id: postData.user_id,
      title: postData.title,
      content: postData.content,
      images: postData.images,
      tags: postData.tags || [],
      // 添加API文档中提到的可选字段
      category_id: postData.category_id || null,
      location: postData.location || '',
      
      // 保留这些字段，因为后端可能需要，虽然API文档未提及
      wxapp_id: postData.wxapp_id,
      author_name: postData.author_name,
      author_avatar: postData.author_avatar,
      is_public: postData.is_public !== undefined ? postData.is_public : true,
      allow_comment: postData.allow_comment !== undefined ? postData.allow_comment : true
    };
    
    logger.debug('准备创建帖子，数据:', JSON.stringify(safePostData));
    
    // 包装请求，添加错误处理
    return new Promise((resolve, reject) => {
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'POST',
        data: safePostData,
        showError: false
      })
      .then(result => {
        logger.debug('创建帖子成功:', JSON.stringify(result));
        resolve(result);
      })
      .catch(error => {
        logger.error('创建帖子失败:', error);
        
        // 尝试检测是否是字段不匹配问题
        const errorStr = error.message || JSON.stringify(error);
        if (errorStr.includes('Unknown column') || errorStr.includes('42S22')) {
          logger.warn('检测到字段不匹配错误，可能是数据库结构与前端不一致');
          // 返回一个带有错误信息的对象而不是抛出异常
          resolve({
            success: false,
            error: '数据库字段不匹配，请联系管理员更新数据库结构',
            details: errorStr
          });
        } else {
          // 其他错误，也返回对象而不是异常
          resolve({
            success: false,
            error: '创建帖子失败',
            details: errorStr
          });
        }
      });
    });
  },

  /**
   * 获取帖子详情
   * @param {number} postId - 帖子ID 
   * @returns {Promise} - 请求Promise
   */
  getPostDetail: (postId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`
    });
  },

  /**
   * 获取帖子列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getPosts: (params = {}) => {
    return new Promise((resolve, reject) => {
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'GET',
        params: params, // 使用params参数，以查询参数形式传递
        data: {},  // data置为空对象
        showError: false // 不显示错误提示
      })
        .then(res => {
          // 正常返回数据
          logger.debug('获取帖子成功', res);
          resolve(res);
        })
        .catch(err => {
          logger.error('获取帖子列表失败:', err);
          
          // 返回空数据，避免前端崩溃
          resolve({ 
            data: [], 
            success: true, 
            error: err.message 
          });
        });
    });
  },

  /**
   * 更新帖子
   * @param {number} postId - 帖子ID
   * @param {Object} postData - 更新数据
   * @returns {Promise} - 请求Promise
   */
  updatePost: (postId, postData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}`,
      method: 'PUT',
      data: postData
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
   * @param {boolean} isLike - 是否点赞，true为点赞，false为取消点赞
   * @returns {Promise} - 请求Promise
   */
  likePost: (postId, isLike) => {
    const userManager = require('../user_manager');
    const userInfo = userManager.getUserInfoForAPI();
    const userId = userInfo.id;
    
    logger.debug('点赞操作，帖子ID:', postId, '用户ID:', userId, '操作:', isLike ? '点赞' : '取消');
    
    // 使用同一个接口，后端会根据用户ID是否在点赞列表中自动判断是点赞还是取消点赞
    return request({
      url: `${API.PREFIX.WXAPP}/posts/${postId}/like`,
      method: 'POST',
      data: {},  // 不在请求体中传递user_id
      params: { user_id: userId }  // 作为URL查询参数传递
    });
  },

  /**
   * 收藏帖子
   * @param {number} postId - 帖子ID
   * @param {boolean} isFavorite - 是否收藏，true为收藏，false为取消收藏
   * @returns {Promise} - 请求Promise
   */
  favoritePost: (postId, isFavorite) => {
    const userManager = require('../user_manager');
    const userInfo = userManager.getUserInfoForAPI();
    const userId = userInfo.id;
    
    logger.debug('收藏操作，帖子ID:', postId, '用户ID:', userId, '操作:', isFavorite ? '收藏' : '取消');
    
    // 检查是否有favorite接口
    const url = `${API.PREFIX.WXAPP}/posts/${postId}/favorite`;
    
    return request({
      url,
      method: 'POST',
      data: { is_favorite: isFavorite },  // 通过请求体参数指明是收藏还是取消收藏
      params: { user_id: userId }  // 作为URL查询参数传递
    });
  },

  /**
   * 获取用户发布的帖子
   * @param {number|string} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 请求Promise
   */
  getUserPosts: (userId, params = {}) => {
    return new Promise((resolve, reject) => {
      request({
        url: `${API.PREFIX.WXAPP}/posts`,
        method: 'GET',
        params: { 
          ...params,
          user_id: userId 
        },
        data: {},
        showError: false
      })
        .then(res => {
          // 检查返回的数据是否为数组，如果不是则转换为空数组
          if (Array.isArray(res)) {
            logger.debug(`直接返回帖子数组，数量:${res.length}`);
            resolve(res);
          } else if (res && Array.isArray(res.data)) {
            logger.debug(`从res.data提取帖子数组，数量:${res.data.length}`);
            resolve(res.data);
          } else if (res && res.data && res.data.posts && Array.isArray(res.data.posts)) {
            logger.debug(`从res.data.posts提取帖子数组，数量:${res.data.posts.length}`);
            resolve(res.data.posts);
          } else {
            logger.debug('获取用户帖子返回的不是数组:', res);
            resolve([]);
          }
        })
        .catch(err => {
          logger.error('获取用户帖子失败:', err);
          // 返回空数组而不是错误，避免前端崩溃
          resolve([]);
        });
    });
  }
};

module.exports = postAPI; 