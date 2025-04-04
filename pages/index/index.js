const { createApiClient } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const userBehavior = require('../../behaviors/userBehavior');
const authBehavior = require('../../behaviors/authBehavior');
const notificationBehavior = require('../../behaviors/notificationBehavior');

// 搜索API
const searchApi = createApiClient('/api/wxapp/search', {
  search: {
    method: 'GET',
    path: '',
    params: {
      keyword: true,
      search_type: false,
      page: false,
      limit: false
    }
  }
});

// 分类配置
const CATEGORY_CONFIG = [
  { category_id: 1, tag:'study', text: '学习交流' },
  { category_id: 2, tag:'life', text: '校园生活' },
  { category_id: 3, tag:'job', text: '就业创业' },
  { category_id: 4, tag:'club', text: '社团活动' },
  { category_id: 5, tag:'lost', text: '失物招领' }
];  

Page({
  behaviors: [
    baseBehavior,
    userBehavior,
    authBehavior,
    notificationBehavior
  ],

  data: {
    // 关于信息
    aboutInfo: null,
    // 用户信息
    userInfo: null,
    // 分类导航
    categoryId: 0,  // 默认不选中任何分类
    navItems: CATEGORY_CONFIG,
    // 筛选条件
    filter: {
      category_id: 0  // 默认不筛选分类
    },
    
    // 通知状态
    hasUnreadNotification: false,
    
    // 搜索相关
    searchValue: '',
    searchHistory: [],
    showSearchResult: false,
    isSearching: false,
    
    // 分类图标数据
    tabs: [
      {
        title: '学习交流',
        iconName: 'study',
        icon: '/icons/study.png'
      },
      {
        title: '校园生活',
        iconName: 'life',
        icon: '/icons/life.png'
      },
      {
        title: '就业创业',
        iconName: 'job',
        icon: '/icons/job.png'
      },
      {
        title: '社团活动',
        iconName: 'club',
        icon: '/icons/club.png'
      },
      {
        title: '失物招领',
        iconName: 'lost',
        icon: '/icons/lost.png'
      }
    ],
    retryLastOperation: null, 
  },

  async onLoad() {
    this.showLoading('加载中...', 'page');
    
    try {
      // 帖子加载完后再进行登录检查和通知检查
      this._checkLogin(false).then(isLoggedIn => {
        if (isLoggedIn) {
          // 用户已登录，获取最新用户信息并检查未读通知
          this.updateState({ 
            userInfo: this._getUserInfo(true)
          });
          this.checkUnreadNotification();
        }
      }).catch(err => {
        console.debug('登录检查失败:', err);
      });
    } catch (err) {
      console.debug('首页加载出错:', err);
      this.showError('加载失败，请下拉刷新重试');
    } finally {
      this.hideLoading();
    }
  },
  
  async onShow() {
    // 检查是否需要刷新，避免重复请求
    const lastShowTime = this.data.lastShowTime || 0;
    const now = Date.now();
    
    // 设置最近显示时间
    this.updateState({ lastShowTime: now });
    
    // 如果距离上次刷新时间少于10秒，不刷新内容
    if (now - lastShowTime < 10000) {
      console.debug('距离上次刷新时间小于10秒，跳过刷新');
      return;
    }
    
    // 静默检查未读通知
    const openid = this.getStorage('openid');
    if (openid) {
      this.checkUnreadNotification().catch(err => {
        console.debug('检查未读通知失败:', err);
      });
    }
    
    // 如果有错误或超过30秒没刷新，才刷新帖子列表
    if (this.data.error || now - lastShowTime > 30000) {
      this.hideError();
      
      // 刷新帖子列表 - 通过设置筛选条件触发post-list组件更新
      const postList = this.selectComponent('.post-list-container post-list');
      if (postList) {
        postList.setData({
          filter: { category_id: this.data.categoryId }
        });
      }
    }
  },

  onPullDownRefresh() {
    const postList = this.selectComponent('.post-list-container post-list');
    if (postList) {
      postList.loadInitialData();
    }
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    const postList = this.selectComponent('.post-list-container post-list');
    if (postList) {
      postList.loadMore();
    }
  },
  
  // 分类切换
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    
    // 如果当前选中的是该分类，再次点击取消选中（显示所有）
    if (index === this.data.categoryId) {
      this.updateState({ 
        categoryId: 0,
        filter: { category_id: 0 }
      });
    } else {
      // 否则选中点击的分类
      this.updateState({ 
        categoryId: index,
        filter: { category_id: index }
      });
    }
    
    // 更新post-list组件筛选条件
    const postList = this.selectComponent('.post-list-container post-list');
    if (postList) {
      postList.setData({
        filter: { category_id: this.data.categoryId }
      });
    }
  },
  
  // post-list组件的重试回调
  onRetry() {
    const postList = this.selectComponent('.post-list-container post-list');
    if (postList) {
      postList.loadInitialData();
    }
  },

  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  handleSearch(e) {
    const value = e.detail.value || this.data.searchValue;
    if (value) {
      this.navigateTo({
        url: `/pages/search/search?keyword=${encodeURIComponent(value)}`
      });
    }
  },

  // 处理通知点击
  onNotificationTap() {
    console.debug('进入通知页面');
    this.navigateTo({
      url: '/pages/notification/notification'
    });
  },

  // 处理头像点击
  onAvatarTap() {
    console.debug('进入个人中心');
    this.switchTab({
      url: '/pages/profile/profile'
    });
  },

  // 处理发帖按钮点击
  onCreatePost() {
    // 使用_checkLogin函数检查登录状态
    this._checkLogin(true).then(isLoggedIn => {
      if (isLoggedIn) {
        // 已登录则跳转到发帖页面
        this.navigateTo({
          url: '/pages/post/post'
        });
      }
    }).catch(err => {
      console.debug('登录检查失败:', err);
    });
  },

  async checkUnreadNotification() {
    // 使用节流控制，避免频繁请求
    const now = Date.now();
    const lastCheckTime = this.data.lastNotificationCheckTime || 0;
    
    // 如果距离上次检查少于30秒，则跳过
    if (now - lastCheckTime < 30000) {
      console.debug('距离上次检查通知时间小于30秒，跳过检查');
      return this.data.hasUnreadNotification;
    }
    
    // 记录本次检查时间
    this.setData({ lastNotificationCheckTime: now });
    
    try {
      const openid = this.getStorage('openid');
      if (!openid) return false;
      
      const res = await notificationApi.status({
        openid
      });
      
      if (res.code === 200 && res.data) {
        this.setData({
          hasUnreadNotification: res.data.has_unread
        });
        return res.data.has_unread;
      }
      
      return false;
    } catch (err) {
      console.debug('检查未读通知失败:', err);
      return false;
    }
  }
});