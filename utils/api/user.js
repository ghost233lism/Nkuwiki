/**
 * 用户相关API封装
 */

const { get, post, API_PREFIXES, processResponse } = require('../request');
const { getStorage, setStorage, getOpenID } = require('../util');

/**
 * 用户登录/同步
 * @param {Object} userData - 用户数据
 * @returns {Promise} - 返回Promise对象
 */
async function login(userData = {}) {
  try {
    console.debug('开始登录/同步用户:', userData);
    
    // 确保隐藏任何系统加载提示
    wx.hideLoading();
    
    // 获取openid，使用util中的getOpenID函数，并传入不显示loading的参数
    let openid = await getOpenID(false);
    console.debug('获取到的openid:', openid);
    
    // 如果仍然没有openid，返回错误
    if (!openid) {
      return processResponse({
        code: 401,
        message: '登录失败',
        data: null,
        details: { 
          message: '无法获取用户标识',
          openid: ''
        }
      });
    }
    
    // 准备用户数据，转换字段名以符合后端API要求
    const syncData = {
      openid: openid,
      unionid: userData.unionid || '',
      nickname: userData.nickname || '',
      avatar: userData.avatar || '',
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
    
    console.debug('开始同步用户数据:', syncData);
    
    // 调用同步用户API
    const result = await post(API_PREFIXES.wxapp + '/user/sync', syncData);
    console.debug('用户同步结果:', result);
    
    // 处理同步结果
    if (result.code === 200) {
      // 如果返回了用户数据，直接使用
      if (result.data) {
        const userInfo = {
          ...result.data,
          nickname: result.data.nickname || 'nkuwiki用户',
          avatar: result.data.avatar || '/assets/icons/default-avatar.png'
        };
        
        // 存储更新后的用户信息
        setStorage('userInfo', userInfo);
        console.debug('处理后的用户信息已存储到本地:', userInfo);
        
        return processResponse({
          code: 200,
          message: '登录成功',
          data: userInfo
        });
      }
      
      // 如果没有返回用户数据，获取用户信息
      console.debug('同步成功，获取用户信息');
      return await getProfile({ openid, isSelf: true });
    }
    
    // 如果同步失败
    return result;
  } catch (err) {
    console.error('登录流程出现异常:', err);
    return processResponse({
      code: err.code || 500,
      message: '登录失败',
      data: null,
      details: { 
        message: err.message || '未知错误',
        openid: getStorage('openid') || ''
      }
    });
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
    const openid = params.openid || getStorage('openid');
    const isSelf = params.isSelf === true;
    
    if (!openid) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '缺少用户openid' }
      });
    }
    
    // 调用获取用户信息API
    const result = await get(API_PREFIXES.wxapp + '/user/profile', { openid });
    
    // 确保用户数据有默认值
    if (result.code === 200 && result.data) {
      // 如果昵称为null，设置默认昵称
      if (!result.data.nickname) {
        result.data.nickname = 'nkuwiki用户';
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
        setStorage('userInfo', result.data);
      }
    }
    
    return result;
  } catch (err) {
    console.error('获取用户信息失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取用户信息失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
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
    return await get(API_PREFIXES.wxapp + '/user/list', queryParams);
  } catch (err) {
    console.error('获取用户列表失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取用户列表失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 更新用户信息
 * @param {Object} userData - 要更新的用户数据
 * @returns {Promise} - 返回Promise对象
 */
async function updateUser(userData = {}) {
  try {
    const openid = getStorage('openid');
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }
    
    // 确保有openid
    userData.openid = openid;
    
    const result = await post(API_PREFIXES.wxapp + '/user/update', userData);
    
    // 如果更新成功，同时更新本地存储的用户信息
    if (result.code === 200) {
      // 获取最新的用户信息
      const userInfo = await getProfile({ openid, isSelf: true });
      // 不需要处理结果，getProfile已经更新了本地存储
    }
    
    return result;
  } catch (err) {
    console.debug('更新用户信息失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '更新用户信息失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
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
      throw new Error('缺少用户openid');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/follow/stat', { openid });
    
    return result;
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
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!followedId) {
      throw new Error('缺少被关注用户ID');
    }
    
    const result = await post(API_PREFIXES.wxapp + '/user/follow', {
      openid,
      followed_id: followedId
    });
    
    return result;
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
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!followedId) {
      throw new Error('缺少被取消关注用户ID');
    }
    
    const result = await post(API_PREFIXES.wxapp + '/user/unfollow', {
      openid,
      followed_id: followedId
    });
    
    return result;
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
 * @param {string} params.followed_id - 被关注用户的openid
 * @param {string} params.openid - 关注者用户的openid（可选，默认当前用户）
 * @returns {Promise} - 返回Promise对象
 */
async function checkFollow(params = {}) {
  try {
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    if (!params.followed_id) {
      throw new Error('缺少被关注用户ID');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/follow/check', {
      openid,
      followed_id: params.followed_id
    });
    
    return result;
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/follow/list', {
      openid,
      limit: params.limit || 10,
      offset: params.offset || 0
    });
    
    return result;
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/follower/list', {
      openid,
      limit: params.limit || 10,
      offset: params.offset || 0
    });
    
    return result;
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
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/token', { openid });
    
    return result;
  } catch (err) {
    console.error('获取用户Token失败:', err);
    return {
      success: false,
      message: '获取用户Token失败: ' + (err.message || '未知错误')
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/like', {
      openid,
      limit: params.limit || 10,
      offset: params.offset || 0
    });
    
    return result;
  } catch (err) {
    console.error('获取用户点赞列表失败:', err);
    return {
      success: false,
      message: '获取用户点赞列表失败: ' + (err.message || '未知错误')
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
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      throw new Error('缺少帖子ID');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/like/detail', {
      openid,
      post_id: postId
    });
    
    return result;
  } catch (err) {
    console.error('获取用户点赞详情失败:', err);
    return {
      success: false,
      message: '获取用户点赞详情失败: ' + (err.message || '未知错误')
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const result = await post(API_PREFIXES.wxapp + '/user/like/fix', {
      openid,
      post_id: params.post_id
    });
    
    return result;
  } catch (err) {
    console.error('修复用户点赞数据失败:', err);
    return {
      success: false,
      message: '修复用户点赞数据失败: ' + (err.message || '未知错误')
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
    const openid = getStorage('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!filePath) {
      throw new Error('缺少文件路径');
    }
    
    // 上传文件到云存储
    const uploadResult = await wx.cloud.uploadFile({
      cloudPath: `avatars/${openid}_${Date.now()}.jpg`,
      filePath: filePath
    });
    
    if (!uploadResult.fileID) {
      throw new Error('上传头像失败');
    }
    
    // 更新用户头像
    const result = await post(API_PREFIXES.wxapp + '/user/avatar', {
      openid,
      avatar: uploadResult.fileID
    });
    
    if (result.success) {
      // 更新本地存储的用户信息
      const userInfo = getStorage('userInfo') || {};
      userInfo.avatar = uploadResult.fileID;
      userInfo.avatarUrl = uploadResult.fileID;
      setStorage('userInfo', userInfo);
    }
    
    return result;
  } catch (err) {
    console.error('上传用户头像失败:', err);
    return {
      success: false,
      message: '上传用户头像失败: ' + (err.message || '未知错误')
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      throw new Error('缺少用户openid');
    }
    
    const result = await get(API_PREFIXES.wxapp + '/user/interaction/post', {
      openid,
      limit: params.limit || 10,
      offset: params.offset || 0,
      type: params.type || 'all'
    });
    
    return result;
  } catch (err) {
    console.error('获取用户互动帖子失败:', err);
    return {
      success: false,
      message: '获取用户互动帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 提交用户反馈
 * @param {Object} data - 反馈数据
 * @returns {Promise} - 返回Promise对象
 */
async function submitFeedback(data = {}) {
  try {
    const openid = await getOpenID();
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }
    
    // 确保有openid
    data.openid = openid;
    
    // 调用反馈API
    const result = await post(API_PREFIXES.wxapp + '/feedback/submit', data);
    return result;
  } catch (err) {
    console.debug('提交反馈失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '提交反馈失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 获取关于页面信息
 * @returns {Promise} - 返回Promise对象
 */
async function getAboutInfo() {
  try {
    const result = await get(API_PREFIXES.wxapp + '/about');
    return result;
  } catch (err) {
    console.debug('获取关于信息失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取关于信息失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

// 导出所有用户相关API方法
module.exports = {
  login,
  getProfile,
  getUserList,
  updateUser,
  updateProfile: updateUser, // 兼容新命名
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
  getUserInteractionPosts: getUserInteractionPost,
  submitFeedback,
  getAboutInfo
}; 