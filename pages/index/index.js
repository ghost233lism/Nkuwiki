const behaviors = require('../../behaviors/index');

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
    tabItems:  [
      { category_id: 1, tag:'study', text: '学习交流' },
      { category_id: 2, tag:'life', text: '校园生活' },
      { category_id: 3, tag:'job', text: '就业创业' },
      { category_id: 4, tag:'club', text: '社团活动' },
      { category_id: 5, tag:'lost', text: '失物招领' }
    ],  
    // 筛选条件
    filter: {
      category_id: 0  // 默认不筛选分类
    },
    
    // 搜索相关
    searchValue: '',
    searchHistory: [],
    showSearchResult: false,
    isSearching: false,
    loading: false,
    loadingText: '',
    loadingType: '',
    error: false,
    errorText: '',
  },

  async onLoad() {
    this.setData({
      loading: true,
      loadingText: '加载中...',
      loadingType: 'page'
    });
    
    try {
      // 帖子加载完后再进行登录检查和通知检查
      this._checkLogin(false).then(isLoggedIn => {
        if (isLoggedIn) {
          // 用户已登录，获取最新用户信息并检查未读通知
          this.updateState({ 
            userInfo: this._getUserInfo(true)
          });
        }
      }).catch(err => {
        console.debug('登录检查失败', err);
      });
    } catch (err) {
      this.setData({
        error: true,
        errorText: '加载失败，请下拉刷新重试'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },
  
  async onShow() {
    try {
      // 不管时间间隔，始终刷新帖子状态，确保从任何页面返回时数据一致
      console.log('刷新帖子');
      const postList = this.selectComponent('#postList');
      if (postList) {
        setTimeout(async () => {
          await postList.refresh();
        }, 200);
      }
    } catch (err) {
      console.debug('onShow错误:', err);
    }
  },

  onPullDownRefresh() {
    const postList = this.selectComponent('#postList');
    if (postList) {
      // 直接加载第一页最新数据，并强制刷新
      postList.loadInitialData(true).then(() => {
      }).catch(err => {
      }).finally(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onReachBottom() {
    const postList = this.selectComponent('#postList');
    if (postList) {
      postList.loadMore();
    }
  },
  
  // 处理category-tab组件的change事件
  onCategoryTabChange(e) {
    const { index, tab } = e.detail;
    const categoryId = tab.category_id;
    
    // 检查是否重复点击当前选中的分类
    if (categoryId === this.data.categoryId) {
      // 重复点击同一分类，应该取消选择
      this.switchCategory(0); // 传入0表示取消选择任何分类
    } else {
      // 点击不同分类，正常切换
      this.switchCategory(categoryId);
    }
  },

  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },
  
  clearSearch() {
    this.setData({
      searchValue: ''
    });
  },

  search() {
    const value = this.data.searchValue;
    if (value) {
      this.navigateTo({
        url: `/pages/search/search?keyword=${encodeURIComponent(value)}`
      });
    }
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
        wx.navigateTo({
          url: '/pages/post/post',
          fail: (err) => {
          }
        });
      } else {
      }
    }).catch(err => {
    });
  },

  // 统一处理分类切换
  switchCategory(categoryId) {
    // 一次性更新所有状态，避免多次渲染导致闪烁
    this.setData({
      categoryId,
      filter: {
        category_id: categoryId
      }
    });

    // 刷新帖子列表，直接设置filter属性
    const postList = this.selectComponent('#postList');
    if (postList) {
      postList.setData({
        filter: {
          category_id: categoryId
        }
      });
    }
  },
});
