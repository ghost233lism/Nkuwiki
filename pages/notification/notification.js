const { ui, error, formatRelativeTime, storage } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const authBehavior = require('../../behaviors/authBehavior');
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
  behaviors: [baseBehavior, authBehavior, userBehavior, notificationBehavior],

  data: {
    activeTab: 0,
    tabs: [
      { title: '未读', type: 'unread' }, 
      { title: '已读', type: 'read' }
    ],
    notifications: [],
    page: 1,
    page_size: 15,
    hasMore: true,
    loading: false,
    error: null,
    NotificationType,
    NotificationConfig
  },

  onLoad: async function() {
    console.debug('通知页面加载');
    
    try {
      // 检查登录状态
      if (!(await this._checkLogin(true))) {
        return;
      }
      
      // 加载通知列表
      await this.loadList();
    } catch (err) {
      console.debug('通知页面加载异常:', err);
      this.showToast('加载失败，请重试', 'error');
    }
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
    const { activeTab, tabs, page, page_size } = this.data;
    const type = tabs[activeTab].type;

    this.showLoading('加载中...');
    this.setData({ loading: true });

    try {
      const params = {
        is_read: type === 'read' ? 1 : 0,
        page: refresh ? 1 : page,
        page_size
      };
      
      // 使用behavior获取通知列表
      const result = await this._getNotificationList(params);
      
      if (!result) {
        throw new Error('加载失败');
      }
      
      // 格式化通知显示
      const notificationList = Array.isArray(result.data) ? result.data : [];
      const pagination = result.pagination || {};
      
      const formattedList = notificationList.map(item => ({
        ...item,
        relative_time: formatRelativeTime(item.create_time),
        config: NotificationConfig[item.type] || {}
      }));

      // 更新UI
      this.setData({
        notifications: refresh ? formattedList : [...this.data.notifications, ...formattedList],
        page: refresh ? 2 : page + 1,
        hasMore: pagination.has_more !== undefined ? pagination.has_more : 
          (formattedList.length === page_size)
      });
    } catch (err) {
      this.handleError(err, '加载通知失败');
    } finally {
      this.hideLoading();
      this.setData({ loading: false });
    }
  },

  // 标记所有通知为已读
  async markAllAsRead() {
    if (this.data.activeTab !== 0) return;

    this.showLoading('处理中...');
    
    try {
      // 使用behavior标记所有通知为已读
      if (await this._markAllNotificationsAsRead()) {
        // 成功后刷新列表
        this.setData({
          notifications: [],
          page: 1,
          hasMore: true
        });
        await this.loadList(true);
        this.showToast('已全部标记为已读', 'success');
      } else {
        throw new Error('操作失败');
      }
    } catch (err) {
      this.handleError(err, '操作失败');
    } finally {
      this.hideLoading();
    }
  },

  // 处理通知点击
  async onNotificationTap(e) {
    const { id, type, target_id, target_type, is_read } = e.currentTarget.dataset;
    
    // 标记为已读
    if (!is_read) {
      await this._markNotificationAsRead(id).catch(err => {
        console.debug('标记通知已读失败:', err);
      });
    }

    // 跳转到目标页面
    const url = this.getTargetUrl(type, target_id, target_type);
    if (url) {
      this.navigateTo(url);
    }
  },

  // 获取目标URL
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

  // 删除通知
  async onNotificationDelete(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (!res.confirm) return;
        
        this.showLoading('删除中...');
        
        try {
          // 使用behavior删除通知
          if (await this._deleteNotification(id)) {
            // 更新本地列表
            const notifications = this.data.notifications.filter(n => n.id !== id);
            this.setData({ notifications });
            this.showToast('删除成功', 'success');
          } else {
            throw new Error('删除失败');
          }
        } catch (err) {
          this.handleError(err, '删除失败');
        } finally {
          this.hideLoading();
        }
      }
    });
  }
});