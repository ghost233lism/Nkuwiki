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
    // 导航按钮配置
    navButtons: [
      {type: "notification", hasUnread: false},
      {type: "avatar"}
    ],
    // 状态栏高度
    statusBarHeight: 0,
    // 用户详情页相关数据
    userId: '',
    otherUserInfo: null
  },

  async onLoad() {
    console.debug('【Profile】页面onLoad触发');
    
    // 获取系统信息设置状态栏高度
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.setData({
        statusBarHeight: systemInfo.statusBarHeight || 0
      });
    } catch (err) {
      console.debug('获取系统信息失败', err);
    }
    
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
      // 先验证登录状态
      const startTime = Date.now();
      await this._syncUserInfo();
      
      // 获取最新的用户资料（包含统计数据）
      const profileRes = await this._getUserInfo(true);
      const endTime = Date.now();
      console.debug(`【Profile】收到用户资料响应(${endTime - startTime}ms)`);
      
      if (profileRes && profileRes.id) {
        // 更新成功，更新用户信息
        console.debug('【Profile】获取资料成功，更新用户信息', profileRes);
        
        // 存储最新用户信息
        this.setStorage('userInfo', profileRes);
        
        // 更新页面数据
        this.setData({
          userInfo: profileRes,
          stats: {
            posts: profileRes.post_count || 0,
            likes: profileRes.like_count || 0,
            favorites: profileRes.favorite_count || 0,
            comments: profileRes.comment_count || 0
          },
          loading: false
        });
        
        // 更新菜单项的计数值
        this.processMenuItems();
        
        // 检查未读通知
        this.checkUnreadNotifications();
      } else {
        console.debug('【Profile】获取用户资料失败或返回数据不完整');
        // 只有在确认是认证问题时才重置登录状态
        if (profileRes && (profileRes.code === 401 || profileRes.code === 403)) {
          console.debug('【Profile】认证失败，清除登录状态');
          this.setStorage('userInfo', null);
          this.setStorage('openid', null);
          this.setStorage('isLoggedIn', false);
          
          // 更新全局数据
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = null;
            app.globalData.openid = null;
          }
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
    try {
      const hasUnread = await this._checkUnreadNotification();
      
      // 更新通知红点状态，并同时更新navButtons中的hasUnread属性
      const navButtons = this.data.navButtons;
      for (let i = 0; i < navButtons.length; i++) {
        if (navButtons[i].type === "notification") {
          navButtons[i].hasUnread = hasUnread;
          break;
        }
      }
      
      this.setData({
        hasUnreadNotification: hasUnread,
        navButtons: navButtons
      });
      
      return hasUnread;
    } catch (err) {
      console.debug('检查未读通知出错:', err);
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

  // 功能菜单点击
  onMenuItemTap(e) {
    const { index, item } = e.detail;
    console.debug('profile#onMenuItemTap', index, item);
    this._routeMenuItem(item);
  },

  // 设置菜单点击
  onSettingItemTap(e) {
    const { index, item } = e.detail;
    console.debug('profile#onSettingItemTap', index, item);
    this._routeMenuItem(item);
  },
  
  // 功能菜单重试
  onMenuRetry() {
    console.debug('profile#onMenuRetry');
    this.loadMenus();
  },
  
  // 设置菜单重试
  onSettingRetry() {
    console.debug('profile#onSettingRetry');
    this.loadMenus();
  },

  // 自定义事件处理 - 可以捕获nav-bar组件发出的事件
  onCustomNavEvent(e) {
    const { type, button } = e.detail;
    
    switch (type) {
      case 'notification':
        console.debug('进入通知页面');
        // 默认行为已由nav-bar处理，无需额外代码
        break;
      case 'avatar':
        console.debug('进入个人中心');
        // 默认行为已由nav-bar处理，无需额外代码
        break;
      default:
        break;
    }
  },

  navigateToEditProfile() {
    if (!this.data.userInfo) {
      return;
    }
    
    this.navigateTo('/pages/profile/edit/edit');
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
  },

  // 处理菜单项点击路由
  _routeMenuItem(item) {
    if (!item) return;
    
    const userInfo = this.data.userInfo;
    // 对于需要登录的菜单项，先检查登录状态
    if (item.requireLogin && !userInfo) {
      this.showToast('请先登录', 'error');
      return;
    }
    
    // 导航到指定路径
    if (item.path) {
      nav.navigateTo(item.path);
    }
  }
});