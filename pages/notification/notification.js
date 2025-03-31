const { 
    getNotificationList, 
    markAsRead, 
    markReadBatch,
    getUnreadCount
} = require("../../utils/api/notification");
const { formatRelativeTime, getStorage } = require("../../utils/util");

Page({
    data: {
        activeTab: "like",
        action: "点赞",
        notifications: {
            like: [],
            favourite: [],
            comment: []
        },
        loading: false,
        pagination: {
            limit: 20,
            offset: 0,
            hasMore: true
        }
    },

    async loadNotifications(type = null, refresh = false) {
        if (this.data.loading) return;
        
        try {
            this.setData({ loading: true });
            
            // 如果是刷新，重置分页
            if (refresh) {
                this.setData({
                    'pagination.offset': 0,
                    'pagination.hasMore': true,
                    [`notifications.${type || this.data.activeTab}`]: []
                });
            }
            
            const params = {
                type: type || this.data.activeTab,
                limit: this.data.pagination.limit,
                offset: this.data.pagination.offset
            };
            
            const res = await getNotificationList(params);
            
            if (res.code === 200 && res.data) {
                const notifications = res.data.map(item => ({
                    id: item.id,
                    avatar: item.sender_avatar || '/assets/icons/default-avatar.png',
                    name: item.sender_name,
                    time: formatRelativeTime(item.created_at),
                    postId: item.post_id,
                    postTitle: item.post_title,
                    content: item.content,
                    isRead: item.is_read
                }));
                
                // 更新数据
                this.setData({
                    [`notifications.${type || this.data.activeTab}`]: refresh 
                        ? notifications 
                        : [...this.data.notifications[type || this.data.activeTab], ...notifications],
                    'pagination.offset': this.data.pagination.offset + notifications.length,
                    'pagination.hasMore': notifications.length === this.data.pagination.limit
                });
            } else {
                wx.showToast({
                    title: res.message || '加载失败',
                    icon: 'none'
                });
            }
        } catch (err) {
            console.debug('加载通知失败:', err);
            wx.showToast({
                title: '加载失败',
                icon: 'none'
            });
        } finally {
            this.setData({ loading: false });
        }
    },

    async markAllRead() {
        try {
            const currentNotifications = this.data.notifications[this.data.activeTab];
            if (!currentNotifications || currentNotifications.length === 0) return;
            
            const notificationIds = currentNotifications
                .filter(item => !item.isRead)
                .map(item => item.id);
            
            if (notificationIds.length === 0) {
                wx.showToast({
                    title: '没有未读消息',
                    icon: 'none'
                });
                return;
            }
            
            const res = await markReadBatch({ notification_id: notificationIds });
            
            if (res.code === 200) {
                // 更新本地数据状态
                const updatedNotifications = currentNotifications.map(item => ({
                    ...item,
                    isRead: true
                }));
                
                this.setData({
                    [`notifications.${this.data.activeTab}`]: updatedNotifications
                });
                
                wx.showToast({
                    title: '已全部标记为已读',
                    icon: 'success'
                });
            } else {
                wx.showToast({
                    title: res.message || '操作失败',
                    icon: 'none'
                });
            }
        } catch (err) {
            console.debug('标记已读失败:', err);
            wx.showToast({
                title: '操作失败',
                icon: 'none'
            });
        }
    },

    async switchTab(event) {
        const tab = event.target.dataset.tab;
        if (tab === this.data.activeTab) return;
        
        let action = '';
        switch (tab) {
            case 'like':
                action = '点赞';
                break;
            case 'favourite':
                action = '收藏';
                break;
            case 'comment':
                action = '评论';
                break;
        }
        
        this.setData({ activeTab: tab, action });
        
        // 如果该标签下没有数据，加载数据
        if (!this.data.notifications[tab] || this.data.notifications[tab].length === 0) {
            await this.loadNotifications(tab, true);
        }
    },

    async onLoad() {
        await this.loadNotifications();
    },

    async onPullDownRefresh() {
        await this.loadNotifications(this.data.activeTab, true);
        wx.stopPullDownRefresh();
    },

    async onReachBottom() {
        if (this.data.pagination.hasMore) {
            await this.loadNotifications();
        }
    },

    goToPost(event) {
        const postId = event.currentTarget.dataset.postId;
        if (postId) {
            wx.navigateTo({
                url: `/pages/post/detail/detail?id=${postId}`
            });
        }
    }
});