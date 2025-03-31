/**
 * 用户相关API封装
 */

const request = require('../request');
const util = require('../util');

/**
 * 用户登录/同步
 * @param {Object} userData - 用户数据
 * @returns {Promise} - 返回Promise对象
 */
async function login(userData = {}) {
  try {
    console.log('开始登录/同步用户:', userData);
    
    // 确保隐藏任何系统加载提示
    wx.hideLoading();
    
    // 获取openid，使用util中的getOpenID函数，并传入不显示loading的参数
    let openid = await util.getOpenID(false);
    console.log('获取到的openid:', openid);
    
    // 如果仍然没有openid，返回错误
    if (!openid) {
      return {
        success: false,
        code: -1,
        message: '登录失败: 无法获取用户标识',
        openid: ''
      };
    }
    
    // 准备用户数据，转换字段名以符合后端API要求
    const syncData = {
      openid: openid,
      unionid: userData.unionid || '',
      nickname: userData.nickName || '', // 转换字段名
      avatar: userData.avatarUrl || '', // 转换字段名
      gender: userData.gender || 0,
      bio: userData.bio || '',
      country: userData.country || '',
      province: userData.province || '',
      city: userData.city || '',
      language: userData.language || '',
      birthday: userData.birthday || '',
      wechatId: userData.wechatId || '',
      qqId: userData.qqId || '',
      platform: 'wxapp',
      extra: userData.extra || {}
    };
    
    console.log('开始同步用户数据:', syncData);
    
    // 调用同步用户API
    const result = await request.post('/api/wxapp/user/sync', syncData);
    console.log('用户同步结果:', result);
    
    // 即使返回用户已存在也算成功
    if (result.message === '用户已存在') {
      console.log('用户已存在，获取用户信息');
      // 获取用户信息
      const profileResult = await getProfile({ openid });
      if (profileResult.success && profileResult.data) {
        // 存储用户信息，转换为微信原生字段名
        const userInfo = {
          ...profileResult.data,
          nickName: profileResult.data.nickname, // 转换字段名
          avatarUrl: profileResult.data.avatar, // 转换字段名
        };
        wx.setStorageSync('userInfo', userInfo);
        console.log('用户信息已存储到本地');
        
        return {
          success: true,
          code: 0,
          data: userInfo,
          message: '登录成功'
        };
      }
    }
    
    // 存储用户信息
    if (result.success && result.data) {
      // 确保用户信息有默认的昵称和头像
      const userInfo = {
        ...result.data,
        nickName: result.data.nickname || '南开Wiki用户', // 转换字段名
        avatarUrl: result.data.avatar || '/assets/icons/default-avatar.png', // 转换字段名
      };
      
      // 存储更新后的用户信息
      wx.setStorageSync('userInfo', userInfo);
      console.log('处理后的用户信息已存储到本地:', userInfo);
      
      return {
        success: true,
        code: 0,
        data: userInfo,
        message: '登录成功'
      };
    }
    
    return {
      success: result.success,
      code: result.success ? 0 : -1,
      data: result.data,
      message: result.message
    };
  } catch (err) {
    console.error('登录流程出现异常:', err);
    return {
      success: false,
      code: -1,
      message: '登录失败: ' + (err.message || '未知错误'),
      openid: wx.getStorageSync('openid') || ''
    };
  }
}

/**
 * 获取用户信息
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid
 * @returns {Promise} - 返回Promise对象
 */
