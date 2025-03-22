// notification.js
// 消息通知相关API

const { API, logger, request } = require('./core');

const notificationAPI = {
  /**
   * 获取用户的通知列表
   * @param {string} userId 用户ID
   * @param {Object} params 查询参数，可包含type、is_read等条件
   * @returns {Promise<Object>} 通知列表数据
   */
  getUserNotifications: async (userId, params = {}) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/notifications`,
        method: 'GET',
        data: params
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
      data: { is_read: true }
    });
  },
  
  /**
   * 标记所有通知为已读
   * @param {string} userId 用户ID
   * @param {string} type 可选，通知类型
   * @returns {Promise<Object>} 操作结果
   */
  markAllAsRead: async (userId, type = null) => {
    const data = type ? { type } : {};
    return request({
      url: `${API.PREFIX.WXAPP}/users/${userId}/notifications/read-all`,
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