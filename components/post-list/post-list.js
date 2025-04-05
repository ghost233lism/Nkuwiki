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
          
          // 确保获取到的帖子列表添加到页面后，立即执行状态更新
          console.debug('帖子列表加载完成，总数:', posts.length);
          
          // 使用setTimeout确保DOM更新后再更新状态
          setTimeout(() => {
            if (posts.length > 0) {
              console.debug('异步强制刷新帖子状态');
              this.updatePostsStatus(posts);
            } else {
              console.debug('帖子列表为空，不调用状态更新');
            }
          }, 0);
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
      if (!posts || !posts.length) {
        console.debug('没有帖子需要更新状态');
        return;
      }
      
      try {
        // 检查用户登录状态
        const openid = this.getStorage('openid');
        if (!openid) {
          console.debug('用户未登录，不获取交互状态');
          return;
        }
        
        const postIds = posts.map(p => p.id).filter(Boolean);
        if (postIds.length === 0) {
          console.debug('没有有效的帖子ID');
          return;
        }
        
        console.debug('获取帖子状态:', postIds);
        const statusRes = await this._getPostStatus(postIds);
        
        if (statusRes && statusRes.code === 200 && statusRes.data) {
          const statusData = statusRes.data;
          console.debug('获取到帖子状态:', statusData);
          
          // 服务器返回的是一个以post_id为key的对象
          // 格式：{"1": {...状态}, "2": {...状态}}
          // 不需要转换为map
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
            console.debug('帖子状态已更新');
            console.log(posts);
          }
        } else {
          console.debug('获取帖子状态返回错误:', statusRes);
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
    },
    
    // 提供给父组件的刷新方法
    refresh() {
      return this.loadInitialData();
    }
  }
}); 