const { 
  ui, 
  error, 
  ToastType, 
  storage, 
  createApiClient, 
  get,
  getOpenID
} = require('../../utils/util');
const baseBehavior = require('../../behaviors/base-behavior');
const postBehavior = require('../../behaviors/post-behavior');
const commentBehavior = require('../../behaviors/comment-behavior');
const userBehavior = require('../../behaviors/user-behavior');
const authBehavior = require('../../behaviors/auth-behavior');

// 通知API
const notificationApi = createApiClient('/api/wxapp/notification', {
  count: {
    method: 'GET',
    path: '/count',
    params: {
      openid: true
    }
  },
  status: {
    method: 'GET',
    path: '/status',
    params: {
      openid: true
    }
  }
});

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
  { id: 'all', name: '全部' },
  { id: 'study', name: '学习交流' },
  { id: 'life', name: '校园生活' },
  { id: 'job', name: '就业创业' },
  { id: 'club', name: '社团活动' },
  { id: 'lost', name: '失物招领' }
];

Page({
  behaviors: [
    baseBehavior,
    postBehavior,
    commentBehavior,
    userBehavior,
    authBehavior
  ],

  data: {
    // 分类导航
    activeTab: 0,
    navItems: CATEGORY_CONFIG,
    
    // 通知状态
    hasUnreadNotification: false,
    
    // 搜索相关
    searchValue: '',
    searchHistory: [],
    showSearchResult: false,
    isSearching: false,
    
    // 页面状态
    loading: false,
    error: null,
    
    // 用户信息
    userInfo: null,
    currentOpenid: '',

    // 使用postBehavior中的posts和相关状态
    
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
    ]
  },

  async onLoad() {
    this.setData({ loading: true });
    
    try {
      // 初始化分类
      await this.initCategories();
      
      // 登录检查 - 使用async验证以确保服务器端检查
      if (await this.ensureLogin(false, false)) {
        // 获取用户信息
        const userInfo = await this.getCurrentUserInfo(true); // 强制刷新
        this.setData({ userInfo });
        // 检查未读通知
        await this.checkUnreadNotification();
      }
      
      // 不管登录状态，都加载帖子
      await this.loadPosts();
    } catch (err) {
      console.debug('首页加载失败:', err);
      this.setData({ 
        error: true,
        errorText: '加载失败，请下拉刷新重试'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onShow() {
    this.setData({ error: null });
    
    // 登录检查 - 使用async验证以确保服务器端检查
    if (await this.ensureLogin(false, false)) {
      // 检查未读通知
      await this.checkUnreadNotification();
    }
    
    // 无论如何都刷新帖子列表
    this.refreshCategoryPosts();
  },

  onPullDownRefresh() {
    this.refreshCategoryPosts();
  },

  onReachBottom() {
    this.loadMoreCategoryPosts();
  },

  // 获取存储中的用户信息
  getUserInfoFromStorage() {
    const userInfo = storage.get('userInfo');
    if (userInfo) {
      // 如果没有头像，使用默认头像
      if (!userInfo.avatar) {
        userInfo.avatar = '/icons/default-avatar.png';
      }
      this.setData({ userInfo });
    }
  },

  // 错误处理方法
  handleError(err, defaultMsg = '操作失败') {
    console.error('发生错误:', err);
    const errMsg = err.message || defaultMsg;
    this.setData({
      loading: false,
      error: errMsg
    });
  },
  
  // 重试按钮处理
  onRetry() {
    console.debug('点击重试按钮');
    this.setData({ error: null });
    this.loadPosts();
  },
  
  // 关闭错误提示
  onErrorClose() {
    this.setData({ error: null });
  },

  async loadInitialData() {
    this.setData({ loading: true, error: null });
    try {
      // 并行加载数据
      await Promise.all([
        this.loadInitialPosts(),
        this.checkUnreadNotification(),
        this.getCurrentUserInfo()
      ]);
    } catch (err) {
      this.handleError(err, '加载初始数据失败');
    }
  },

  // 获取用户信息
  async getCurrentUserInfo(forceRefresh = false) {
    try {
      const userInfo = await this.getUserInfo(forceRefresh);
      if (userInfo) {
        this.setData({ userInfo });
        // 缓存用户信息
        storage.set('userInfo', userInfo);
      }
    } catch (err) {
      console.debug('获取用户信息失败:', err);
      // 尝试从缓存获取
      this.getUserInfoFromStorage();
    }
  },

  async loadInitialPosts() {
    try {
      // 获取当前分类ID
      const categoryId = this.data.navItems[this.data.activeTab].id;
      const params = categoryId === 'all' ? {} : { category: categoryId };
      
      // 使用postBehavior中的refreshPost方法
      await this.refreshPost(params);
      
      this.setData({ loading: false });
    } catch (err) {
      this.handleError(err, '加载帖子失败');
    }
  },

  async refreshCategoryPosts() {
    try {
      const categoryId = this.data.navItems[this.data.activeTab].id;
      const params = categoryId === 'all' ? {} : { category: categoryId };
      
      // 使用postBehavior中的refreshPost方法
      await this.refreshPost(params);
      
      wx.stopPullDownRefresh();
    } catch (err) {
      this.handleError(err, '刷新帖子失败');
      wx.stopPullDownRefresh();
    }
  },

  async loadMoreCategoryPosts() {
    try {
      const categoryId = this.data.navItems[this.data.activeTab].id;
      const params = categoryId === 'all' ? {} : { category: categoryId };
      
      // 使用postBehavior中的loadMorePost方法
      await this.loadMorePost(params);
    } catch (err) {
      this.handleError(err, '加载更多帖子失败');
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
      wx.navigateTo({
        url: `/pages/search/search?keyword=${encodeURIComponent(value)}`
      });
    }
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    if (index === this.data.activeTab) return;
    
    this.setData({
      activeTab: index,
      loading: true,
      error: null
    });
    
    this.refreshCategoryPosts();
  },

  // 处理通知点击
  onNotificationTap() {
    console.debug('进入通知页面');
    wx.navigateTo({
      url: '/pages/notification/notification'
    });
  },

  // 处理头像点击
  onAvatarTap() {
    console.debug('进入个人中心');
    wx.switchTab({
      url: '/pages/profile/profile'
    });
  },

  async checkUnreadNotification() {
    try {
      const openid = storage.get('openid');
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
  },

  handlePostTap(e) {
    const { postId } = e.detail;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`
    });
  },

  handleLoadMore() {
    this.loadMoreCategoryPosts();
  },

  handleEmptyBtnTap() {
    // 跳转到发帖页
    wx.navigateTo({
      url: '/pages/post/post'
    });
  },

  handleUserTap(e) {
    const { userId } = e.detail;
    this.navigateToUserProfile(userId);
  }
});