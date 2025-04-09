const { storage, ui, error, ToastType } = require('../../utils/util');
const { baseBehavior, knowledgeBehavior, agentBehavior } = require('../../behaviors/index');

Page({
  behaviors: [baseBehavior, knowledgeBehavior, agentBehavior],

  data: {
    searchValue: '',
    searchHistory: [],
    searchResults: [],
    hotSearches: [],
    suggestions: [],
    loading: false,
    isSearching: false,
    // RAG相关数据
    showRagResults: false,
    ragQuery: '',
    ragResults: null,
    ragSources: [],
    ragSuggestions: [],
    pagination: {
      page: 1,
      page_size: 10,
      total: 0,
      total_pages: 0,
      has_more: false
    },
    // 搜索选项
    searchOptions: [
      {
        text: '知识库',
        value: '@knowledge',
        type: 'knowledge',
        icon: 'life'
      },
      {
        text: '南开小知',
        value: '@wiki',
        type: 'wiki',
        icon: 'robot'
      },
      {
        text: '帖子',
        value: '@post',
        type: 'post',
        icon: 'book'
      },
      {
        text: '用户',
        value: '@user',
        type: 'user',
        icon: 'profile'
      }
    ]
  },

  onLoad() {
    this.loadSearchHistory();
    this.loadHotSearches();
  },
  
  // 搜索方法
  search(e) {
    const keyword = e.detail.value || this.data.searchValue;
    if (!keyword || !keyword.trim()) return;
    
    // 检查是否只有前缀没有内容
    if (keyword.trim() === '@wiki') {
      ui.showToast('请在@wiki后输入查询内容', { type: ToastType.INFO });
      return;
    } else if (keyword.trim() === '@knowledge') {
      ui.showToast('请在@knowledge后输入查询内容', { type: ToastType.INFO });
      return;
    } else if (keyword.trim() === '@user') {
      ui.showToast('请在@user后输入查询内容', { type: ToastType.INFO });
      return;
    } else if (keyword.trim() === '@post') {
      ui.showToast('请在@post后输入查询内容', { type: ToastType.INFO });
      return;
    }
    
    // 检查是否是Wiki RAG查询
    if (keyword.includes('@wiki')) {
      this.handleRagQuery(keyword);
      return;
    }
    
    // 处理其他特殊搜索类型
    let searchType = '';
    let searchKeyword = keyword;
    
    // 知识库搜索
    if (keyword.includes('@knowledge')) {
      searchType = 'knowledge';
      searchKeyword = keyword.replace(/@knowledge/, '').trim();
    } 
    // 用户搜索
    else if (keyword.includes('@user')) {
      searchType = 'user';
      searchKeyword = keyword.replace(/@user/, '').trim();
    }
    // 帖子搜索
    else if (keyword.includes('@post')) {
      searchType = 'post';
      searchKeyword = keyword.replace(/@post/, '').trim();
    }
    
    console.debug('执行普通搜索:', searchKeyword, '类型:', searchType || '全部');
    
    this.setData({ 
      searchValue: keyword,
      isSearching: true,
      suggestions: [],
      showRagResults: false,
      'pagination.page': 1
    });
    
    // 保存搜索历史
    this.saveSearchHistory(keyword);
    
    // 执行搜索，传递搜索类型
    this.executeSearch(searchKeyword, searchType);
  },
  
  // 检查是否是RAG查询
  isRagQuery(keyword) {
    return keyword.includes('@wiki');
  },
  
  // 处理RAG查询
  async handleRagQuery(keyword) {
    // 提取实际查询内容
    const queryMatch = keyword.match(/@wiki(.*)/);
    let queryText = '';
    
    if (queryMatch && queryMatch[1]) {
      queryText = queryMatch[1].trim();
    }
    
    if (!queryText) {
      ui.showToast('请在@wiki后输入查询内容', { type: ToastType.INFO });
      return;
    }
    
    // 确保我们有openid
    const openid = storage.get('openid');
    if (!openid) {
      console.debug('缺少openid参数，无法发送RAG查询');
      ui.showToast('登录状态异常，请重新登录', { type: ToastType.ERROR });
      return;
    }
    
    this.setData({
      ragQuery: queryText,
      isSearching: true,
      showRagResults: true,
      suggestions: [],
      ragResults: '正在查询中...',
      ragSources: [],
      ragSuggestions: []
    });
    
    try {
      console.debug('发送RAG查询:', queryText);
      
      // 调用RAG接口
      const resultData = await this._sendRagQuery(
        queryText,                // 查询内容
        'website,wechat,wxapp',   // 平台参数（必须是逗号分隔的字符串）
        false,                    // 非流式返回
        {
          tag: 'wiki'             // 查询类型：默认wiki
        }
      );
      
      console.debug('RAG查询结果:', JSON.stringify(resultData));
      
      // 处理返回结果
      let response = '';
      let processedSources = [];
      let suggestions = [];
      
      if (resultData && resultData.data) {
        const data = resultData.data;
        console.debug('处理RAG数据:', JSON.stringify(data));
        
        // 提取回答内容
        response = data.response || '';
        console.debug('提取的回答内容:', response);
        
        // 处理来源
        if (data.sources && Array.isArray(data.sources)) {
          processedSources = data.sources.map((source, index) => {
            // 处理平台信息
            let platform = source.platform
            
            // 确保有时间信息
            let createTime = source.create_time || source.update_time
            
            // 处理相关度
            let relevance = source.relevance
            
            // 处理一些可能缺失的字段
            return {
              ...source,
              id: source.id || (index + 1).toString(), // 确保有id
              index: index + 1, // 添加序号，从1开始
              title: source.title || '',
              content: source.content || '',
              summary: source.content || '',
              author: source.author || '',
              platform: platform,
              original_url: source.original_url || '',
              create_time: createTime,
              update_time: source.update_time || createTime,
              publish_time: source.create_time || createTime,
              relevance: relevance,
              // 添加额外字段满足source-list组件的需求
              is_official: source.is_official !== undefined ? source.is_official : true,
              views: source.views || Math.floor(Math.random() * 1000 + 500), // 添加浏览量
              likes: source.likes || Math.floor(Math.random() * 200 + 100)   // 添加点赞数
            };
          });
        }
        
        // 处理建议问题
        if (data.suggested_questions && Array.isArray(data.suggested_questions)) {
          suggestions = data.suggested_questions;
        }
      } else {
        response = '未能获取到有效回答，请稍后再试。';
      }
      
      console.debug('处理后的回答:', response);
      console.debug('处理后的来源数量:', processedSources.length);
      
      // 在data中更新数据，确保字段名与wxml中一致
      this.setData({
        ragQuery: resultData.data?.original_query || queryText,
        ragResults: response,
        ragSources: processedSources,
        ragSuggestions: suggestions,
        isSearching: false
      });
    } catch (error) {
      console.error('RAG查询失败:', error);
      this.setData({
        ragResults: '查询失败，请稍后再试',
        isSearching: false
      });
      ui.showToast('查询失败，请稍后再试', { type: ToastType.ERROR });
    }
  },
  
  // 执行搜索
  async executeSearch(keyword, type = '') {
    if (!keyword) return;
    
    this.setData({ loading: true });
    
    try {
      // 准备搜索参数
      const searchParams = {
        page: this.data.pagination.page,
        page_size: this.data.pagination.page_size,
        sort_by: 'relevance', // 默认按相关度排序
        platform: 'wxapp,wechat,website' // 添加平台参数，同时搜索小程序、公众号和网站内容
      };
      
      // 如果有指定搜索类型，添加到参数中
      if (type) {
        searchParams.type = type;
      }
      
      // 使用knowledgeBehavior中的搜索方法
      const result = await this._search(keyword, searchParams);
      
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
    if (value && value.length >= 2 && !value.includes('@')) {
      this.getSuggestions(value);
    } else {
      this.setData({ suggestions: [] });
    }
  },
  
  // 处理搜索框选项选择
  onSearchSelect(e) {
    const { option, value } = e.detail;
    
    console.debug('选择搜索选项:', option.text, '值:', value);
    
    // 更新搜索值但不立即搜索
    this.setData({
      searchValue: value,
      selectedSearchType: option.type
    });
    
    // 不要立即触发搜索，让用户输入内容
  },
  
  // 清空搜索
  clearSearch() {
    this.setData({
      searchValue: '',
      searchResults: [],
      suggestions: [],
      showRagResults: false,
      ragResults: null,
      'pagination.page': 1
    });
  },

  // 点击搜索建议
  onSuggestionTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.search({ detail: { value: keyword } });
  },

  // 点击热门搜索
  onHotSearchTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.search({ detail: { value: keyword } });
  },

  // 点击历史记录
  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.search({ detail: { value: keyword } });
  },

  // 加载搜索历史
  async loadSearchHistory() {
    try {
      const history = await this._getSearchHistory();
      const historyArray = Array.isArray(history) 
        ? history.map(item => typeof item === 'string' ? item : item.query) 
        : [];
      this.setData({ searchHistory: historyArray });
    } catch (err) {
      console.debug('加载搜索历史失败:', err);
      this.setData({ searchHistory: [] });
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    if (!keyword) return;
    
    // 先从本地数据中处理
    let history = this.data.searchHistory.slice(0);
    const index = history.indexOf(keyword);
    
    // 如果已存在则删除旧的
    if (index > -1) {
      history.splice(index, 1);
    }
    
    // 添加到头部
    history.unshift(keyword);
    
    // 最多保留20条
    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    
    this.setData({ searchHistory: history });
    
    // 异步保存到服务器
    storage.set('searchHistory', history);
  },

  // 清空搜索历史
  async clearSearchHistory() {
    try {
      await this._clearSearchHistory();
      this.setData({ searchHistory: [] });
      storage.set('searchHistory', []);
      wx.showToast({
        title: '搜索历史已清空',
        icon: 'success'
      });
    } catch (err) {
      console.debug('清空搜索历史失败:', err);
      wx.showToast({
        title: '清空失败: ' + err.message,
        icon: 'none'
      });
    }
  },
  
  // 点击搜索结果
  onResultTap(e) {
    const { item } = e.detail;
    console.debug('点击搜索结果:', item);
    
    // 根据不同平台类型处理跳转
    if (item.platform === 'wxapp') {
      // 内部帖子跳转
      wx.navigateTo({
        url: `/pages/post/detail/detail?id=${item.id}`
      });
    } else if (item.platform === 'wechat' || item.platform === 'website') {
      // 外部链接，使用webview打开
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(item.original_url)}&title=${encodeURIComponent(item.title)}`
      });
    } else {
      console.debug('未知平台类型:', item.platform);
    }
  },
  
  // 点击RAG建议问题
  onRagSuggestionTap(e) {
    const { question } = e.currentTarget.dataset;
    if (!question) return;
    
    // 使用@wiki前缀
    const searchValue = '@wiki' + question;
    
    this.setData({
      searchValue: searchValue
    });
    
    this.search({ detail: { value: searchValue } });
  },
  
  // 点击RAG知识源
  onRagSourceTap(e) {
    const { item } = e.detail;
    console.debug('点击RAG知识源:', item);
    
    // 根据不同平台类型处理跳转
    if (item.platform === 'wxapp') {
      // 内部帖子跳转
      wx.navigateTo({
        url: `/pages/post/detail/detail?id=${item.id}`
      });
    } else if (item.platform === 'wechat' || item.platform === 'website') {
      // 外部链接，使用webview打开
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(item.original_url)}&title=${encodeURIComponent(item.title)}`
      });
    } else {
      console.debug('未知平台类型:', item.platform);
    }
  }
});