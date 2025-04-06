const { createApiClient } = require('../../utils/util');
const behaviors = require('../../behaviors/index');
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
    behaviors.baseBehavior,
    behaviors.authBehavior, 
    behaviors.userBehavior,
    behaviors.postBehavior,
    behaviors.notificationBehavior
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
    try {
      // 检查是否需要刷新，避免重复请求
      const lastShowTime = this.data.lastShowTime || 0;
      const now = Date.now();
      
      // 设置最近显示时间
      this.updateState({ lastShowTime: now });
      
      // 先刷新所有帖子的状态（不管是否刚加载）
      // 延迟执行确保DOM已更新
      setTimeout(() => {
        this._refreshPostStatus();
      }, 100);
      
      // 检查全局变量是否需要刷新
      const app = getApp();
      const refreshFromGlobal = app && app.globalData && app.globalData.refreshPostList;
      
      // 检查是否刚发布了新帖子或全局变量标记了需要刷新
      const needRefreshPosts = this.getStorage('needRefreshPosts') || refreshFromGlobal;
      if (needRefreshPosts) {
        console.debug('检测到新发布的帖子，刷新列表');
        // 清除标记
        this.setStorage('needRefreshPosts', false);
        if (refreshFromGlobal) {
          app.globalData.refreshPostList = false;
        }
        
        // 刷新帖子列表
        const postList = this.selectComponent('#postList');
        if (postList) {
          setTimeout(() => {
            postList.loadInitialData();
          }, 200);
        }
        return;
      }
      
      // 静默检查未读通知
      const openid = this.getStorage('openid');
      if (openid) {
        this.checkUnreadNotification().
            then(res=>{
              console.log(res);
        }).catch(err => {
          console.debug('检查未读通知失败:', err);
        });
      }
      
      // 如果有错误或超过30秒没刷新，才刷新帖子列表
      if (this.data.error || now - lastShowTime > 30000) {
        this.hideError();
        
        // 刷新帖子列表 - 通过设置筛选条件触发post-list组件更新
        const postList = this.selectComponent('#postList');
        if (postList) {
          postList.setData({
            filter: { category_id: this.data.categoryId }
          });
        }
      }
    } catch (err) {
      console.debug('onShow 执行出错:', err);
    }
  },

  onPullDownRefresh() {
    const postList = this.selectComponent('#postList');
    if (postList) {
      postList.loadInitialData();
    }

    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    const postList = this.selectComponent('#postList');
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
    const postList = this.selectComponent('#postList');
    if (postList) {
      postList.setData({
        filter: { category_id: this.data.categoryId }
      });
    }
  },
  
  // post-list组件的重试回调
  onRetry() {
    const postList = this.selectComponent('#postList');
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
  // 处理发帖按钮点击
  onCreatePost() {
    // 使用_checkLogin函数检查登录状态
    this._checkLogin(true).then(isLoggedIn => {
      if (isLoggedIn) {
        // 已登录则跳转到发帖页面
        console.debug('登录状态验证成功，跳转到发帖页面');
        wx.navigateTo({
          url: '/pages/post/post',
          fail: (err) => {
            console.error('跳转到发帖页面失败:', err);
          }
        });
      } else {
        console.debug('登录状态验证失败，需要先登录');
      }
    }).catch(err => {
      console.error('登录检查过程发生错误:', err);
    });
  },

  async checkUnreadNotification() {
    try {
      const result = await this._checkUnreadNotification();
      const hasUnread = result && result.hasUnread;
      
      this.updateState({
        hasUnreadNotification: hasUnread
      });
      
      return hasUnread;
    } catch (err) {
      console.debug('检查未读通知出错:', err);
      return false;
    }
  },

  // 刷新帖子状态
  async _refreshPostStatus() {
    try {
      console.debug('开始刷新帖子状态');
      const postList = this.selectComponent('#postList');
      
      if (!postList) {
        console.debug('未找到post-list组件');
        return;
      }
      
      console.debug('post-list组件已找到');
      
      // 直接获取帖子列表
      const posts = postList.data.post;
      console.debug('当前帖子列表:', posts ? posts.length : 0);
      
      if (!posts || posts.length === 0) {
        console.debug('帖子列表为空，不发送状态请求');
        return;
      }
      
      // 获取用户登录状态
      const openid = this.getStorage('openid');
      if (!openid) {
        console.debug('用户未登录，不获取交互状态');
        return;
      }
      
      // 直接调用updatePostsStatus并等待结果
      await postList.updatePostsStatus(posts);
      console.debug('帖子状态刷新完成');
    } catch (err) {
      console.debug('刷新帖子状态发生错误:', err);
    }
  },

  // 处理导航栏按钮点击
  onNavButtonTap(e) {
    const { type } = e.detail;
    
    switch (type) {
      case 'avatar':
        this.navigateTo({ url: '/pages/profile/profile' });
        break;
      case 'notification':
        this.navigateTo({ url: '/pages/notification/notification' });
        break;
      default:
        break;
    }
  },
});