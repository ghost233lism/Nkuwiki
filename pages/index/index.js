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
      // 获取存储中的用户信息，先使用本地缓存数据快速显示
      this.getUserInfoFromStorage();
      
      // 异步加载数据，不阻塞UI显示
      this.loadInitialDataAsync();
    } catch (err) {
      console.debug('首页加载出错:', err);
      this.setData({ 
        error: true,
        errorText: '加载失败，请下拉刷新重试'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 异步加载初始数据，不阻塞UI
  loadInitialDataAsync() {
    // 先加载帖子，提高用户体验
    this.loadPosts().then(() => {
      // 帖子加载完后再进行登录检查和通知检查
      this.ensureLogin(false, false).then(isLoggedIn => {
        if (isLoggedIn) {
          // 用户已登录，获取最新用户信息并检查未读通知
          this.getCurrentUserInfo(false); // 不强制刷新
          this.checkUnreadNotification();
        }
      }).catch(err => {
        console.debug('登录检查失败:', err);
      });
    });
  },

  async onShow() {
    // 检查是否需要刷新，避免重复请求
    const lastShowTime = this.data.lastShowTime || 0;
    const now = Date.now();
    
    // 设置最近显示时间
    this.setData({ lastShowTime: now });
    
    // 如果距离上次刷新时间少于10秒，不刷新内容
    if (now - lastShowTime < 10000) {
      console.debug('距离上次刷新时间小于10秒，跳过刷新');
      return;
    }
    
    // 静默检查未读通知
    const openid = storage.get('openid');
    if (openid) {
      this.checkUnreadNotification().catch(err => {
        console.debug('检查未读通知失败:', err);
      });
    }
    
    // 如果有错误或超过30秒没刷新，才刷新帖子列表
    if (this.data.error || now - lastShowTime > 30000) {
      this.setData({ error: null });
      this.refreshCategoryPosts();
    }
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
  
  // 加载帖子 - 映射到postBehavior的loadPost方法
  async loadPosts() {
    console.debug('加载首页帖子');
    try {
      // 获取当前分类ID
      const categoryId = this.data.navItems[this.data.activeTab].id;
      const params = categoryId === 'all' ? {} : { category: categoryId };
      
      // 使用postBehavior中的refreshPost方法
      await this.refreshPost(params);
      return true;
    } catch (err) {
      this.handleError(err, '加载帖子失败');
      return false;
    }
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
    // 如果正在加载，跳过
    if (this.data.loading) {
      console.debug('正在加载中，跳过初始数据加载');
      return;
    }
    
    this.setData({ loading: true, error: null });
    
    try {
      // 先尝试使用本地存储的数据
      this.getUserInfoFromStorage();
      
      // 异步加载关键数据，避免阻塞UI
      this.loadPosts().then(() => {
        // 加载完成后才检查通知
        if (storage.get('openid')) {
          this.checkUnreadNotification();
        }
      });
      
      // 后台异步获取用户信息
      this.getCurrentUserInfo(false).catch(err => {
        console.debug('获取用户信息失败:', err);
      });
    } catch (err) {
      this.handleError(err, '加载初始数据失败');
    } finally {
      this.setData({ loading: false });
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
    // 避免重复加载
    if (this.data.postLoading) {
      console.debug('正在加载中，跳过刷新');
      return;
    }
    
    this.setData({ postLoading: true });
    
    try {
      const categoryId = this.data.navItems[this.data.activeTab].id;
      const params = categoryId === 'all' ? {} : { category: categoryId };
      
      // 使用postBehavior中的refreshPost方法
      await this.refreshPost(params);
    } catch (err) {
      this.handleError(err, '刷新帖子失败');
    } finally {
      this.setData({ postLoading: false });
      wx.stopPullDownRefresh();
    }
  },

  async loadMoreCategoryPosts() {
    // 避免重复加载
    if (this.data.postLoading || !this.data.pagination.hasMore) {
      console.debug('正在加载中或已无更多数据，跳过加载更多');
      return;
    }
    
    this.setData({ postLoading: true });
    
    try {
      const categoryId = this.data.navItems[this.data.activeTab].id;
      const params = categoryId === 'all' ? {} : { category: categoryId };
      
      // 使用postBehavior中的loadMorePost方法
      await this.loadMorePost(params);
    } catch (err) {
      this.handleError(err, '加载更多帖子失败');
    } finally {
      this.setData({ postLoading: false });
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
    const postId = e.detail.postId || e.detail.id;
    if (!postId) {
      console.debug('帖子详情跳转失败: 找不到帖子ID', e.detail);
      return;
    }
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
  },

  // 处理点赞
  handleLike(e) {
    // 获取事件中的post和index数据
    const { post, index, postId } = e.detail;
    
    // 构建事件对象传给toggleLike
    let event;
    
    if (postId) {
      // 新的格式：使用postId
      event = {
        detail: {
          postId,
          index
        }
      };
    } else if (post) {
      // 旧的格式：使用post对象
      event = {
        currentTarget: {
          dataset: {
            post: post,
            index: index
          }
        }
      };
    } else {
      console.debug('点赞失败: 找不到帖子数据');
      return;
    }
    
    this.toggleLike(event);
  },

  // 处理收藏
  handleFavorite(e) {
    // 获取事件中的post和index数据
    const { post, index, postId } = e.detail;
    
    // 构建事件对象传给toggleFavorite
    let event;
    
    if (postId) {
      // 新的格式：使用postId
      event = {
        detail: {
          postId,
          index
        }
      };
    } else if (post) {
      // 旧的格式：使用post对象
      event = {
        currentTarget: {
          dataset: {
            post: post,
            index: index
          }
        }
      };
    } else {
      console.debug('收藏失败: 找不到帖子数据');
      return;
    }
    
    this.toggleFavorite(event);
  },
});