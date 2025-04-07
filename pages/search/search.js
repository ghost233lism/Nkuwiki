const { storage, ui, error, ToastType } = require('../../utils/util');
const { baseBehavior, knowledgeBehavior } = require('../../behaviors/index');

Page({
  behaviors: [baseBehavior, knowledgeBehavior],

  data: {
    searchValue: '',
    searchHistory: [],
    searchResults: [],
    hotSearches: [],
    suggestions: [],
    loading: false,
    isSearching: false,
    pagination: {
      page: 1,
      page_size: 10,
      total: 0,
      total_pages: 0,
      has_more: false
    }
  },

  onLoad() {
    this.loadSearchHistory();
    this.loadHotSearches();
  },
  
  // 搜索方法
  search(e) {
    const keyword = e.detail.value || this.data.searchValue;
    if (!keyword || !keyword.trim()) return;
    
    this.setData({ 
      searchValue: keyword,
      isSearching: true,
      suggestions: [],
      'pagination.page': 1
    });
    
    // 保存搜索历史
    this.saveSearchHistory(keyword);
    
    // 执行搜索
    this.executeSearch(keyword);
  },
  
  // 执行搜索
  async executeSearch(keyword) {
    if (!keyword) return;
    
    this.setData({ loading: true });
    
    try {
      // 使用knowledgeBehavior中的搜索方法
      const result = await this._search(
        keyword, 
        {
          page: this.data.pagination.page,
          page_size: this.data.pagination.page_size,
          sort_by: 'relevance', // 默认按相关度排序
          platform: 'wxapp,wechat,website' // 添加平台参数，同时搜索小程序、公众号和网站内容
        }
      );
      
      console.debug('搜索结果数据:', JSON.stringify(result));
      
      if (result && result.data) {
        // 处理搜索结果，确保每个结果项都有必要的字段
        const processedResults = result.data.map(item => {
          // 确保有作者信息
          if (!item.author && item.source_name) {
            item.author = item.source_name;
          }
          
          // 确保有时间信息
          if (!item.create_time && item.update_time) {
            item.create_time = item.update_time;
          }
          
          // 确保有发布时间
          if (!item.publish_time && item.create_time) {
            item.publish_time = item.create_time;
          }
          
          // 处理相关度字段 - 确保它是一个0-1之间的数值
          if (typeof item.relevance === 'string') {
            // 如果是百分比格式的字符串 (例如 "90%")
            if (item.relevance.endsWith('%')) {
              item.relevance = parseFloat(item.relevance) / 100;
            } else {
              // 尝试直接解析为数字
              item.relevance = parseFloat(item.relevance);
            }
          }
          // 确保相关度值在0-1之间
          if (typeof item.relevance === 'number' && item.relevance > 1) {
            item.relevance = item.relevance / 100;
          }
          
          // 确保有平台信息
          if (!item.platform) {
            // 根据来源或URL猜测平台
            if (item.source_name && item.source_name.includes('公众号')) {
              item.platform = 'wechat';
            } else if (item.original_url && item.original_url.includes('mp.weixin.qq.com')) {
              item.platform = 'wechat';
            } else if (item.type === 'post') {
              item.platform = 'website';
            } else {
              item.platform = 'website'; // 默认为网站
            }
          }
          
          return item;
        });
        
        // 如果是第一页，直接替换结果，否则追加
        const newResults = this.data.pagination.page === 1 
          ? processedResults 
          : [...this.data.searchResults, ...processedResults];
        
        // 更新分页信息
        const pagination = result.pagination || {};
        
        this.setData({
          searchResults: newResults,
          pagination: {
            page: this.data.pagination.page,
            page_size: this.data.pagination.page_size,
            total: pagination.total || 0,
            total_pages: pagination.total_pages || 0,
            has_more: this.data.pagination.page < (pagination.total_pages || 1)
          },
          isSearching: false
        });
      } else {
        throw new Error('搜索失败');
      }
    } catch (err) {
      console.debug('搜索失败:', err);
      wx.showToast({
        title: '搜索失败: ' + (err.message || '未知错误'),
        icon: 'none'
      });
    } finally {
      this.setData({ 
        loading: false,
        isSearching: false
      });
    }
  },
  
  // 加载热门搜索
  async loadHotSearches() {
    try {
      const hotSearches = await this._getHotSearches(10);
      console.debug('热门搜索数据:', JSON.stringify(hotSearches));
      this.setData({ hotSearches });
    } catch (err) {
      console.debug('加载热门搜索失败:', err);
    }
  },
  
  // 获取搜索建议
  async getSuggestions(keyword) {
    if (!keyword || keyword.length < 2) {
      this.setData({ suggestions: [] });
      return;
    }
    
    try {
      const suggestions = await this._getSuggestions(keyword);
      this.setData({ suggestions });
    } catch (err) {
      console.debug('获取搜索建议失败:', err);
      this.setData({ suggestions: [] });
    }
  },
  
  // 加载更多
  loadMore() {
    if (this.data.loading || !this.data.pagination.has_more) return;
    
    this.setData({
      'pagination.page': this.data.pagination.page + 1
    }, () => {
      this.executeSearch(this.data.searchValue);
    });
  },
  
  // 输入变化
  onSearchInput(e) {
    const value = e.detail.value;
    this.setData({ searchValue: value });
    
    // 获取搜索建议
    if (value && value.length >= 2) {
      this.getSuggestions(value);
    } else {
      this.setData({ suggestions: [] });
    }
  },
  
  // 清空搜索
  clearSearch() {
    this.setData({
      searchValue: '',
      searchResults: [],
      suggestions: [],
      isSearching: false,
      pagination: {
        page: 1,
        page_size: 10,
        total: 0,
        total_pages: 0,
        has_more: false
      }
    });
  },

  // 加载搜索历史
  async loadSearchHistory() {
    try {
      const searchHistory = await this._getSearchHistory(10);
      this.setData({ 
        searchHistory: Array.isArray(searchHistory) ? 
          searchHistory.map(item => typeof item === 'string' ? item : item.query) : 
          [] 
      });
    } catch (err) {
      console.debug('加载搜索历史失败:', err);
      // 尝试从本地存储获取
      const localHistory = storage.get('searchHistory') || [];
      this.setData({ searchHistory: localHistory });
    }
  },

  // 保存搜索历史 - 同时保存到本地和服务器
  saveSearchHistory(keyword) {
    try {
      let searchHistory = this.data.searchHistory || [];
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
  async clearSearchHistory() {
    try {
      await this._clearSearchHistory();
      this.setData({ searchHistory: [] });
      storage.remove('searchHistory');
    } catch (err) {
      console.debug('清空搜索历史失败:', err);
    }
  },

  // 点击历史记录
  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.search({ detail: { value: keyword } });
  },
  
  // 点击搜索建议
  onSuggestionTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ 
      searchValue: keyword,
      suggestions: []
    });
    this.search({ detail: { value: keyword } });
  },
  
  // 点击热门搜索
  onHotSearchTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.search({ detail: { value: keyword } });
  },

  // 点击搜索结果
  onResultTap(e) {
    const { item } = e.detail;
    if (!item) return;
    
    // 根据结果类型跳转到不同页面
    if (item.type === 'post') {
      wx.navigateTo({
        url: `/pages/post/detail/detail?id=${item.id}`
      });
    } else if (item.url) {
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(item.url)}`
      });
    } else {
      wx.showToast({
        title: '点击了结果: ' + item.id,
        icon: 'none'
      });
    }
  }
})