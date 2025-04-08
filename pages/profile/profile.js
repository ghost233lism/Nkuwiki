const behaviors = require('../../behaviors/index');
const { getAboutInfo, getOpenID } = require('../../utils/util');
// 常量配置
const MENU_CONFIG = {
  SETTINGS: {
    items: [
      {
        id: 'about',
        icon: true,
        iconName: 'about',
        title: '关于我们',
        path: '/pages/about/about'
      },
      {
        id: 'setting',
        icon: true,
        iconName: 'setting',
        title: '设置',
        path: '/pages/profile/setting/setting'
      },
      {
        id: 'feedback',
        icon: true,
        iconName: 'feedback',
        title: '反馈',
        path: '/pages/profile/feedback/feedback'
      },
      {
        id: 'logout',
        icon: true,
        iconName: 'logout',
        title: '退出登录',
        path: '/pages/profile/logout/logout'
      }
    ]
  }
};

Page({
  behaviors: [
    behaviors.baseBehavior,
    behaviors.authBehavior, 
    behaviors.userBehavior,
    behaviors.notificationBehavior,
    behaviors.weuiBehavior
  ],

  data: {
    userInfo: null,
    openid: '',
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
    settingItems: [],
    hasUnreadNotification: false,
    // 状态栏高度
    statusBarHeight: 0,
    // 用户详情页相关数据
    userId: '',
    otherUserInfo: null
  },

  async onLoad() {
    // 获取系统信息设置状态栏高度
    try {
      // 使用新API替代已废弃的getSystemInfoSync
      const windowInfo = wx.getWindowInfo();
      this.setData({
        statusBarHeight: windowInfo.statusBarHeight || 0
      });
    } catch (err) {}
    
    // 准备菜单数据
    await this.processMenuItems();
    
    // 加载用户数据
    await this.syncUserAndInitPage();
  },

  async onShow() {
    // 只检查通知状态，用户信息由user-card组件自行检查刷新
    this.checkUnreadNotifications();
  },

  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    await this.syncUserAndInitPage();
    wx.stopPullDownRefresh();
    this.setData({ refreshing: false });
  },

  // 同步用户并初始化页面
  async syncUserAndInitPage() {
    this.setData({ loading: true, error: false });
    
    try {
      // 获取openid
      const openid = await getOpenID();
      this.setData({ openid: openid || '' });
      
      if (!openid) {
        this.setData({ 
          userInfo: null, 
          loading: false 
        });
        return;
      }
      
      // 先验证登录状态
      await this._syncUserInfo();
      
      // 获取最新的用户资料（包含统计数据）
      const profileRes = await this._getUserInfo(true);
      
      if (profileRes && profileRes.id) {
        // 更新本地存储
        this.setStorage('userInfo', profileRes);
        
        // 更新全局数据
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = profileRes;
        }
        
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
        
        this.processMenuItems();
        
        // 检查未读通知
        this.checkUnreadNotifications();
      } else {
        // 只有在确认是认证问题时才重置登录状态
        if (profileRes && (profileRes.code === 401 || profileRes.code === 403)) {
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
      // 异常不清除登录状态，可能是网络问题
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
      
      // 更新通知红点状态和navButtons
      const navButtons = [...this.data.navButtons];
      for (let i = 0; i < navButtons.length; i++) {
        if (navButtons[i].type === "notification") {
          navButtons[i].hasUnread = hasUnread;
          break;
        }
      }
      
      this.setData({
        hasUnreadNotification: hasUnread,
        navButtons
      });
      
      return hasUnread;
    } catch (err) {
      return false;
    }
  },

  // 处理菜单项
  async processMenuItems() {
    try {
      // 获取应用信息
      const appInfo = await getAboutInfo();
      const version = appInfo ? `版本 ${appInfo.version}` : '版本 0.0.1';
      
      // 设置菜单添加额外内容
      const settingItems = MENU_CONFIG.SETTINGS.items.map(item => {
        const newItem = { ...item };
        
        // 添加版本信息到"关于我们"
        if (item.id === 'about') {
          newItem.extraContent = version;
        }
        
        return newItem;
      });
      
      this.setData({
        settingItems
      });
    } catch (err) {
      console.error('获取版本信息失败:', err);
      // 使用默认菜单
      const settingItems = MENU_CONFIG.SETTINGS.items.map(item => {
        const newItem = { ...item };
        if (item.id === 'about') {
          newItem.extraContent = '版本 0.0.1';
        }
        return newItem;
      });
      
      this.setData({
        settingItems
      });
    }
  },

  // 设置菜单点击
  onSettingItemTap(e) {
    const { item } = e.detail;
    this._routeMenuItem(item);
  },
  
  // 设置菜单重试
  onSettingRetry() {
    this.processMenuItems();
  },

  // 导航到编辑页面
  navigateToEditProfile() {
    if (!this.data.userInfo) return;
    this.navigateTo('/pages/profile/edit/edit');
  },

  
  // 页面重试
  onRetry() {
    this.syncUserAndInitPage();
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
      this.navigateTo(item.path);
    }
  }
});