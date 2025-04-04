const { ui, error, ToastType, storage, nav, formatRelativeTime } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const userBehavior = require('../../behaviors/userBehavior');
const authBehavior = require('../../behaviors/authBehavior');
const notificationBehavior = require('../../behaviors/notificationBehavior');
const weuiBehavior = require('../../behaviors/weuiBehavior');

// 常量配置
const MENU_CONFIG = {
  CONTENT: {
    title: '我的内容',
    items: [
      {
        id: 'posts',
        icon: true,
        iconName: 'draft',
        title: '我的帖子',
        path: '/pages/profile/myPosts/myPosts'
      },
      {
        id: 'likes',
        icon: true,
        iconName: 'like',
        title: '我的点赞',
        path: '/pages/profile/mylike_fav_comment/mylike_fav_comment?tab=0'
      },
      {
        id: 'favorites',
        icon: true,
        iconName: 'favorite',
        title: '我的收藏',
        path: '/pages/profile/mylike_fav_comment/mylike_fav_comment?tab=1'
      },
      {
        id: 'comments',
        icon: true,
        iconName: 'comment',
        title: '我的评论',
        path: '/pages/profile/mylike_fav_comment/mylike_fav_comment?tab=2'
      }
    ]
  },
  SETTINGS: {
    title: '设置',
    items: [
      {
        id: 'edit',
        icon: true,
        iconName: 'profile',
        title: '编辑资料',
        path: '/pages/profile/edit/edit'
      },
      {
        id: 'feedback',
        icon: true,
        iconName: 'feedback',
        title: '意见反馈',
        path: '/pages/profile/feedback/feedback'
      },
      {
        id: 'about',
        icon: true,
        iconName: 'about',
        title: '关于我们',
        path: '/pages/profile/about/about'
      }
    ]
  }
};

