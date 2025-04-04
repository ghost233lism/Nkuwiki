const { storage, ui, error, ToastType, createApiClient } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const { parseMarkdown } = require('../../utils/markdown');

// API clients
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
  },
  suggestion: {
    method: 'GET',
    path: '/suggestion',
    params: {
      keyword: true
    }
  },
  history: {
    method: 'GET',
    path: '/history',
    params: {
      openid: true,
      limit: false
    }
  },
  clearHistory: {
    method: 'POST',
    path: '/history/clear',
    data: {
      openid: true
    }
  },
  hot: {
    method: 'GET',
    path: '/hot',
    params: {
      limit: false
    }
  }
});

Page({
  behaviors: [baseBehavior],

  data: {
    searchValue: '',
    searchHistory: [],
    searchResults: [],
    currentCategory: 'all',
    categories: [
      { id: 'all', name: '全部', icon: '/assets/icons/search/all.png' },
      { id: 'website', name: '网站', icon: '/assets/icons/search/website.png' },
      { id: 'wechat', name: '微信', icon: '/assets/icons/search/wechat.png' },
      { id: 'market', name: '集市', icon: '/assets/icons/search/market.png' },
      { id: 'douyin', name: '抖音', icon: '/assets/icons/search/douyin.png' }
    ],
    loading: false,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    }
  },

  onLoad() {
    this.loadSearchHistory();
    this.initSearchbar();
  },
  
  // 搜索框方法
  search(e) {
    const searchValue = e.detail.value;
    this.setData({ searchValue });
    this.handleSearch();
  },
  
  // 取消搜索
  cancel() {
    this.clearSearchInput();
  },

  // 输入框内容变化
  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value });
  },

  // 清空搜索框
  clearSearchInput() {
    this.setData({
      searchValue: '',
      searchResults: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        hasMore: true
      }
    });
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const searchHistory = storage.get('searchHistory') || [];
      this.setData({ searchHistory });
    } catch (err) {
      console.debug('加载搜索历史失败:', err);
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    try {
      let searchHistory = this.data.searchHistory;
      searchHistory = searchHistory.filter(item => item !== keyword);
      searchHistory.unshift(keyword);
      if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
      }
      this.setData({ searchHistory });
      storage.set('searchHistory', searchHistory);
    } catch (err) {
      console.debug('保存搜索历史失败:', err);
    }
  },

  // 清空搜索历史
  clearSearchHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await searchApi.clearHistory({
              openid: storage.get('openid')
            });
            
            this.setData({ searchHistory: [] });
            storage.remove('searchHistory');
            this.showToast('已清空搜索历史', 'success');
          } catch (err) {
            console.debug('清空搜索历史失败:', err);
          }
        }
      }
    });
  },

  // 点击历史记录
  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.handleSearch();
  },

  // 切换分类
  onCategoryChange(e) {
    const category = e.detail;
    if (category === this.data.currentCategory) return;
    
    this.setData({
      currentCategory: category,
      searchResults: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        hasMore: true
      }
    });
    
    if (this.data.searchValue) {
      this.handleSearch();
    }
  },

  // 搜索
  async handleSearch() {
    const { searchValue, currentCategory, pagination } = this.data;
    if (!searchValue.trim()) {
      this.showToast('请输入搜索关键词', 'error');
      return;
    }

    this.showLoading('搜索中...');
    this.setData({ loading: true });

    try {
      const res = await searchApi.search({
        keyword: searchValue,
        search_type: currentCategory !== 'all' ? currentCategory : undefined,
        page: pagination.page,
        limit: pagination.pageSize
      });

      if (res.code !== 200) {
        throw error.create(res.message || '搜索失败');
      }

      // 处理结果
      const data = res.data || [];
      const hasMore = data.length === pagination.pageSize;

      this.setData({
        searchResults: pagination.page === 1 ? data : [...this.data.searchResults, ...data],
        'pagination.total': res.pagination?.total || 0,
        'pagination.hasMore': hasMore
      });

      if (pagination.page === 1) {
        this.saveSearchHistory(searchValue);
      }
    } catch (err) {
      this.handleError(err, '搜索失败');
    } finally {
      this.hideLoading();
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMore() {
    if (this.data.loading || !this.data.pagination.hasMore) return;
    
    this.setData({
      'pagination.page': this.data.pagination.page + 1
    }, () => {
      this.handleSearch();
    });
  },

  // 查看详情
  viewDetail(e) {
    const { id, type } = e.detail;
    if (type === 'post') {
      this.navigateTo(`/pages/post/detail/detail?id=${id}`);
    } else if (type === 'user') {
      this.navigateTo(`/pages/profile/profile?id=${id}`);
    }
  },
  
  // 初始化搜索栏
  initSearchbar() {
    // 用于兼容自定义组件的初始化
    this.setData({
      searchBarFocus: false
    });
  }
});