/**
 * 通知行为
 * 提供通知检查和处理相关方法
 */
const { createApiClient, storage } = require('../utils/util');

// 通知API客户端
const notificationApi = createApiClient('/api/wxapp/notification', {
  getList: { method: 'GET', path: '', params: { openid: true } },
  read: { method: 'POST', path: '/read', params: { openid: true, notification_id: true } },
  readAll: { method: 'POST', path: '/read-all', params: { openid: true } },
  summary: { method: 'GET', path: '/summary', params: { openid: true } },
  delete: { method: 'POST', path: '/delete', params: { openid: true, notification_id: true } }
});

module.exports = Behavior({
  methods: {
    /**
     * 检查是否有未读通知
     * @returns {Promise<Boolean|Object>} 未读通知信息或false
     */
    async _checkUnreadNotification() {
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('通知检查：用户未登录');
        return false;
      }

      try {
        const res = await notificationApi.summary({ openid });
        if (res.code === 200 && res.data) {
          return {
            hasUnread: res.data.unread_count > 0,
            count: res.data.unread_count
          };
        } else {
          console.debug('通知检查：API返回异常', res);
          return false;
        }
      } catch (err) {
        console.debug('通知检查：请求失败', err);
        return false;
      }
    },

    /**
     * 获取通知列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Object|null>} 通知数据和分页信息，或null
     */
    async _getNotificationList(params = {}) {
      const openid = storage.get('openid');
      if (!openid) return null;

      // 确保使用标准参数名
      const apiParams = { 
        openid, 
        page: params.page || 1,
        page_size: params.page_size || params.limit || 20
      };
      
      // 复制其他参数
      if (params.type) apiParams.type = params.type;
      if (params.is_read !== undefined) apiParams.is_read = params.is_read;

      try {
        const res = await notificationApi.getList(apiParams);
        
        if (res.code !== 200) {
          console.debug('获取通知列表API响应异常:', res);
          return null;
        }
        
        // 标准API返回格式处理
        if (res.data && res.pagination) {
          return {
            data: res.data,
            pagination: res.pagination
          };
        }
        
        // 其他格式兼容处理 
        let list = [];
        let total = 0;
        
        if (Array.isArray(res.data)) {
          // 直接是数组的情况
          list = res.data;
          total = res.total || list.length;
        } else if (res.data && res.data.list && Array.isArray(res.data.list)) {
          // data.list格式的情况
          list = res.data.list;
          total = res.data.total || list.length;
        } else if (typeof res.data === 'object') {
          // 其他对象格式
          console.debug('通知API返回了非预期格式:', res.data);
          list = [];
          total = 0;
        }
        
        // 构造标准格式返回
        return {
          data: list,
          pagination: {
            total: total,
            page: apiParams.page,
            page_size: apiParams.page_size,
            total_pages: Math.ceil(total / apiParams.page_size),
            has_more: (apiParams.page * apiParams.page_size) < total
          }
        };
      } catch (err) {
        console.debug('获取通知列表失败:', err);
        return null;
      }
    },

    /**
     * 标记通知为已读
     * @param {string} notificationId - 通知ID
     * @returns {Promise<boolean>} 是否成功
     */
    async _markNotificationAsRead(notificationId) {
      if (!notificationId) return false;
      const openid = storage.get('openid');
      if (!openid) return false;

      try {
        const res = await notificationApi.read({ 
          openid, 
          notification_id: notificationId 
        });
        return res.code === 200;
      } catch (err) {
        console.debug('标记通知已读失败:', err);
        return false;
      }
    },
    
    /**
     * 标记所有通知为已读
     * @returns {Promise<boolean>} 是否成功
     */
    async _markAllNotificationsAsRead() {
      const openid = storage.get('openid');
      if (!openid) return false;

      try {
        const res = await notificationApi.readAll({ openid });
        return res.code === 200;
      } catch (err) {
        console.debug('标记所有通知已读失败:', err);
        return false;
      }
    },
    
    /**
     * 删除通知
     * @param {string} notificationId - 通知ID
     * @returns {Promise<boolean>} 是否成功
     */
    async _deleteNotification(notificationId) {
      if (!notificationId) return false;
      const openid = storage.get('openid');
      if (!openid) return false;
      
      try {
        const res = await notificationApi.delete({
          openid,
          notification_id: notificationId
        });
        return res.code === 200;
      } catch (err) {
        console.debug('删除通知失败:', err);
        return false;
      }
    }
  }
}); 