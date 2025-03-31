/**
 * 通知相关API封装
 */

const request = require('../request');

/**
 * 获取用户通知列表
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid（可选，默认当前登录用户）
 * @param {string} params.type - 通知类型：如comment-评论, like-点赞, follow-关注等（可选）
 * @param {boolean} params.is_read - 是否已读：true/false（可选）
 * @param {number} params.limit - 返回记录数量限制，默认20
 * @param {number} params.offset - 分页偏移量，默认0
 * @returns {Promise} - 返回Promise对象
 */
async function getNotificationList(params = {}) {
  try {
    // 使用传入的openid或从本地获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    // 构建查询参数
    const queryParams = {
      openid: openid,
      limit: params.limit || 20,
      offset: params.offset || 0
    };
    
    // 可选参数
    if (params.type) queryParams.type = params.type;
    if (params.is_read !== undefined) queryParams.is_read = params.is_read;
    
    // 请求通知列表
    const result = await request.get('/api/wxapp/notification/list', queryParams);
    
    return {
      success: true,
      data: result.data.data,
      pagination: result.data.pagination,
      message: '获取通知列表成功'
    };
  } catch (err) {
    console.error('获取通知列表失败:', err);
    return {
      success: false,
      message: '获取通知列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取通知详情
 * @param {number} notificationId - 通知ID
 * @returns {Promise} - 返回Promise对象
 */
async function getNotificationDetail(notificationId) {
  try {
    if (!notificationId) {
      throw new Error('通知ID不能为空');
    }
    
    // 请求通知详情
    const result = await request.get('/api/wxapp/notification/detail', { notification_id: notificationId });
    
    return {
      success: true,
      data: result.data,
      message: '获取通知详情成功'
    };
  } catch (err) {
    console.error('获取通知详情失败:', err);
    return {
      success: false,
      message: '获取通知详情失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取未读通知数量
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid（可选，默认当前登录用户）
 * @param {string} params.type - 通知类型：如comment-评论, like-点赞, follow-关注等（可选）
 * @returns {Promise} - 返回Promise对象
 */
async function getUnreadCount(params = {}) {
  try {
    // 使用传入的openid或从本地获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    // 构建查询参数
    const queryParams = { openid };
    
    // 可选参数
    if (params.type) queryParams.type = params.type;
    
    // 请求未读通知数量
    const result = await request.get('/api/wxapp/notification/count', queryParams);
    
    return {
      success: true,
      count: result.data.count,
      message: '获取未读通知数量成功'
    };
  } catch (err) {
    console.error('获取未读通知数量失败:', err);
    return {
      success: false,
      count: 0,
      message: '获取未读通知数量失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 标记通知已读
 * @param {Object} params - 请求参数
 * @param {number} params.notification_id - 通知ID
 * @param {string} params.openid - 用户openid（可选，默认当前登录用户）
 * @returns {Promise} - 返回Promise对象
 */
async function markAsRead(params = {}) {
  try {
    // 使用传入的openid或从本地获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!params.notification_id) {
      throw new Error('通知ID不能为空');
    }
    
    // 请求体
    const data = {
      notification_id: params.notification_id,
      openid: openid
    };
    
    // 标记通知已读
    const result = await request.post('/api/wxapp/notification/mark-read', data);
    
    return {
      success: true,
      message: '标记已读成功'
    };
  } catch (err) {
    console.error('标记通知已读失败:', err);
    return {
      success: false,
      message: '标记已读失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 批量标记通知已读
 * @param {Object} params - 请求参数
 * @param {Array<number>} params.notification_ids - 通知ID列表
 * @param {string} params.openid - 用户openid（可选，默认当前登录用户）
 * @returns {Promise} - 返回Promise对象
 */
async function markAsReadBatch(params = {}) {
  try {
    // 使用传入的openid或从本地获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!params.notification_ids || !Array.isArray(params.notification_ids) || params.notification_ids.length === 0) {
      throw new Error('通知ID列表不能为空');
    }
    
    // 请求体
    const data = {
      notification_ids: params.notification_ids,
      openid: openid
    };
    
    // 批量标记通知已读
    const result = await request.post('/api/wxapp/notification/mark-read-batch', data);
    
    return {
      success: true,
      message: result.details?.message || '批量标记已读成功'
    };
  } catch (err) {
    console.error('批量标记通知已读失败:', err);
    return {
      success: false,
      message: '批量标记已读失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 删除通知
 * @param {Object} params - 请求参数
 * @param {number} params.notification_id - 通知ID
 * @param {string} params.openid - 用户openid（可选，默认当前登录用户）
 * @returns {Promise} - 返回Promise对象
 */
async function deleteNotification(params = {}) {
  try {
    // 使用传入的openid或从本地获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!params.notification_id) {
      throw new Error('通知ID不能为空');
    }
    
    // 请求体
    const data = {
      notification_id: params.notification_id,
      openid: openid
    };
    
    // 删除通知
    const result = await request.post('/api/wxapp/notification/delete', data);
    
    return {
      success: true,
      message: result.details?.message || '删除通知成功'
    };
  } catch (err) {
    console.error('删除通知失败:', err);
    return {
      success: false,
      message: '删除通知失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取通知状态
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid（可选，默认当前登录用户）
 * @returns {Promise} - 返回Promise对象，包含isRead状态
 */
async function getStatus(params = {}) {
  try {
    // 使用传入的openid或从本地获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }

    // 获取未读通知数量作为状态判断依据
    const result = await getUnreadCount({ openid });
    
    return {
      success: true,
      data: {
        isRead: result.count === 0, // 如果未读数量为0，则标记为已读
        unreadCount: result.count
      },
      message: '获取通知状态成功'
    };
  } catch (err) {
    console.error('获取通知状态失败:', err);
    return {
      success: false,
      data: {
        isRead: true, // 出错时默认为已读，避免显示红点
        unreadCount: 0
      },
      message: '获取通知状态失败: ' + (err.message || '未知错误')
    };
  }
}

// 导出所有通知相关API方法
module.exports = {
  getNotificationList,
  getNotificationDetail,
  getUnreadCount,
  markAsRead,
  markAsReadBatch,
  deleteNotification,
  getStatus
}; 