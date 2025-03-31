/**
 * 帖子相关API封装
 */

const request = require('../request');

/**
 * 获取帖子列表
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getPostList(params = {}) {
  try {
    // 提取查询参数
    const { 
      page = 1,
      pageSize = 20,
      openid,
      category_id,
      tag,
      status = 1,
      order_by = 'update_time DESC'
    } = params;
    
    // 构建查询参数
    const queryParams = {
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
    
    // 添加可选参数
    if (openid) queryParams.openid = openid;
    if (category_id) queryParams.category_id = category_id;
    if (tag) queryParams.tag = tag;
    if (status !== undefined) queryParams.status = status;
    if (order_by) queryParams.order_by = order_by;
    
    // 更新API路径
    const result = await request.get('/api/wxapp/post/list', queryParams);
    
    // 确保返回的格式符合预期
    return {
      success: true,
      data: result.data || [],
      pagination: result.pagination || {
        total: 0,
        page,
        page_size: pageSize
      },
      message: result.message || '获取帖子列表成功'
    };
  } catch (err) {
    console.error('获取帖子列表失败:', err);
    return {
      success: false,
      message: '获取帖子列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取帖子详情
 * @param {string} postId - 帖子ID
 * @param {boolean} updateView - 是否更新浏览量
 * @returns {Promise} - 返回Promise对象
 */
