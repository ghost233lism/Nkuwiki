/**
 * 通知行为
 * 提供通知检查和处理相关方法
 */
const { createApiClient, storage } = require('../utils/util');
const baseBehavior = require('./baseBehavior'); // 依赖 baseBehavior

// 通知API客户端
const notificationApi = createApiClient('/api/wxapp/notification', {
  count: { method: 'GET', path: '/count', params: { openid: true } }
  // list: { method: 'GET', path: '/list', params: { openid: true } }, // 可按需添加列表接口
  // read: { method: 'POST', path: '/read', params: { openid: true, notification_id: true } } // 可按需添加已读接口
});

module.exports = Behavior({
  behaviors: [baseBehavior], // 引入 baseBehavior
  data: {
    hasUnreadNotification: false, // 未读通知状态，保持独立
  },

  methods: {
    /**
     * 检查是否有未读通知 (后台静默检查)
     * @returns {Promise<Boolean>} 是否有未读通知
     */
    async _checkUnreadNotification() {
      const openid = storage.get('openid'); // 检查本地 openid
      if (!openid) {
        console.debug('notificationBehavior: User not logged in locally, cannot check notification.');
        // 确保未登录时状态为 false
        if (this.data.hasUnreadNotification) {
            this.updateState({ hasUnreadNotification: false });
        }
        return false;
      }

      console.debug('notificationBehavior: Checking unread notification count...');
      try {
        const res = await notificationApi.count({ openid });
        // console.debug('notificationBehavior: Count API response:', res); // 可选：更详细日志

        if (res.code === 200 && res.data) {
          const hasUnread = res.data.unread_count > 0;
          this.updateState({ hasUnreadNotification: hasUnread }); // 使用 baseBehavior.updateState
          return hasUnread;
        } else {
          // API 返回错误码或数据无效，视为无未读
          console.warn('notificationBehavior: Failed to get notification count from API.', res);
          this.updateState({ hasUnreadNotification: false });
          return false;
        }
      } catch (err) {
        // 网络错误等，也视为无未读，不打扰用户
        console.error('notificationBehavior: Error checking notification count API:', err);
        this.updateState({ hasUnreadNotification: false });
        // 注意：这里不调用 this.handleError，因为通常不希望检查通知失败时弹出错误提示
        return false;
      }
    },

    /**
     * 处理通知图标点击 (通常在页面/组件 WXML 中绑定)
     */
    async _handleNotificationTap() {
      // 使用 _checkLogin (假设 authBehavior 已混入或可用) 进行强制登录检查和提示
      // 如果不希望强制检查或弹窗，可以改回只检查本地 storage.get('openid')
      const isLoggedIn = await this._checkLogin(); // 强制检查，未登录会弹窗询问跳转
      if (!isLoggedIn) {
        console.debug('notificationBehavior: User not logged in or cancelled login, navigation prevented.');
        return; // 如果未登录或用户取消登录，则不跳转
      }

      // 已登录则跳转到通知页面
      console.debug('notificationBehavior: Navigating to notification page.');
      this.navigateTo('/pages/notification/notification'); // 使用 baseBehavior.navigateTo
    }
  }
}); 