async function getProfile(params = {}) {
  try {
    // 如果没有提供openid，则使用本地存储的openid
    const openid = params.openid || wx.getStorageSync('openid');
    const isSelf = params.isSelf === true;
    
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    // 调用获取用户信息API
    const result = await request.get('/api/wxapp/user/profile', { openid });
    
    // 确保用户数据有默认值
    if (result.success && result.data) {
      // 如果昵称为null，设置默认昵称
      if (!result.data.nickname) {
        result.data.nickname = '南开Wiki用户';
      }
      
      // 如果头像为null，设置默认头像
      if (!result.data.avatar) {
        result.data.avatar = '/assets/icons/default-avatar.png';
      }
      
      // 设置前端需要的头像URL格式和ID字段
      result.data.avatarUrl = result.data.avatar;
      result.data._id = result.data.openid;
      
      // 如果是查询自己的信息，更新本地存储
      if (isSelf) {
        wx.setStorageSync('userInfo', result.data);
      }
    }
    
    return result;
  } catch (err) {
    console.error('获取用户信息失败:', err);
    return {
      success: false,
      message: '获取用户信息失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户列表
 * @param {Object} params - 请求参数
 * @param {number} params.limit - 返回记录数量限制，默认10
 * @param {number} params.offset - 分页偏移量，默认0
 * @returns {Promise} - 返回Promise对象
 */
async function getUserList(params = {}) {
  try {
    // 设置默认参数
    const queryParams = {
      limit: params.limit || 10,
      offset: params.offset || 0
    };
    
    // 调用获取用户列表API
    const result = await request.get('/api/wxapp/user/list', queryParams);
    
    return result;
  } catch (err) {
    console.error('获取用户列表失败:', err);
    return {
      success: false,
      message: '获取用户列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 更新用户信息
 * @param {Object} userData - 要更新的用户数据
 * @returns {Promise} - 返回Promise对象
 */
async function updateUser(userData = {}) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    console.log('更新用户信息:', userData);
    
    // 构建更新数据对象，转换字段名以符合后端API要求
    const requestData = {
      openid: openid,
      ...userData,
      // 如果有微信原生字段名，转换为后端API要求的字段名
      ...(userData.nickName && { nickname: userData.nickName }),
      ...(userData.avatarUrl && { avatar: userData.avatarUrl })
    };
    
    // 删除原始字段
    delete requestData.nickName;
    delete requestData.avatarUrl;
    
    // 确保不为空
    if (Object.keys(requestData).length <= 1) {
      return {
        success: false,
        message: '未提供任何更新数据'
      };
    }
    
    console.log('最终请求数据:', requestData);
    
    // 调用更新用户API
    const result = await request.post('/api/wxapp/user/update', requestData);
    
    if (result.success && result.data) {
      // 更新本地存储的用户信息，保持微信原生字段名
      const userInfo = wx.getStorageSync('userInfo') || {};
      const newUserInfo = {
        ...userInfo,
        ...result.data,
        nickName: result.data.nickname, // 转换字段名
        avatarUrl: result.data.avatar, // 转换字段名
      };
      wx.setStorageSync('userInfo', newUserInfo);
    }
    
    return result;
  } catch (err) {
    console.error('更新用户信息失败:', err);
    return {
      success: false,
      message: '更新用户信息失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户关注统计
 * @param {string} openid - 用户openid
 * @returns {Promise} - 返回Promise对象
 */
async function getFollowStat(openid) {
  try {
    if (!openid) {
      openid = wx.getStorageSync('openid');
      if (!openid) {
        throw new Error('缺少用户openid');
      }
    }
    
    const result = await request.get('/api/wxapp/user/follow-stat', { openid });
    
    return {
      success: true,
      follower_count: result.data.follower_count,
      follow_count: result.data.follow_count,
      message: '获取关注统计成功'
    };
  } catch (err) {
    console.error('获取关注统计失败:', err);
    return {
      success: false,
      message: '获取关注统计失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 关注用户
 * @param {string} followedId - 被关注用户的openid
 * @returns {Promise} - 返回Promise对象
 */
async function followUser(followedId) {
  try {
    const followerId = wx.getStorageSync('openid');
    if (!followerId) {
      throw new Error('用户未登录');
    }
    
    if (!followedId) {
      throw new Error('缺少被关注用户的openid');
    }
    
    const data = {
      follower_id: followerId,
      followed_id: followedId
    };
    
    const result = await request.post('/api/wxapp/user/follow', data);
    
    return {
      success: result.data.code === 200,
      data: result.data.data,
      message: result.data.details?.message || '关注成功'
    };
  } catch (err) {
    console.error('关注用户失败:', err);
    return {
      success: false,
      message: '关注用户失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消关注用户
 * @param {string} followedId - 被关注用户的openid
 * @returns {Promise} - 返回Promise对象
 */
async function unfollowUser(followedId) {
  try {
    const followerId = wx.getStorageSync('openid');
    if (!followerId) {
      throw new Error('用户未登录');
    }
    
    if (!followedId) {
      throw new Error('缺少被关注用户的openid');
    }
    
    const data = {
      follower_id: followerId,
      followed_id: followedId
    };
    
    const result = await request.post('/api/wxapp/user/unfollow', data);
    
    return {
      success: result.data.code === 200,
      data: result.data.data,
      message: result.data.details?.message || '取消关注成功'
    };
  } catch (err) {
    console.error('取消关注用户失败:', err);
    return {
      success: false,
      message: '取消关注用户失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 检查关注状态
 * @param {Object} params - 请求参数
 * @param {string} params.followedId - 被关注用户的openid
 * @param {string} params.followerId - 关注者用户的openid（可选，默认当前用户）
 * @returns {Promise} - 返回Promise对象
 */
async function checkFollow(params = {}) {
  try {
    const followerId = params.followerId || wx.getStorageSync('openid');
    if (!followerId) {
      throw new Error('缺少关注者openid');
    }
    
    if (!params.followedId) {
      throw new Error('缺少被关注用户的openid');
    }
    
    const queryParams = {
      follower_id: followerId,
      followed_id: params.followedId
    };
    
    const result = await request.get('/api/wxapp/user/check-follow', queryParams);
    
    return {
      success: true,
      is_following: result.data.is_following,
      message: '检查关注状态成功'
    };
  } catch (err) {
    console.error('检查关注状态失败:', err);
    return {
      success: false,
      message: '检查关注状态失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户关注列表
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid（可选，默认当前用户）
 * @param {number} params.limit - 返回记录数量限制，默认20
 * @param {number} params.offset - 分页偏移量，默认0
 * @returns {Promise} - 返回Promise对象
 */
async function getFollowList(params = {}) {
  try {
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const queryParams = {
      openid: openid,
      limit: params.limit || 20,
      offset: params.offset || 0
    };
    
    const result = await request.get('/api/wxapp/user/follow', queryParams);
    
    return {
      success: true,
      data: result.data.data,
      pagination: result.data.pagination,
      message: '获取关注列表成功'
    };
  } catch (err) {
    console.error('获取关注列表失败:', err);
    return {
      success: false,
      message: '获取关注列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户粉丝列表
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid（可选，默认当前用户）
 * @param {number} params.limit - 返回记录数量限制，默认20
 * @param {number} params.offset - 分页偏移量，默认0
 * @returns {Promise} - 返回Promise对象
 */
async function getFollowerList(params = {}) {
  try {
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const queryParams = {
      openid: openid,
      limit: params.limit || 20,
      offset: params.offset || 0
    };
    
    const result = await request.get('/api/wxapp/user/follower', queryParams);
    
    return {
      success: true,
      data: result.data.data,
      pagination: result.data.pagination,
      message: '获取粉丝列表成功'
    };
  } catch (err) {
    console.error('获取粉丝列表失败:', err);
    return {
      success: false,
      message: '获取粉丝列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户令牌
 * @param {string} openid - 用户openid（可选，默认当前用户）
 * @returns {Promise} - 返回Promise对象
 */
async function getToken(openid) {
  try {
    openid = openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const result = await request.get('/api/wxapp/user/token', { openid });
    
    return {
      success: true,
      token: result.data.token,
      expires_at: result.data.expires_at,
      message: '获取用户令牌成功'
    };
  } catch (err) {
    console.error('获取用户令牌失败:', err);
    return {
      success: false,
      message: '获取用户令牌失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户点赞列表
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getUserLike(params = {}) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    // 获取统计数据模式
    if (params.countOnly) {
      const result = await request.get(`/api/wxapp/users/likes/count`, { openid });
      return {
        success: true,
        count: result.data.count
      };
    } else {
      // 获取点赞列表模式
      const { page = 1, pageSize = 10 } = params;
      
      const result = await request.get(`/api/wxapp/users/likes`, { 
        openid, 
        page, 
        limit: pageSize 
      });
      
      return {
        success: true,
        likes: result.data.likes,
        total: result.data.total
      };
    }
  } catch (err) {
    console.error('获取用户点赞失败:', err);
    return {
      success: false,
      message: '获取点赞数据失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户特定帖子的点赞详情
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function getUserLikeDetail(postId) {
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
    
    const result = await request.get(`/api/wxapp/users/likes/detail`, { openid, postId });
    
    return {
      success: true,
      detail: result.data,
      isLiked: result.data && result.data.isLiked
    };
  } catch (err) {
    console.error('获取点赞详情失败:', err);
    return {
      success: false,
      message: '获取点赞详情失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 修复用户点赞数据
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function fixUserLike(params = {}) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    // 将openid作为查询参数传递，而不是请求体
    const result = await request.post(`/api/wxapp/users/likes/fix`, {
      fix_type: params.fix_type || 'all'
    }, {}, { openid });
    
    return {
      success: true,
      result: result.data,
      message: result.message || '修复成功'
    };
  } catch (err) {
    console.error('修复点赞数据失败:', err);
    return {
      success: false,
      message: '修复点赞数据失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 上传用户头像（仍需保留云函数处理）
 * @param {string} filePath - 临时文件路径
 * @returns {Promise} - 返回Promise对象
 */
async function uploadUserAvatar(filePath) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!filePath) {
      throw new Error('文件路径不能为空');
    }
    
    console.debug('开始上传用户头像:', { openid, filePath });
    
    // 上传文件到微信云存储
    const cloudPath = `avatar/${openid}_${Date.now()}.jpg`;
    
    console.debug('准备上传到云存储路径:', cloudPath);
    
    // 这部分仍使用云函数，因为涉及微信云存储
    let uploadResult;
    try {
      uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });
      console.debug('头像上传云存储成功:', uploadResult);
    } catch (cloudError) {
      console.error('上传头像到云存储失败:', cloudError);
      throw new Error('上传头像到云存储失败: ' + (cloudError.errMsg || '未知错误'));
    }
    
    if (!uploadResult || !uploadResult.fileID) {
      throw new Error('上传头像失败: 未获取到文件ID');
    }
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    console.debug('当前用户信息:', userInfo);
    
    // 调用更新用户API将头像URL更新到用户资料
    console.debug('准备更新用户头像URL:', uploadResult.fileID);
    
    // 构建更新数据对象
    const updateData = {
      openid: openid,
      avatar: uploadResult.fileID  // 服务器端使用avatar字段
    };
    
    // 调用更新用户API
    const result = await request.post('/api/wxapp/user/update', updateData);
    console.debug('更新用户头像成功:', result);
    
    // 更新本地存储的用户信息
    if (result.data) {
      const newUserInfo = {
        ...userInfo,
        avatarUrl: uploadResult.fileID, // 使用微信原生字段名
        avatar: uploadResult.fileID, // 保留后端字段名以兼容
      };
      wx.setStorageSync('userInfo', newUserInfo);
    }
    
    return {
      success: true,
      fileID: uploadResult.fileID,
      message: '头像上传成功'
    };
  } catch (err) {
    console.error('上传头像失败:', err);
    return {
      success: false,
      message: '上传头像失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户交互的帖子（点赞、收藏、评论）
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid
 * @param {string} params.type - 交互类型：like（点赞）、star/favorite（收藏）、comment（评论）
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise} - 返回Promise对象
 */
async function getUserInteractionPost(params = {}) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    const { limit = 20, offset = 0 } = params;
    let result;
    
    switch (params.type) {
      case 'like':
        // 获取用户点赞的帖子，使用帖子列表API
        result = await request.get('/api/wxapp/post/list', {
          openid: openid,
          limit: limit,
          offset: offset,
          interaction: 'liked'
        });
        break;
        
      case 'star':
      case 'favorite':
        // 获取用户收藏的帖子，使用帖子列表API
        result = await request.get('/api/wxapp/post/list', {
          openid: openid,
          limit: limit,
          offset: offset,
          interaction: 'favorited'
        });
        break;
        
      case 'comment':
        // 获取用户评论的帖子，使用评论列表API
        result = await request.get('/api/wxapp/comment', {
          openid: openid,
          limit: limit,
          offset: offset
        });
        break;
        
      default:
        throw new Error('未知的交互类型');
    }
    
    console.debug(`获取用户${params.type}帖子结果:`, result);
    
    // 处理结果
    return {
      success: true,
      post: result.data.post || [],
      total: result.data.total || 0,
      message: `获取${params.type}列表成功`
    };
  } catch (err) {
    console.error('获取用户交互帖子失败:', err);
    return {
      success: false,
      message: '获取用户交互帖子失败: ' + (err.message || '未知错误')
    };
  }
}

// 导出所有用户相关API方法
module.exports = {
  login,
  getProfile,
  getUserList,
  updateUser,
  getFollowStat,
  followUser,
  unfollowUser,
  checkFollow,
  getFollowList,
  getFollowerList,
  getToken,
  getUserLike,
  getUserLikeDetail,
  fixUserLike,
  uploadUserAvatar,
  getUserInteractionPost
}; 