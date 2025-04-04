const baseBehavior = require('../../behaviors/baseBehavior');
const postBehavior = require('../../behaviors/postBehavior');

Component({
  behaviors: [baseBehavior, postBehavior],

  properties: {
    // 筛选条件
    filter: {
      type: Object,
      value: {
        category_id: 0 // 默认不筛选分类
      }
    }
  },

  data: {
    // 帖子列表
    post: [],
    
    // 基础状态
    loading: false,
    error: false,
    errorText: '加载失败，请稍后再试',
    empty: true,
    emptyText: '暂无数据',
    
    // 分页状态
    page: 1,
    pageSize: 10,
    hasMore: true,
    loadingMore: false,
    
    // 加载状态
    loadingText: '加载中...',
    
    // 按钮相关配置
    noMoreText: '没有更多数据了'
  },

  lifetimes: {
    attached() {
      console.debug('post-list组件已附加');
      this.loadInitialData();
    },
    
    detached() {
      console.debug('post-list组件已卸载');
    }
  },

  observers: {
    'filter': function(filter) {
      // 当筛选条件变化时重新加载数据
      if (filter) {
        this.loadInitialData();
      }
    }
  },

  methods: {
    // 重置分页
    resetPagination() {
      this.setData({
        page: 1,
        hasMore: true
      });
    },
    
    // 加载初始数据
    async loadInitialData() {
      try {
        this.showLoading('正在加载...');
        this.hideError();
        this.resetPagination();
        
        // 调用API获取帖子列表
        const res = await this._getPostList(this.data.filter || {}, 1, this.data.pageSize);
        
        if (res && res.code === 200) {
          const posts = res.data || [];
          
          // 更新数据
          this.setData({
            post: posts,
            hasMore: posts.length >= this.data.pageSize,
            empty: posts.length === 0
          });
          
          // 异步更新帖子状态
          if (posts.length > 0) {
            this.updatePostsStatus(posts);
          }
        } else {
          throw new Error(res?.message || '获取帖子列表失败');
        }
        
        this.hideLoading();
      } catch (err) {
        this.hideLoading();
        this.showError('加载失败，请重试');
        console.debug('加载列表数据失败:', err);
      }
    },
    
    // 更新帖子状态
    async updatePostsStatus(posts) {
      if (!posts || !posts.length) return;
      
      try {
        const postIds = posts.map(p => p.id).filter(Boolean);
        const statusRes = await this._getPostStatus(postIds);
        
        if (statusRes && statusRes.code === 200 && statusRes.data) {
          const statusData = statusRes.data;
          const statusMap = Array.isArray(statusData)
            ? statusData.reduce((map, item) => { 
                if(item?.post_id) map[item.post_id] = item; 
                return map; 
              }, {})
            : (typeof statusData === 'object' ? statusData : {});
          
          // 更新列表数据
          const currentPosts = this.data.post || [];
          if (currentPosts.length > 0) {
            const updatedPosts = currentPosts.map(post => {
              const status = statusMap[post.id];
              return status ? { ...post, ...status } : post;
            });
            
            this.setData({ post: updatedPosts });
          }
        }
      } catch (err) {
        console.debug('更新帖子状态失败:', err);
        // 不中断流程，仅记录日志
      }
    },
    
    // 更新空状态
    updateEmptyState(posts) {
      if (!this.data.loading && !this.data.error) {
        this.setData({
          empty: !posts || posts.length === 0
        });
      }
    },
    
    // 加载更多
    async loadMore() {
      if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return;
      
      try {
        this.showLoadingMore();
        
        // 获取下一页
        const nextPage = this.data.page + 1;
        
        // 调用API加载更多
        const res = await this._getPostList(this.data.filter || {}, nextPage, this.data.pageSize);
        
        if (res && res.code === 200) {
          const newPosts = res.data || [];
          
          if (newPosts.length > 0) {
            // 合并数据
            const currentPosts = this.data.post || [];
            const updatedPosts = [...currentPosts, ...newPosts];
            
            // 更新状态
            this.setData({
              post: updatedPosts,
              page: nextPage,
              hasMore: newPosts.length >= this.data.pageSize
            });
            
            // 异步更新新加载帖子的状态
            this.updatePostsStatus(newPosts);
          } else {
            // 没有更多数据
            this.setData({ hasMore: false });
          }
        } else {
          throw new Error(res?.message || '加载更多帖子失败');
        }
        
        this.hideLoadingMore();
      } catch (err) {
        this.hideLoadingMore();
        console.debug('加载更多失败:', err);
      }
    },
    
    // 处理重试
    handleRetry() {
      this.loadInitialData();
    }
  }
}); 