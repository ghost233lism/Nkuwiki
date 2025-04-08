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
    page_size: 10,
    total: 0,
    total_pages: 0,
    hasMore: true,
    loadingMore: false,
    
    // 加载状态
    loadingText: '加载中...',
    
    // 按钮相关配置
    noMoreText: '没有更多数据了',
    
    // 添加最后更新时间记录
    _lastUpdateTime: 0,
    _lastStatusUpdateTime: 0
  },

  lifetimes: {
    attached() {
      console.debug('post-list组件已附加');
      
      // 添加最后更新时间记录
      this.setData({
        _lastUpdateTime: 0,
        _lastStatusUpdateTime: 0
      });
      
      // 组件attached后异步加载数据
      setTimeout(() => {
        console.debug('post-list组件延迟加载数据');
        this.loadInitialData().then(() => {
          console.debug('post-list初始数据加载完成，确认状态更新');
          // 再次确保帖子状态已更新
          if (this.data.post && this.data.post.length > 0) {
            this.updatePostsStatus(this.data.post);
          }
        });
      }, 100);
    },
    
    detached() {
      console.debug('post-list组件已卸载');
    }
  },

  observers: {
    'filter': function(filter) {
      // 当筛选条件变化时重新加载数据
      if (filter) {
        const now = Date.now();
        // 如果30秒内已经加载过，不要重复加载
        if (!this.data._lastUpdateTime || now - this.data._lastUpdateTime > 30000) {
          this.loadInitialData();
        }
      }
    }
  },

  methods: {
    // 重置分页
    resetPagination() {
      this.setData({
        page: 1,
        hasMore: true,
        total: 0,
        total_pages: 0
      });
    },
    
    // 处理帖子点赞事件
    handlePostLike(e) {
      const { id, isLiked, likeCount } = e.detail;
      if (!id) return;
      
      // 更新帖子列表中对应帖子的状态
      const posts = this.data.post;
      const updatedPosts = posts.map(post => {
        if (post.id === id) {
          return {
            ...post,
            is_liked: isLiked ? 1 : 0,
            like_count: likeCount
          };
        }
        return post;
      });
      
      this.setData({ post: updatedPosts });
    },
    
    // 处理帖子收藏事件
    handlePostFavorite(e) {
      const { id, isFavorited, favoriteCount } = e.detail;
      if (!id) return;
      
      // 更新帖子列表中对应帖子的状态
      const posts = this.data.post;
      const updatedPosts = posts.map(post => {
        if (post.id === id) {
          return {
            ...post,
            is_favorited: isFavorited ? 1 : 0,
            favorite_count: favoriteCount
          };
        }
        return post;
      });
      
      this.setData({ post: updatedPosts });
    },
    
    // 处理帖子关注事件
    handlePostFollow(e) {
      const { id, authorId, isFollowed } = e.detail;
      if (!id || !authorId) return;
      
      // 更新帖子列表中所有该作者的帖子状态
      const posts = this.data.post;
      const updatedPosts = posts.map(post => {
        if (post.openid === authorId) {
          return {
            ...post,
            is_followed: isFollowed ? 1 : 0
          };
        }
        return post;
      });
      
      this.setData({ post: updatedPosts });
    },
    
    // 加载初始数据
    async loadInitialData() {
      // 防止短时间内重复调用
      const now = Date.now();
      if (this.data._lastUpdateTime && now - this.data._lastUpdateTime < 5000) {
        console.debug('短时间内已加载过数据，跳过本次加载');
        return Promise.resolve();
      }
      
      try {
        this.showLoading('正在加载...');
        this.hideError();
        this.resetPagination();
        
        // 更新最后加载时间
        this.setData({ _lastUpdateTime: now });
        
        // 调用API获取帖子列表
        const result = await this._getPostList(this.data.filter || {}, 1, this.data.page_size);
        
        if (result && result.data) {
          const posts = result.data || [];
          const pagination = result.pagination || {};
          
          // 更新数据
          this.setData({
            post: posts,
            hasMore: pagination.has_more !== undefined ? pagination.has_more : (posts.length >= this.data.page_size),
            total: pagination.total || 0,
            total_pages: pagination.total_pages || 0,
            empty: posts.length === 0
          });
          
          // 使用setTimeout确保DOM更新后再更新状态
          setTimeout(() => {
            if (posts.length > 0) {
              this.updatePostsStatus(posts);
            }
          }, 0);
        } else {
          throw new Error(result?.message || '获取数据失败');
        }
        
        this.hideLoading();
        return Promise.resolve();
      } catch (err) {
        this.hideLoading();
        this.showError('获取内容失败');
        return Promise.reject(err);
      }
    },
    
    // 更新帖子状态
    async updatePostsStatus(posts) {
      if (!posts || !posts.length) {
        return;
      }
      
      try {
        // 添加节流控制，30秒内不重复获取状态
        const now = Date.now();
        if (this.data._lastStatusUpdateTime && now - this.data._lastStatusUpdateTime < 30000) {
          console.debug('30秒内已更新过状态，跳过本次更新');
          return;
        }
        
        // 更新状态最后更新时间
        this.setData({ _lastStatusUpdateTime: now });
        
        // 检查用户登录状态
        const openid = this.getStorage('openid');
        if (!openid) {
          return;
        }
        
        const postIds = posts.map(p => p.id).filter(Boolean);
        if (postIds.length === 0) {
          return;
        }
        
        const statusRes = await this._getPostStatus(postIds);
        
        if (statusRes && statusRes.code === 200 && statusRes.data) {
          const statusData = statusRes.data;
          
          // 服务器返回的是一个以post_id为key的对象
          // 格式：{"1": {...状态}, "2": {...状态}}
          const statusMap = statusData || {};
          
          // 更新列表数据
          const currentPosts = this.data.post || [];
          if (currentPosts.length > 0) {
            const updatedPosts = currentPosts.map(post => {
              const postId = String(post.id);
              const status = statusMap[postId];
              if (status) {
                // 确保保留原始帖子信息
                return { 
                  ...post, 
                  // 同时更新状态标志和计数
                  is_liked: status.is_liked,
                  is_favorited: status.is_favorited,
                  is_followed: status.is_followed,
                  // 如果服务器返回了计数，使用服务器返回的
                  like_count: status.like_count !== undefined ? status.like_count : post.like_count,
                  favorite_count: status.favorite_count !== undefined ? status.favorite_count : post.favorite_count,
                  comment_count: status.comment_count !== undefined ? status.comment_count : post.comment_count
                };
              }
              return post;
            });
            
            // 更新数据
            this.setData({ post: updatedPosts });
          }
        }
      } catch (err) {
        // 不中断流程，仅忽略错误
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
        const result = await this._getPostList(this.data.filter || {}, nextPage, this.data.page_size);
        
        if (result && result.data) {
          const newPosts = result.data || [];
          const pagination = result.pagination || {};
          
          if (newPosts.length > 0) {
            // 合并数据
            const currentPosts = this.data.post || [];
            const updatedPosts = [...currentPosts, ...newPosts];
            
            // 更新状态
            this.setData({
              post: updatedPosts,
              page: nextPage,
              hasMore: pagination.has_more !== undefined ? pagination.has_more : (newPosts.length >= this.data.page_size),
              total: pagination.total || 0,
              total_pages: pagination.total_pages || 0
            });
            
            // 异步更新新加载帖子的状态
            this.updatePostsStatus(newPosts);
          } else {
            // 没有更多数据
            this.setData({ hasMore: false });
          }
        } else {
          throw new Error(result?.message || '加载更多内容失败');
        }
        
        this.hideLoadingMore();
      } catch (err) {
        this.hideLoadingMore();
      }
    },
    
    // 处理重试
    handleRetry() {
      this.loadInitialData();
    },
    
    // 提供给父组件的刷新方法
    refresh() {
      return this.loadInitialData();
    }
  }
}); 