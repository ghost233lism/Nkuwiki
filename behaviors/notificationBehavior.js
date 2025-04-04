/**
 * 通知行为
 * 提供通知检查和处理相关方法
 */
const { createApiClient, storage } = require('../utils/util');

// 通知API客户端
const notificationApi = createApiClient('/api/wxapp/notification', {
  count: { method: 'GET', path: '/count', params: { openid: true } }
  // list: { method: 'GET', path: '/list', params: { openid: true } }, // 可按需添加列表接口
  // read: { method: 'POST', path: '/read', params: { openid: true, notification_id: true } } // 可按需添加已读接口
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
        const res = await notificationApi.count({ openid });
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
     * @returns {Promise<Array|null>} 通知列表或null
     */
    async _getNotificationList(params = {}) {
      const openid = storage.get('openid');
      if (!openid) return null;

      // 如果API定义中没有list方法，需要先添加
      if (!notificationApi.list) {
        console.debug('通知列表：API未定义');
        return null;
      }

      try {
        const res = await notificationApi.list({ openid, ...params });
        return res.code === 200 ? res.data : null;
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

      // 如果API定义中没有read方法，需要先添加
      if (!notificationApi.read) {
        console.debug('标记已读：API未定义');
        return false;
      }

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
    }
  }
}); 