async function getPostDetail(postId, updateView = true) {
  try {
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 更新API路径和参数
    const result = await request.get('/api/wxapp/post/detail', { 
      post_id: postId,
      update_view: updateView 
    });
    
    return result;
  } catch (err) {
    console.error('获取帖子详情失败:', err);
    return {
      success: false,
      message: '获取帖子详情失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取帖子评论列表
 * @param {string} postId - 帖子ID
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getPostCommentList(postId, params = {}) {
  try {
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 提取查询参数
    const { 
      page = 1, 
      pageSize = 20,
      parent_id,
      sort_by
    } = params;
    
    // 构建查询参数
    const queryParams = {
      post_id: postId,
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
    
    if (parent_id !== undefined) queryParams.parent_id = parent_id;
    if (sort_by) queryParams.sort_by = sort_by;
    
    // 使用正确的API接口路径
    const result = await request.get('/api/wxapp/comment/list', queryParams);
    
    return {
      success: true,
      comment: result.data.data || [],
      total: result.data.pagination?.total || 0,
      limit: result.data.pagination?.limit || pageSize,
      offset: result.data.pagination?.offset || ((page - 1) * pageSize)
    };
  } catch (err) {
    console.error('获取评论列表失败:', err);
    return {
      success: false,
      message: '获取评论列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 创建帖子
 * @param {Object} postData - 帖子数据
 * @returns {Promise} - 返回Promise对象
 */
async function createPost(postData) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 检查必要字段
    if (!postData.title) {
      throw new Error('帖子标题不能为空');
    }
    
    if (!postData.content) {
      throw new Error('帖子内容不能为空');
    }
    
    // 准备帖子数据，确保符合API要求的格式
    const data = {
      openid,
      title: postData.title,
      content: postData.content,
      image: postData.image || [],
      tag: postData.tag || [],
      category_id: postData.category_id || 0,
      location: postData.location || null,
      nickname: userInfo.nickName,
      avatar: userInfo.avatarUrl
    };
    
    // 调用API
    const result = await request.post('/api/wxapp/post', data);
    
    return {
      success: result.success,
      post_id: result.data?.post_id,
      message: result.message || '创建帖子成功'
    };
  } catch (err) {
    console.error('创建帖子失败:', err);
    return {
      success: false,
      message: '创建帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 更新帖子
 * @param {Object} data - 要更新的帖子数据
 * @returns {Promise} - 返回Promise对象
 */
async function updatePost(data) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!data.post_id) {
      throw new Error('缺少帖子ID');
    }
    
    // 确保有openid
    data.openid = openid;
    
    console.debug('更新帖子:', data);
    
    // 调用API
    const result = await request.post('/api/wxapp/post/update', data);
    
    return {
      success: result.success,
      post: result.data,
      message: result.message || '更新成功'
    };
  } catch (err) {
    console.error('更新帖子失败:', err);
    return {
      success: false,
      message: '更新帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 删除帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function deletePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }
    
    console.debug('删除帖子:', { postId, openid });
    
    // 将DELETE请求改为POST请求
    const result = await request.post(`/api/wxapp/post/delete`, { post_id: postId, openid });
    
    return {
      success: result.success,
      message: result.message || '删除成功'
    };
  } catch (err) {
    console.error('删除帖子失败:', err);
    return {
      success: false,
      message: '删除帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 收藏帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function favoritePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const response = await request.post(`/api/wxapp/post/favorite`, { post_id: postId, openid });
    
    console.log('收藏API原始响应:', response);
    
    // 处理后端返回的数据
    if (response && response.success) {
      // 收藏成功情况
      const favoriteCount = response.details?.favorite_count;
      const status = response.details?.status || '';
      console.log('API返回的收藏数量:', favoriteCount, '状态:', status);
      
      // 检查是否是"已经收藏"的情况
      if (status === 'already_favorited') {
        return {
          success: false,
          message: '已经收藏，请勿重复收藏',
          favorited: true
        };
      }
      
      return {
        success: true,
        message: '收藏成功',
        favorited: true,
        favorite_count: favoriteCount
      };
    } else {
      return {
        success: false,
        message: response?.message || '收藏失败'
      };
    }
  } catch (err) {
    console.error('收藏操作失败:', err);
    return {
      success: false,
      message: '收藏操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消收藏帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function unfavoritePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const response = await request.post(`/api/wxapp/post/unfavorite`, { post_id: postId, openid });
    
    console.log('取消收藏API原始响应:', response);
    
    if (response && response.success) {
      // 取消收藏成功
      const favoriteCount = response.details?.favorite_count;
      const status = response.details?.status || '';
      console.log('API返回的收藏数量:', favoriteCount, '状态:', status);
      
      return {
        success: true,
        message: '取消收藏成功',
        favorited: false,
        favorite_count: favoriteCount
      };
    } else {
      return {
        success: false,
        message: response?.message || '取消收藏失败'
      };
    }
  } catch (err) {
    console.error('取消收藏操作失败:', err);
    return {
      success: false,
      message: '取消收藏操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户发布的帖子
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid
 * @param {boolean} params.countOnly - 是否只获取数量
 * @param {boolean} params.includePostData - 是否包含帖子详细数据
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise} - 返回Promise对象
 */
async function getUserPost(params = {}) {
  try {
    // 优先使用传入的openid，否则从存储中获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('未提供openid且未登录');
    }
    
    console.debug('获取用户帖子:', { openid, params });
    
    // 构建请求参数 - 包含openid用于筛选
    const requestParams = {
      openid: openid,
      limit: params.pageSize || 10,
      offset: ((params.page || 1) - 1) * (params.pageSize || 10)
    };
    
    // 修正API路径为 /api/wxapp/post/list 
    const result = await request.get('/api/wxapp/post/list', requestParams);
    console.debug('获取用户帖子列表成功:', result);
    
    // 如果只需要数量
    if (params.countOnly) {
      return {
        success: true,
        data: {
          count: result.data.total || 0
        },
        message: '获取帖子数量成功'
      };
    } else {
      return {
        success: true,
        data: {
          post: result.data.post || [],
          total: result.data.total || 0
        },
        message: '获取帖子列表成功'
      };
    }
  } catch (err) {
    console.error('获取用户帖子失败:', err);
    return {
      success: false,
      message: '获取用户帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 点赞/取消点赞帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function likePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 确保按照API文档发送正确的参数格式
    const response = await request.post('/api/wxapp/post/like', {
      post_id: postId,
      openid: openid
    });
    
    console.log('点赞API原始响应:', response);
    
    // API返回格式：
    // { success: true, data: [数据], message: '提示消息' }
    // 或者错误: { success: false, message: '错误消息' }
    
    if (response && response.success) {
      // 点赞成功情况
      // 检查details中的like_count
      const likeCount = response.details?.like_count;
      console.log('API返回的点赞数量:', likeCount);
      
      return {
        success: true,
        message: '点赞成功',
        liked: true,
        like_count: likeCount
      };
    } else if (response && !response.success && response.message && response.message.includes('已经点赞')) {
      // 已经点赞的情况
      return {
        success: false,
        message: '已经点赞，请勿重复点赞',
        liked: true
      };
    } else {
      return {
        success: false,
        message: response?.message || '点赞失败'
      };
    }
  } catch (err) {
    console.error('点赞操作失败:', err);
    return {
      success: false,
      message: '点赞操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消点赞帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function unlikePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 更新API路径和参数
    const result = await request.post('/api/wxapp/post/unlike', {
      post_id: postId,
      openid
    });
    
    return result;
  } catch (err) {
    console.error('取消点赞操作失败:', err);
    return {
      success: false,
      message: '取消点赞操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取帖子状态（点赞、收藏等）
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function getPostStatus(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 调用API获取帖子状态
    const result = await request.get('/api/wxapp/post/status', {
      post_id: postId,
      openid
    });
    
    return result;
  } catch (err) {
    console.error('获取帖子状态失败:', err);
    return {
      success: false,
      message: '获取帖子状态失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 创建评论
 * @param {Object} commentData - 评论数据
 * @returns {Promise} - 返回Promise对象
 */
async function createComment(commentData) {
  try {
    if (!commentData.post_id) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    if (!commentData.content || commentData.content.trim() === '') {
      return {
        success: false,
        message: '评论内容不能为空'
      };
    }
    
    const result = await request.post('/api/wxapp/comment', commentData);
    
    return {
      success: true,
      comment: result.data,
      message: '评论成功'
    };
  } catch (err) {
    console.error('创建评论失败:', err);
    return {
      success: false,
      message: '创建评论失败: ' + (err.message || '未知错误')
    };
  }
}

// 导出所有帖子相关API方法
module.exports = {
  getPostList,
  getPostDetail,
  getPostCommentList,
  createPost,
  updatePost,
  deletePost,
  favoritePost,
  unfavoritePost,
  getUserPost,
  likePost,
  unlikePost,
  getPostStatus,
  createComment
}; 