const { ui, error, ToastType, formatRelativeTime, storage } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const userBehavior = require('../../behaviors/userBehavior');
const notificationBehavior = require('../../behaviors/notificationBehavior');

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

Page({
  behaviors: [baseBehavior, userBehavior, notificationBehavior],

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
    const isLoggedIn = await this._ensureLogin();
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

  onTabChange(e) {
    const activeTab = e.detail.index;
    this.setData({ 
      activeTab,
      page: 1,
      notifications: [], 
      hasMore: true
    });
    this.loadList(true);
  },

  async loadList(refresh = false) {
    const { activeTab, tabs, page, limit } = this.data;
    const type = tabs[activeTab].type;

    this._showLoading('加载中...');
    this.setData({ loading: true });

    try {
      const params = {
        is_read: type === 'read' ? 1 : 0,
        limit,
        offset: (refresh ? 0 : page - 1) * limit
      };
      
      const list = await this._getNotificationList(params);
      
      if (!list) {
        throw error.create('加载失败');
      }

      const formattedList = (list || []).map(item => ({
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
      this._handleError(err, '加载通知失败');
    } finally {
      this._hideLoading();
      this.setData({ loading: false });
    }
  },

  async markAllAsRead() {
    if (this.data.activeTab !== 0) {
      return;
    }

    try {
      this._showLoading('处理中...');
      
      const success = await this._markAllNotificationsAsRead();
      
      if (!success) {
        throw error.create('操作失败');
      }
      
      this.setData({
        notifications: [],
        page: 1,
        hasMore: true
      });
      await this.loadList(true);
      
      this._showToast('已全部标记为已读', 'success');
    } catch (err) {
      this._handleError(err, '操作失败');
    } finally {
      this._hideLoading();
    }
  },

  async onNotificationTap(e) {
    const { id, type, target_id, target_type, is_read } = e.currentTarget.dataset;
    
    // 标记为已读
    if (!is_read) {
      try {
        await this._markNotificationAsRead(id);
      } catch (err) {
        console.debug('标记通知已读失败:', err);
      }
    }

    // 跳转到目标页面
    const url = this.getTargetUrl(type, target_id, target_type);
    if (url) {
      this._navigateTo(url);
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
        
        this._showLoading('删除中...');
        
        try {
          const success = await this._deleteNotification(id);
          
          if (!success) {
            throw error.create('删除失败');
          }
          
          const notifications = this.data.notifications.filter(n => n.id !== id);
          this.setData({ notifications });
    
          this._showToast('删除成功', 'success');
        } catch (err) {
          this._handleError(err, '删除失败');
        } finally {
          this._hideLoading();
        }
      }
    });
  }
});