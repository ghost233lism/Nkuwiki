/**
 * 通知相关API封装
 */

const { get, post, API_PREFIXES, processResponse } = require('../request');
const { getStorage } = require('../util');

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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }
    
    // 构建查询参数
    const queryParams = {
      openid,
      type: params.type || null,
      is_read: params.is_read,
      limit: params.limit || 20,
      offset: params.offset || 0
    };
    
    return await get(API_PREFIXES.wxapp + '/notification/list', queryParams);
  } catch (err) {
    console.error('获取通知列表失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取通知列表失败',
      data: [],
      details: { 
        message: err.message || '未知错误',
        pagination: {
          total: 0,
          limit: params.limit || 20,
          offset: params.offset || 0,
          has_more: false
        }
      }
    });
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
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '通知ID不能为空' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + '/notification/detail', { notification_id: notificationId });
  } catch (err) {
    console.error('获取通知详情失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取通知详情失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }
    
    // 构建查询参数
    const queryParams = { openid };
    if (params.type) queryParams.type = params.type;
    
    return await get(API_PREFIXES.wxapp + '/notification/count', queryParams);
  } catch (err) {
    console.error('获取未读通知数量失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取未读通知数量失败',
      data: { count: 0 },
      details: { message: err.message || '未知错误' }
    });
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }

    if (!params.notification_id) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '通知ID不能为空' }
      });
    }
    
    const data = {
      notification_id: params.notification_id,
      openid: openid
    };
    
    return await post(API_PREFIXES.wxapp + '/notification/read', data);
  } catch (err) {
    console.error('标记通知已读失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '标记通知已读失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

/**
 * 批量标记通知已读
 * @param {Object} params - 请求参数
 * @param {Array<number>} params.notification_id - 通知ID列表
 * @param {string} params.openid - 用户openid（可选，默认当前登录用户）
 * @returns {Promise} - 返回Promise对象
 */
async function markReadBatch(params = {}) {
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
    
    if (!params.notification_id || !Array.isArray(params.notification_id)) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '通知ID列表不能为空或格式错误' }
      });
    }
    
    const data = {
      openid,
      notification_id: params.notification_id
    };
    
    return await post(API_PREFIXES.wxapp + '/notification/read/batch', data);
  } catch (err) {
    console.error('批量标记通知已读失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '批量标记通知已读失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }
    
    if (!params.notification_id) {
      return processResponse({
        code: 400,
        message: '请求参数错误',
        data: null,
        details: { message: '通知ID不能为空' }
      });
    }
    
    const data = {
      notification_id: params.notification_id,
      openid: openid
    };
    
    return await post(API_PREFIXES.wxapp + '/notification/delete', data);
  } catch (err) {
    console.error('删除通知失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '删除通知失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
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
    const openid = params.openid || getStorage('openid');
    if (!openid) {
      return processResponse({
        code: 401,
        message: '未登录',
        data: null,
        details: { message: '用户未登录' }
      });
    }
    
    return await get(API_PREFIXES.wxapp + '/notification/status', { openid });
  } catch (err) {
    console.error('获取通知状态失败:', err);
    return processResponse({
      code: err.code || 500,
      message: '获取通知状态失败',
      data: null,
      details: { message: err.message || '未知错误' }
    });
  }
}

module.exports = {
  getNotificationList,
  getNotificationDetail,
  getUnreadCount,
  markAsRead,
  markReadBatch,
  deleteNotification,
  getStatus
}; 