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
      
      // 处理标准API响应格式: { code: 200, message: "success", data: {...}, details: null, timestamp: "..." }
      if (res) {
        // 标准API响应格式
        if (res.code === 200 && res.data) {
          logger.debug('收到标准API响应格式');
          // 如果data包含notifications
          if (res.data.notifications) {
            return res.data;
          }
          // 如果data本身就是结果
          return res.data;
        }
        // 兼容旧格式 - 直接返回notifications字段
        else if (res.notifications) {
          logger.debug('收到旧格式数据，直接包含notifications字段');
          return res;
        }
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
    // 获取当前用户openid
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('markAsRead: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }
    
    const openid = userInfo.openid;
    
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'PUT',
      data: { is_read: 1 },
      params: { openid } // 添加openid作为查询参数
    }).then(res => {
      // 处理标准API响应格式
      if (res && res.code === 200) {
        logger.debug('标记通知已读成功 (标准格式)');
        return res;
      }
      
      logger.debug('标记通知已读成功 (旧格式)');
      return res;
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
    
    if (!openid) {
      logger.error('markAllAsRead: 缺少必需的openid参数');
      return Promise.reject(new Error('缺少必需的openid参数'));
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
    
    // 注意：这里openid已经在URL中，不需要额外添加到查询参数
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/notifications/read`,
      method: 'PUT',
      data
    }).then(res => {
      // 处理标准API响应格式
      if (res && res.code === 200) {
        logger.debug('批量标记通知已读成功 (标准格式)');
        return res.data || res;
      }
      
      // 旧格式处理
      logger.debug('批量标记通知已读成功 (旧格式)');
      return res;
    });
  },
  
  /**
   * 删除通知
   * @param {number} notificationId 通知ID
   * @returns {Promise<Object>} 操作结果
   */
  deleteNotification: async (notificationId) => {
    // 获取当前用户openid
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('deleteNotification: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }
    
    const openid = userInfo.openid;
    
    return request({
      url: `${API.PREFIX.WXAPP}/notifications/${notificationId}`,
      method: 'DELETE',
      params: { openid } // 添加openid作为查询参数
    }).then(res => {
      // 处理标准API响应格式
      if (res && res.code === 200) {
        logger.debug('删除通知成功 (标准格式)');
        return res.data || res;
      }
      
      // 旧格式处理
      logger.debug('删除通知成功 (旧格式)');
      return res;
    });
  },
  
  /**
   * 获取未读通知数量
   * @param {string} openid 用户openid
   * @param {string} type 可选，通知类型
   * @returns {Promise<Object>} 未读通知数量
   */
  getUnreadCount: async (openid, type = null) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo?.openid;
    }
    
    if (!openid) {
      logger.error('getUnreadCount: 缺少必需的openid参数');
      return Promise.reject(new Error('缺少必需的openid参数'));
    }
    
    const params = {};
    if (type) {
      params.type = type;
    }
    
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${openid}/notifications/count`,
        method: 'GET',
        params,
        showError: false
      });
      
      // 处理标准API响应格式
      if (res && res.code === 200) {
        logger.debug('获取未读通知数量成功 (标准格式)');
        if (res.data && typeof res.data.unread_count !== 'undefined') {
          return res.data.unread_count;
        }
        return 0;
      }
      
      // 处理旧格式响应
      if (res && typeof res.unread_count !== 'undefined') {
        return res.unread_count;
      }
      
      return 0;
    } catch (error) {
      logger.error('获取未读通知数量失败:', error);
      return 0;
    }
  }
};

module.exports = notificationAPI; 