const baseBehavior = require('../../behaviors/baseBehavior');
const postBehavior = require('../../behaviors/postBehavior');

Component({
  behaviors: [baseBehavior, postBehavior],

  properties: {
    posts: {
      type: Array,
      value: []
    },
    isLoading: {
      type: Boolean,
      value: false
    },
    hasError: {
      type: Boolean,
      value: false
    },
    hasMoreData: {
      type: Boolean,
      value: true
    },
    currentUserOpenid: {
      type: String,
      value: ''
    },
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
    _lastStatusUpdateTime: 0,
    pageSize: 10,
    
    // 添加淡入淡出效果的样式
    fadeStyle: ''
  },

  lifetimes: {
    attached() {
      // 添加最后更新时间记录
      this.setData({
        _lastUpdateTime: 0,
        _lastStatusUpdateTime: 0
      });
      
      // 组件attached后异步加载数据
      setTimeout(() => {
        this.loadInitialData().then(() => {
          // 再次确保帖子状态已更新
          if (this.data.post && this.data.post.length > 0) {
            this.updatePostsStatus(this.data.post);
          }
        });
      }, 100);
    },
    
    detached() {
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
      const { id, refreshNeeded } = e.detail;
      if (!id) return;
      
      if (refreshNeeded) {
        // 获取单个帖子的最新状态并更新
        this._refreshPostStatus(id);
      }
    },
    
    // 刷新单个帖子状态
    async _refreshPostStatus(postId) {
      if (!postId) return;
      
      try {
        // 调用API获取帖子状态
        const statusRes = await this._getPostStatus(postId);
        
        if (statusRes && statusRes.code === 200 && statusRes.data) {
          const statusData = statusRes.data;
          const status = statusData[postId];
          
          if (status) {
            // 更新列表数据
            const currentPosts = this.data.post || [];
            if (currentPosts.length > 0) {
              const updatedPosts = currentPosts.map(post => {
                if (String(post.id) === String(postId)) {
                  // 直接使用后端原始值
                  const updatedPost = { 
                    ...post,
                    is_liked: status.is_liked,
                    is_favorited: status.is_favorited,
                    is_following: status.is_following,
                    like_count: status.like_count !== undefined ? status.like_count : post.like_count,
                    favorite_count: status.favorite_count !== undefined ? status.favorite_count : post.favorite_count,
                    comment_count: status.comment_count !== undefined ? status.comment_count : post.comment_count
                  };
                  
                  return updatedPost;
                }
                return post;
              });
              
              // 更新数据
              this.setData({ post: updatedPosts }, () => {
                // 强制刷新子组件
                this._refreshPostItem(postId);
              });
            }
          }
        }
      } catch (err) {
        // 忽略错误
      }
    },
    
    // 刷新特定帖子组件实例
    _refreshPostItem(postId) {
      if (!postId) return;
      
      // 直接通过ID选择组件，避免复杂查询
      const selector = `#post_item_${postId}`;
      const postItemComponent = this.selectComponent(selector);
      
      if (postItemComponent) {
        // 直接更新状态
        if (typeof postItemComponent._updatePostData === 'function') {
          postItemComponent._updatePostData();
        }
      }
    },
    
    // 处理帖子收藏事件
    handlePostFavorite(e) {
      const { id, refreshNeeded } = e.detail;
      if (!id) return;
      
      if (refreshNeeded) {
        // 获取单个帖子的最新状态并更新
        this._refreshPostStatus(id);
      }
    },
    
    // 处理帖子关注事件
    handlePostFollow(e) {
      const { id, authorId, isFollowing } = e.detail;
      if (!id || !authorId) return;
      
      // 更新帖子列表中所有该作者的帖子状态
      const posts = this.data.post;
      const updatedPosts = posts.map(post => {
        if (post.openid === authorId) {
          return {
            ...post,
            is_following: isFollowing
          };
        }
        return post;
      });
      
      this.setData({ post: updatedPosts });
    },
    
    // 加载初始数据
    async loadInitialData(force = false, smoothLoading = false) {
      // 防止短时间内重复调用，但强制刷新时忽略此限制
      const now = Date.now();
      if (!force && this.data._lastUpdateTime && now - this.data._lastUpdateTime < 5000) {
        return Promise.resolve();
      }
      
      try {
        // 只有在非平滑加载时才显示loading状态
        if (!smoothLoading) {
          this.showLoading('正在加载...');
        } else {
          // 在平滑加载模式下，使用淡入淡出效果
          if (!this.data.fadeStyle) {
            this.setData({
              fadeStyle: 'opacity: 0.6; transition: opacity 0.2s ease;'
            });
          }
        }
        
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
          }, () => {
            // 直接在回调中更新状态，无需延时
            if (posts.length > 0) {
              this.updatePostsStatus(posts);
            }
            
            // 在平滑加载模式下，数据加载完成后恢复透明度
            if (smoothLoading) {
              setTimeout(() => {
                this.setData({
                  fadeStyle: 'opacity: 1; transition: opacity 0.3s ease;'
                });
              }, 100);
            }
          });
        } else {
          throw new Error(result?.message || '获取数据失败');
        }
        
        // 只有在非平滑加载时才隐藏loading状态
        if (!smoothLoading) {
          this.hideLoading();
        }
        return Promise.resolve();
      } catch (err) {
        // 只有在非平滑加载时才隐藏loading状态并显示错误
        if (!smoothLoading) {
          this.hideLoading();
          this.showError('获取内容失败');
        } else {
          // 即使在平滑加载模式下出错，也要恢复透明度
          this.setData({
            fadeStyle: 'opacity: 1; transition: opacity 0.3s ease;'
          });
        }
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
                // 直接使用后端返回的原始值
                return { 
                  ...post, 
                  // 使用后端字段名和值
                  is_liked: status.is_liked,
                  is_favorited: status.is_favorited,
                  is_following: status.is_following,
                  // 如果服务器返回了计数，使用服务器返回的
                  like_count: status.like_count !== undefined ? status.like_count : post.like_count,
                  favorite_count: status.favorite_count !== undefined ? status.favorite_count : post.favorite_count,
                  comment_count: status.comment_count !== undefined ? status.comment_count : post.comment_count
                };
              }
              return post;
            });
            
            // 更新数据
            this.setData({ post: updatedPosts }, () => {
              // 立即刷新组件状态，无需延时
              this._refreshAllPostItems(updatedPosts);
            });
          }
        }
      } catch (err) {
        // 不中断流程，仅忽略错误
      }
    },
    
    // 刷新所有帖子组件状态
    _refreshAllPostItems(posts) {
      if (!posts || !posts.length) return;
      
      posts.forEach(post => {
        const postId = post.id;
        if (postId) {
          this._refreshPostItem(postId);
        }
      });
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
      return this.loadInitialData(true);
    },
    
    // 更新筛选条件
    updateFilter(filter) {
      // 合并现有筛选条件
      const newFilter = { ...this.data.filter, ...filter };
      
      // 添加淡出效果
      const postListView = this.selectComponent('.post-list');
      if (postListView) {
        postListView.setStyle({
          opacity: 0.5,
          transition: 'opacity 0.2s ease'
        });
      } else {
        // 如果找不到.post-list，则使用setData直接设置透明度
        this.setData({
          fadeStyle: 'opacity: 0.5; transition: opacity 0.2s ease;'
        });
      }
      
      this.setData({ filter: newFilter }, () => {
        // 强制刷新数据，使用平滑加载避免闪烁
        this.loadInitialData(true, true).then(() => {
          // 数据加载完成后淡入
          if (postListView) {
            setTimeout(() => {
              postListView.setStyle({
                opacity: 1,
                transition: 'opacity 0.3s ease'
              });
            }, 100);
          } else {
            // 如果找不到.post-list，则使用setData直接设置透明度
            setTimeout(() => {
              this.setData({
                fadeStyle: 'opacity: 1; transition: opacity 0.3s ease;'
              });
            }, 100);
          }
        });
      });
    }
  }
}); 