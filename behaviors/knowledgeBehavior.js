/**
 * 知识库行为 - 整合knowledge路径的API交互
 */
const { storage, createApiClient } = require('../utils/util');

// 创建知识库API客户端
const knowledgeApi = createApiClient('/api/knowledge', {
  search: { 
    method: 'GET', 
    path: '/search', 
    params: { query: true, openid: true }
  },
  searchWxapp: { 
    method: 'GET', 
    path: '/search-wxapp', 
    params: { query: true, openid: true }
  },
  suggestion: { 
    method: 'GET', 
    path: '/suggestion', 
    params: { query: true, openid: true }
  },
  history: { 
    method: 'GET', 
    path: '/history', 
    params: { openid: true }
  },
  clearHistory: { 
    method: 'POST', 
    path: '/history/clear', 
    params: { openid: true }
  },
  hot: { 
    method: 'GET', 
    path: '/hot', 
    params: { openid: true }
  }
});

module.exports = Behavior({
  methods: {
    /**
     * 综合搜索
     * @param {string} query 搜索关键词
     * @param {object} options 搜索选项
     * @param {string} options.platform 平台标识，可选值：wechat/website/market/wxapp
     * @param {string} options.tag 标签，多个用逗号分隔
     * @param {number} options.max_results 单表最大结果数
     * @param {number} options.page 分页页码
     * @param {number} options.page_size 每页结果数
     * @param {string} options.sort_by 排序方式：relevance-相关度，time-时间
     * @returns {Promise<object>} 搜索结果
     */
    async _search(query, options = {}) {
      if (!query || !query.trim()) {
        return null;
      }
      
      const { get } = require('../utils/util');
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('搜索需要用户登录');
        return null;
      }
      
      try {
        // 构建请求参数
        const params = {
          query: query.trim(),
          openid
        };
        
        // 添加可选参数
        if (options.platform) params.platform = options.platform;
        if (options.tag) params.tag = options.tag;
        if (options.max_results) params.max_results = options.max_results;
        if (options.page) params.page = options.page;
        if (options.page_size) params.page_size = options.page_size;
        if (options.sort_by) params.sort_by = options.sort_by;
        
        // 直接调用API接口
        const res = await get('/api/knowledge/search', params);
        
        console.debug('搜索API响应:', JSON.stringify(res));
        
        if (res.code !== 200) {
          throw new Error(res.message || '搜索失败');
        }
        
        return {
          data: res.data || [],
          pagination: res.pagination || {
            total: res.total || 0,
            page: params.page || 1,
            page_size: params.page_size || 10,
            total_pages: Math.ceil((res.total || 0) / (params.page_size || 10)),
            has_more: ((params.page || 1) * (params.page_size || 10)) < (res.total || 0)
          }
        };
      } catch (err) {
        console.debug('搜索API失败:', err);
        return null;
      }
    },

    /**
     * 小程序专用搜索
     * @param {string} query 搜索关键词
     * @param {number} page 分页页码
     * @param {number} page_size 每页条数
     * @returns {Promise<object>} 搜索结果
     */
    async _searchWxapp(query, page = 1, page_size = 10) {
      if (!query || !query.trim()) {
        return null;
      }
      
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('搜索需要用户登录');
        return null;
      }

      try {
        const res = await knowledgeApi.searchWxapp({
          query: query.trim(),
          openid,
          page,
          page_size
        });
        
        if (res.code !== 200) {
          throw new Error(res.message || '搜索失败');
        }
        
        return {
          data: res.data?.results || [],
          pagination: res.data?.pagination || {
            total: 0,
            page,
            page_size,
            total_pages: 0,
            has_more: false
          }
        };
      } catch (err) {
        console.debug('小程序搜索失败:', err);
        return null;
      }
    },
    
    /**
     * 获取搜索建议
     * @param {string} query 搜索前缀
     * @param {number} page_size 返回结果数量
     * @returns {Promise<string[]>} 搜索建议列表
     */
    async _getSuggestions(query, page_size = 5) {
      if (!query || !query.trim()) {
        return [];
      }
      
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('获取搜索建议需要用户登录');
        return [];
      }

      try {
        const res = await knowledgeApi.suggestion({
          query: query.trim(),
          openid,
          page_size
        });
        
        if (res.code !== 200) {
          throw new Error(res.message || '获取搜索建议失败');
        }
        
        return res.data || [];
      } catch (err) {
        console.debug('获取搜索建议失败:', err);
        return [];
      }
    },
    
    /**
     * 获取搜索历史
     * @param {number} page_size 返回结果数量
     * @returns {Promise<object[]>} 搜索历史列表
     */
    async _getSearchHistory(page_size = 10) {
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('获取搜索历史需要用户登录');
        return [];
      }

      try {
        const res = await knowledgeApi.history({
          openid,
          page_size
        });
        
        if (res.code !== 200) {
          throw new Error(res.message || '获取搜索历史失败');
        }
        
        return res.data || [];
      } catch (err) {
        console.debug('获取搜索历史失败:', err);
        return [];
      }
    },
    
    /**
     * 清除搜索历史
     * @returns {Promise<boolean>} 是否成功
     */
    async _clearSearchHistory() {
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('清除搜索历史需要用户登录');
        return false;
      }

      try {
        const res = await knowledgeApi.clearHistory({ openid });
        return res.code === 200;
      } catch (err) {
        console.debug('清除搜索历史失败:', err);
        return false;
      }
    },
    
    /**
     * 获取热门搜索关键词
     * @param {number} page_size 返回结果数量
     * @returns {Promise<object[]>} 热门搜索关键词列表
     */
    async _getHotSearches(page_size = 10) {
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('获取热门搜索需要用户登录');
        return [];
      }

      try {
        const res = await knowledgeApi.hot({
          openid,
          page_size
        });
        
        console.debug('热门搜索接口响应:', JSON.stringify(res));
        
        if (res.code !== 200) {
          throw new Error(res.message || '获取热门搜索失败');
        }
        
        return res.data || [];
      } catch (err) {
        console.debug('获取热门搜索失败:', err);
        return [];
      }
    }
  }
}); 