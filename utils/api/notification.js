// notification.js
// 消息通知相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

const notificationAPI = {
  /**
   * 获取用户的通知列表
   * @param {string} openid 用户openid
   * @param {Object} params 查询参数，可包含type、is_read等条件
   * @returns {Promise<Object>} 通知列表数据
   */
  getUserNotifications: async (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    try {
      // 构建请求URL
      let url = `${API.PREFIX.WXAPP}/users/${openid}/notifications`;
      logger.debug('获取通知列表URL:', url, '参数:', params);
      
      const res = await request({
        url: url,
        method: 'GET',
        params
      });
      
      if (res && res.notifications) {
        return res;
      } else if (res && res.data && res.data.notifications) {
        return res.data;
      }
      
      logger.debug('获取通知列表返回格式不符合预期:', res);
      return { notifications: [], unread_count: 0, total: 0 };
    } catch (error) {
      logger.error('获取用户通知列表失败:', error);
      return { notifications: [], unread_count: 0, total: 0, error: error.message };
    }
  },
  
  /**
   * 获取通知详情
   * @param {number} notificationId 通知ID
   * @returns {Promise<Object>} 通知详情
   */
  getNotificationDetail: async (notificationId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'GET'
    });
  },
  
  /**
   * 标记通知为已读
   * @param {number} notificationId 通知ID
   * @returns {Promise<Object>} 更新结果
   */
  markAsRead: async (notificationId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'PUT',
      data: { is_read: 1 }
    });
  },
  
  /**
   * 批量标记通知为已读
   * @param {string} openid 用户openid
   * @param {Array|null} notificationIds 要标记为已读的通知ID数组，不传则标记所有通知
   * @param {string} type 可选，通知类型
   * @returns {Promise<Object>} 操作结果
   */
  markAllAsRead: async (openid, notificationIds = null, type = null) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    const data = {};
    
    // 如果传入了通知ID数组
    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      data.notification_ids = notificationIds;
    }
    
    // 如果传入了通知类型
    if (type) {
      data.type = type;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/notifications/read`,
      method: 'PUT',
      data
    });
  },
  
  /**
   * 删除通知
   * @param {number} notificationId 通知ID
   * @returns {Promise<Object>} 操作结果
   */
  deleteNotification: async (notificationId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'DELETE'
    });
  }
};

module.exports = notificationAPI; 