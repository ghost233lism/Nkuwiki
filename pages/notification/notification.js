const { ui, error, ToastType, formatRelativeTime, storage, get, post, createApiClient } = require('../../utils/util');
const baseBehavior = require('../../behaviors/base-behavior');
const userBehavior = require('../../behaviors/user-behavior');

// 通知类型配置
const NotificationType = {
  LIKE: 'like',
  COMMENT: 'comment', 
  FOLLOW: 'follow',
  FAVORITE: 'favorite'
};

const NotificationConfig = {
  [NotificationType.LIKE]: {
    icon: 'like',
    action: '点赞了你的',
    targetType: ['post', 'comment']
  },
  [NotificationType.COMMENT]: {
    icon: 'comment',
    action: '评论了你的',
    targetType: ['post']
  },
  [NotificationType.FOLLOW]: {
    icon: 'user',
    action: '关注了你',
    targetType: ['user']
  },
  [NotificationType.FAVORITE]: {
    icon: 'star',
    action: '收藏了你的',
    targetType: ['post']
  }
};

// 通知API
const notificationApi = createApiClient('/api/wxapp/notification', {
  list: { 
    method: 'GET', 
    path: '/list',
    params: {
      openid: true,
      type: false,
      is_read: false,
      limit: false,
      offset: false
    }
  },
  count: { 
    method: 'GET', 
    path: '/count',
    params: {
      openid: true,
      type: false
    }
  },
  markRead: { 
    method: 'POST', 
    path: '/mark-read',
    params: {
      notification_id: true,
      openid: true
    }
  },
  markReadBatch: { 
    method: 'POST', 
    path: '/mark-read-batch',
    params: {
      notification_ids: true,
      openid: true
    }
  },
  delete: { 
    method: 'POST', 
    path: '/delete',
    params: {
      notification_id: true,
      openid: true
    }
  }
});

Page({
  behaviors: [baseBehavior, userBehavior],

  data: {
    activeTab: 0,
    tabs: [
      { title: '未读', type: 'unread' }, 
      { title: '已读', type: 'read' }
    ],
    notifications: [],
    page: 1,
    limit: 15,
    hasMore: true,
    loading: false,
    error: null,
    NotificationType,
    NotificationConfig
  },

  onLoad: async function() {
    const isLoggedIn = await this.ensureLogin();
    if (!isLoggedIn) return;
    await this.loadList();
  },

  onPullDownRefresh() {
    this.loadList(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadList();
    }
  },

  onTabsChange(e) {
    const index = e.detail.index;
    this.setData({ 
      activeTab: index,
      notifications: [],
      page: 1,
      hasMore: true
    });
    this.loadList(true);
  },

  async loadList(refresh = false) {
    if (this.data.loading) return;

    const { activeTab, tabs, page, limit } = this.data;
    const type = tabs[activeTab].type;

    this.showLoading('加载中...');
    this.setData({ loading: true });

    try {
      const res = await notificationApi.list({
        openid: storage.get('openid'),
        is_read: type === 'read',
        limit,
        offset: (refresh ? 0 : page - 1) * limit
      });

      if (res.code !== 200) {
        throw error.create(res.message || '加载失败');
      }

      const formattedList = (res.data || []).map(item => ({
        ...item,
        relative_time: formatRelativeTime(item.create_time),
        config: NotificationConfig[item.type] || {}
      }));

      this.setData({
        notifications: refresh ? formattedList : [...this.data.notifications, ...formattedList],
        page: (refresh ? 1 : page) + 1,
        hasMore: formattedList.length === limit
      });
    } catch (err) {
      this.handleError(err, '加载通知失败');
    } finally {
      this.hideLoading();
      this.setData({ loading: false });
    }
  },

  async markAllRead() {
    const unreadList = this.data.notifications.filter(n => !n.is_read);
    if (!unreadList.length) return;

    const notification_ids = unreadList.map(n => n.id);
    
    this.showLoading('标记中...');

    try {
      const res = await notificationApi.markReadBatch({ 
        openid: storage.get('openid'),
        notification_ids 
      });
      
      if (res.code !== 200) {
        throw error.create(res.message || '标记失败');
      }
      
      if (this.data.activeTab === 0) {
        await this.loadList(true);
      }

      this.showToast('已全部标记为已读', 'success');
    } catch (err) {
      this.handleError(err, '标记失败');
    } finally {
      this.hideLoading();
    }
  },

  async onNotificationTap(e) {
    const { id, type, target_id, target_type, is_read } = e.currentTarget.dataset;
    
    // 标记为已读
    if (!is_read) {
      try {
        await notificationApi.markRead({ 
          openid: storage.get('openid'),
          notification_id: id 
        });
      } catch (err) {
        console.debug('标记通知已读失败:', err);
      }
    }

    // 跳转到目标页面
    const url = this.getTargetUrl(type, target_id, target_type);
    if (url) {
      this.navigateTo(url);
    }
  },

  getTargetUrl(type, target_id, target_type) {
    switch (target_type) {
      case 'post':
        return `/pages/post/detail/detail?id=${target_id}${type === NotificationType.COMMENT ? '&focus=comment' : ''}`;
      case 'comment':
        return `/pages/post/detail/detail?id=${target_id}&comment_id=${target_id}`;
      case 'user':
        return `/pages/profile/profile?id=${target_id}`;
      default:
        return '';
    }
  },

  async onNotificationDelete(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (!res.confirm) return;
        
        this.showLoading('删除中...');
        
        try {
          const res = await notificationApi.delete({ 
            openid: storage.get('openid'),
            notification_id: id 
          });
          
          if (res.code !== 200) {
            throw error.create(res.message || '删除失败');
          }
          
          const notifications = this.data.notifications.filter(n => n.id !== id);
          this.setData({ notifications });
    
          this.showToast('删除成功', 'success');
        } catch (err) {
          this.handleError(err, '删除失败');
        } finally {
          this.hideLoading();
        }
      }
    });
  }
});