const { notificationAPI, logger } = require('../../utils/api/index');
const userManager = require('../../utils/user_manager');

Page({
  data: {
    notifications: [],
    unreadCount: 0,
    totalCount: 0,
    loading: true,
    lastPage: false,
    currentPage: 0,
    pageSize: 20,
    selectedType: '', // 筛选类型：'' - 全部, 'system' - 系统通知, 'like' - 点赞, 'comment' - 评论, 'follow' - 关注
    isLoggedIn: false,
    userId: '',
    activeTab: 'all',
    offset: 0,
    needLogin: false,
    isLoading: true
  },

  onLoad: function (options) {
    // 检查登录状态
    const userInfo = userManager.getCurrentUser();
    const isLoggedIn = userManager.isLoggedIn();
    
    if (isLoggedIn && userInfo) {
      this.setData({
        isLoggedIn: true,
        userId: userInfo.id || userInfo._id
      });
      
      // 加载通知
      this.loadNotifications();
    } else {
      this.setData({
        isLoggedIn: false,
        loading: false
      });
      
      // 提示用户登录
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      
      // 2秒后返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  onShow: function () {
    // 每次显示页面时重新检查登录状态并刷新数据
    if (this.data.isLoggedIn) {
      this.loadNotifications(true); // 重置并加载数据
    }
  },

  /**
   * 手动刷新通知列表
   */
  manualRefresh: function() {
    wx.showToast({
      title: '正在刷新...',
      icon: 'loading',
      duration: 1000
    });
    
    // 清空当前列表并重新加载
    this.setData({
      notifications: [],
      offset: 0
    }, () => {
      this.loadNotifications(true);
    });
  },

  /**
   * 加载通知列表
   * @param {boolean} showLoading 是否显示加载动画
   */
  loadNotifications: function(showLoading = false) {
    const userId = userManager.getOpenid();
    if (!userId) {
      logger.error('loadNotifications: 用户未登录');
      this.setData({
        needLogin: true,
        isLoading: false
      });
      return;
    }

    logger.debug('开始加载通知列表, userId:', userId, 'activeTab:', this.data.activeTab);
    
    const params = {
      limit: 20,
      offset: this.data.offset
    };

    // 根据当前标签筛选通知类型
    if (this.data.activeTab !== 'all') {
      params.type = this.data.activeTab;
    }

    logger.debug('请求参数:', JSON.stringify(params));

    // 调用API获取通知
    if (showLoading) {
      wx.showLoading({
        title: '加载中',
      });
    }
    
    this.setData({
      isLoading: true
    });
    
    // 再次检查确保有用户ID
    const userInfo = userManager.getCurrentUser();
    const userIdFromInfo = this.data.userId || userInfo.id || userInfo._id;
    
    if (!userIdFromInfo) {
      logger.warn('无法加载通知：用户ID不存在');
      this.setData({ loading: false });
      wx.showToast({
        title: '用户信息不完整',
        icon: 'none'
      });
      return;
    }
    
    logger.debug(`准备加载用户[${userIdFromInfo}]的通知列表`);
    
    const offset = this.data.currentPage * this.data.pageSize;
    const limit = this.data.pageSize;
    
    // 构建请求参数
    const queryParams = {
      limit: limit,
      offset: offset
    };
    
    // 如果有类型筛选
    if (this.data.selectedType) {
      queryParams.type = this.data.selectedType;
    }
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    // 调用API获取通知
    notificationAPI.getUserNotifications(userIdFromInfo, queryParams)
      .then(res => {
        wx.hideLoading();
        logger.debug('获取用户通知成功, 完整响应:', JSON.stringify(res));
        
        // 检查响应格式
        if (!res.notifications && res.data && res.data.notifications) {
          logger.debug('使用res.data中的通知数据');
          res = res.data;
        }
        
        const newNotifications = res.notifications || [];
        // 记录更详细的通知信息
        if (newNotifications.length > 0) {
          logger.debug(`获取到${newNotifications.length}条通知，第一条:`, JSON.stringify(newNotifications[0]));
        } else {
          logger.debug('未获取到任何通知');
        }
        
        const unreadCount = res.unread_count || 0;
        const totalCount = res.total || 0;
        
        // 检查是否还有更多数据
        const isLastPage = newNotifications.length < limit;
        
        // 更新数据
        this.setData({
          notifications: newNotifications,
          unreadCount: unreadCount,
          totalCount: totalCount,
          loading: false,
          lastPage: isLastPage,
          currentPage: this.data.currentPage + 1
        });
      })
      .catch(err => {
        wx.hideLoading();
        logger.error('获取用户通知失败:', err);
        
        this.setData({
          loading: false
        });
        
        wx.showToast({
          title: '获取通知失败',
          icon: 'none'
        });
      });
  },

  // 切换通知类型筛选
  switchType: function (e) {
    const type = e.currentTarget.dataset.type || '';
    
    // 如果选择的类型与当前相同，不做操作
    if (type === this.data.selectedType) {
      return;
    }
    
    this.setData({
      selectedType: type
    });
    
    // 重新加载通知
    this.loadNotifications(true);
  },

  // 标记单个通知为已读
  markAsRead: function (e) {
    const notificationId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 检查通知是否已读
    const notification = this.data.notifications[index];
    if (notification && notification.is_read) {
      return; // 已读，不做操作
    }
    
    // 调用API标记为已读
    notificationAPI.markAsRead(notificationId)
      .then(res => {
        logger.debug('标记通知为已读成功:', res);
        
        // 更新本地数据
        const notifications = [...this.data.notifications];
        notifications[index].is_read = true;
        
        this.setData({
          notifications: notifications,
          unreadCount: Math.max(0, this.data.unreadCount - 1)
        });
        
        wx.showToast({
          title: '已标记为已读',
          icon: 'success'
        });
      })
      .catch(err => {
        logger.error('标记通知为已读失败:', err);
        
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
  },

  // 标记所有通知为已读
  markAllAsRead: function () {
    // 如果没有未读通知，不做操作
    if (this.data.unreadCount === 0) {
      wx.showToast({
        title: '没有未读通知',
        icon: 'none'
      });
      return;
    }
    
    const userId = this.data.userId;
    const type = this.data.selectedType || null; // 如果有类型筛选，只标记该类型的通知
    
    // 调用API标记所有为已读
    notificationAPI.markAllAsRead(userId, type)
      .then(res => {
        logger.debug('标记所有通知为已读成功:', res);
        
        // 更新所有通知为已读状态
        const notifications = this.data.notifications.map(item => {
          return { ...item, is_read: true };
        });
        
        this.setData({
          notifications: notifications,
          unreadCount: 0
        });
        
        wx.showToast({
          title: '全部已读',
          icon: 'success'
        });
      })
      .catch(err => {
        logger.error('标记所有通知为已读失败:', err);
        
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
  },

  // 删除通知
  deleteNotification: function (e) {
    const notificationId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 询问用户是否确认删除
    wx.showModal({
      title: '删除通知',
      content: '确定要删除这条通知吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用API删除通知
          notificationAPI.deleteNotification(notificationId)
            .then(res => {
              logger.debug('删除通知成功:', res);
              
              // 更新本地数据
              const notifications = [...this.data.notifications];
              notifications.splice(index, 1);
              
              // 如果删除的是未读通知，减少未读计数
              const isUnread = !this.data.notifications[index].is_read;
              
              this.setData({
                notifications: notifications,
                totalCount: Math.max(0, this.data.totalCount - 1),
                unreadCount: isUnread ? Math.max(0, this.data.unreadCount - 1) : this.data.unreadCount
              });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            })
            .catch(err => {
              logger.error('删除通知失败:', err);
              
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  // 查看通知详情
  viewNotificationDetail: function (e) {
    const notification = e.currentTarget.dataset.notification;
    const index = e.currentTarget.dataset.index;
    
    // 标记为已读
    if (!notification.is_read) {
      this.markAsRead(e);
    }
    
    // 根据通知类型跳转到相应页面
    switch (notification.type) {
      case 'comment':
        // 跳转到评论所在的帖子
        if (notification.related_id) {
          wx.navigateTo({
            url: `/pages/postDetail/postDetail?id=${notification.related_id}`
          });
        }
        break;
        
      case 'like':
        // 跳转到被点赞的帖子
        if (notification.related_id) {
          wx.navigateTo({
            url: `/pages/postDetail/postDetail?id=${notification.related_id}`
          });
        }
        break;
        
      case 'follow':
        // 跳转到关注用户的个人页面
        if (notification.sender_id) {
          wx.navigateTo({
            url: `/pages/userProfile/userProfile?userId=${notification.sender_id}`
          });
        }
        break;
        
      case 'system':
      default:
        // 系统通知仅显示详情
        wx.showModal({
          title: notification.title || '系统通知',
          content: notification.content || '',
          showCancel: false
        });
        break;
    }
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadNotifications(true);
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom: function () {
    if (!this.data.lastPage && !this.data.loading) {
      this.loadNotifications();
    }
  }
}); 