Page({
  behaviors: [baseBehavior, userBehavior, authBehavior, notificationBehavior, weuiBehavior],

  data: {
    userInfo: null,
    stats: {
      posts: 0,
      likes: 0,
      favorites: 0,
      comments: 0
    },
    loading: false,
    error: false,
    errorMsg: '',
    refreshing: false,
    menuItems: [],
    settingItems: [],
    MENU_CONFIG: MENU_CONFIG,
    hasUnreadNotification: false,
    // 用户详情页相关数据
    userId: '',
    otherUserInfo: null
  },

  async onLoad() {
    console.debug('【Profile】页面onLoad触发');
    // 准备菜单数据
    this.processMenuItems();
    
    // 直接进行验证
    this.syncUserAndInitPage();
  },

  async onShow() {
    console.debug('【Profile】页面onShow触发');
    
    // 检查是否需要刷新资料
    const needRefresh = storage.get('needRefreshProfile');
    if (needRefresh) {
      console.debug('【Profile】检测到需要刷新资料标记');
      // 清除标记
      storage.remove('needRefreshProfile');
      // 强制刷新用户信息
      await this.syncUserAndInitPage();
    } else {
      // 常规显示
      this.syncUserAndInitPage();
    }
  },

  async onPullDownRefresh() {
    console.debug('【Profile】页面下拉刷新');
    this.setData({ refreshing: true });
    await this.syncUserAndInitPage();
    wx.stopPullDownRefresh();
    this.setData({ refreshing: false });
  },

  // 同步用户并初始化页面
  async syncUserAndInitPage() {
    this.setData({ loading: true, error: false });
    console.debug('【Profile】开始同步用户信息');
    
    try {
      // 获取openid
      const openid = this.getStorage('openid');
      if (!openid) {
        console.debug('【Profile】未找到openid，显示未登录状态');
        this.setData({ 
          userInfo: null, 
          loading: false 
        });
        return;
      }
      
      console.debug('【Profile】发送用户同步请求');
      // 使用authBehavior中的方法进行同步
      const startTime = Date.now();
      const userInfo = await this._syncUserInfo();
      const endTime = Date.now();
      console.debug(`【Profile】收到同步响应(${endTime - startTime}ms)`);
      
      if (userInfo && userInfo.id) {
        // 同步成功，更新用户信息
        console.debug('【Profile】同步成功，更新用户信息');
        
        // 更新页面数据
        this.setData({
          userInfo,
          stats: {
            posts: userInfo.post_count || 0,
            likes: userInfo.like_count || 0,
            favorites: userInfo.favorite_count || 0,
            comments: userInfo.comment_count || 0
          },
          loading: false
        });
        
        // 更新菜单项的计数值
        this.processMenuItems();
        
        // 检查未读通知
        this.checkUnreadNotifications();
      } else {
        console.debug('【Profile】同步请求失败或返回数据不完整');
        // 同步失败或返回数据不完整，清除登录状态
        this.setStorage('userInfo', null);
        this.setStorage('openid', null);
        this.setStorage('isLoggedIn', false);
        
        // 更新全局数据
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = null;
          app.globalData.openid = null;
        }
        
        // 更新页面状态
        this.setData({ 
          userInfo: null, 
          loading: false 
        });
      }
    } catch (err) {
      console.debug('【Profile】同步请求异常:', err);
      // 异常不清除登录状态，可能是网络问题
      // 显示错误提示
      this.setData({ 
        loading: false,
        error: true,
        errorMsg: '网络异常，请稍后再试'
      });
    }
  },

  // 检查是否有未读通知
  async checkUnreadNotifications() {
    const openid = storage.get('openid');
    if (!openid) return false;

    try {
      console.debug('【Profile】检查未读通知');
      const result = await this._checkUnreadNotification();
      
      if (result && result.hasUnread) {
        this.setData({
          hasUnreadNotification: true,
          unreadCount: result.count
        });
        return true;
      } else {
        this.setData({
          hasUnreadNotification: false,
          unreadCount: 0
        });
        return false;
      }
    } catch (err) {
      console.debug('检查未读通知失败:', err);
      return false;
    }
  },

  // 处理菜单项，添加统计数据
  processMenuItems() {
    const menuItems = MENU_CONFIG.CONTENT.items.map(item => {
      // 克隆对象以避免修改原始配置
      const newItem = { ...item };
      
      // 根据ID添加统计数据作为值
      if (item.id === 'posts') {
        newItem.value = this.data.stats.posts || 0;
      } else if (item.id === 'likes') {
        newItem.value = this.data.stats.likes || 0;
      } else if (item.id === 'favorites') {
        newItem.value = this.data.stats.favorites || 0;
      } else if (item.id === 'comments') {
        newItem.value = this.data.stats.comments || 0;
      }
      
      return newItem;
    });
    
    this.setData({
      menuItems,
      settingItems: MENU_CONFIG.SETTINGS.items
    });
  },

  onMenuItemTap(e) {
    const userInfo = this.data.userInfo;
    if (!userInfo) {
      this.showToast('请先登录', 'error');
      return;
    }

    const index = e.currentTarget.dataset.index;
    const item = this.data.menuItems[index];
    
    if (item && item.path) {
      nav.navigateTo(item.path);
    }
  },

  onSettingItemTap(e) {
    const userInfo = this.data.userInfo;
    if (!userInfo) {
      this.showToast('请先登录', 'error');
      return;
    }

    const index = e.currentTarget.dataset.index;
    const item = this.data.settingItems[index];
    
    if (item && item.path) {
      nav.navigateTo(item.path);
    }
  },

  onAvatarTap() {
    if (!this.data.userInfo) {
      this.login();
      return;
    }
    this.navigateToEditProfile();
  },

  // 新增：导航栏通知按钮点击事件
  onNotificationTap() {
    if (!this.data.userInfo) {
      this.showToast('请先登录', 'error');
      return;
    }
    
    nav.navigateTo('/pages/notification/notification');
  },

  // 编辑资料
  navigateToEditProfile() {
    if (!this.data.userInfo) {
      return;
    }
    
    nav.navigateTo('/pages/profile/edit/edit');
  },

  async login() {
    try {
      this.showLoading('登录中...');
      await this.wxLogin();
      await this.syncUserAndInitPage();
    } catch (err) {
      this.handleError(err, '登录失败');
    } finally {
      this.hideLoading();
    }
  },
  
  // 处理页面重试
  onRetry() {
    console.debug('【Profile】点击重试');
    this.syncUserAndInitPage();
  },

  // 用户详情页相关方法
  async loadUserData() {
    if (!this.data.userId) return;
    
    this.setData({ loading: true, error: false });
    
    try {
      // 使用userBehavior中的_getUserProfileById方法
      const userInfo = await this._getUserProfileById(this.data.userId);
      
      if (userInfo) {
        this.setData({
          otherUserInfo: {
            ...userInfo,
            create_time_formatted: formatRelativeTime(userInfo.create_time)
          },
          loading: false
        });
      } else {
        throw error.create('获取用户信息失败');
      }
    } catch (err) {
      console.debug('用户页面加载失败:', err);
      this.setData({
        error: true,
        errorMsg: err.message || '加载用户信息失败',
        loading: false
      });
    }
  },

  async handleFollow() {
    if (!this.checkLogin()) return;
    
    this.showLoading('处理中...');
    
    try {
      // 使用userBehavior中的_toggleFollow方法
      const result = await this._toggleFollow(this.data.userId);
      
      if (result) {
        this.showToast(result.is_followed ? '关注成功' : '取消关注成功', 'success');
        this.loadUserData(); // 刷新用户数据
      } else {
        throw error.create('关注操作失败');
      }
    } catch (err) {
      this.handleError(err, '关注操作失败');
    } finally {
      this.hideLoading();
    }
  }
});