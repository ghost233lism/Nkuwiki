const app = getApp();
const userManager = require('../../utils/user_manager');
const { postAPI, logger } = require('../../utils/api/index');

Page({
  data: {
    posts: [],
    loading: false,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.loadPosts()
  },

  // 页面显示时刷新帖子
  onShow: function() {
    this.loadPosts()
    
    // 检查是否有全局数据更新
    this.checkGlobalUpdates();
  },
  
  // 检查全局数据更新
  checkGlobalUpdates() {
    const app = getApp();
    const lastUpdateTime = this.lastUpdateTime || 0;
    
    // 如果全局数据已更新且本页面数据较旧，则更新本页面数据
    if (app.globalData.postUpdateTimestamp > lastUpdateTime) {
      console.debug('检测到全局数据更新，同步到发现页面');
      
      // 获取更新的帖子数据
      const updates = app.globalData.postUpdates || {};
      
      // 更新页面数据
      this.updatePostsWithLatestData(updates);
      
      // 更新本页面最后更新时间
      this.lastUpdateTime = app.globalData.postUpdateTimestamp;
    }
  },
  
  // 使用最新数据更新帖子列表
  updatePostsWithLatestData(updates) {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }
    
    // 获取当前帖子列表
    const posts = this.data.posts;
    if (!posts || !posts.length) {
      return;
    }
    
    // 标记是否有更新
    let hasUpdates = false;
    
    // 遍历帖子列表，更新数据
    const updatedPosts = posts.map(post => {
      // 获取帖子ID
      const postId = post.id;
      
      // 检查是否有此帖子的更新数据
      if (postId && updates[postId]) {
        // 合并更新数据
        const update = updates[postId];
        
        // 创建新的帖子对象，避免直接修改原对象
        const updatedPost = { ...post };
        
        // 更新点赞状态和数量
        if (update.hasOwnProperty('isLiked')) {
          updatedPost.userInteraction = updatedPost.userInteraction || {};
          updatedPost.userInteraction.isLiked = update.isLiked;
        }
        if (update.hasOwnProperty('likes')) {
          updatedPost.stats = updatedPost.stats || {};
          updatedPost.stats.likes = update.likes;
        }
        
        // 更新收藏状态和数量
        if (update.hasOwnProperty('isFavorited')) {
          updatedPost.userInteraction = updatedPost.userInteraction || {};
          updatedPost.userInteraction.isFavorited = update.isFavorited;
        }
        if (update.hasOwnProperty('favorite_count')) {
          updatedPost.stats = updatedPost.stats || {};
          updatedPost.stats.favoriteCount = update.favorite_count;
        }
        
        // 更新评论数量
        if (update.hasOwnProperty('comment_count')) {
          updatedPost.stats = updatedPost.stats || {};
          updatedPost.stats.comments = update.comment_count;
        }
        
        hasUpdates = true;
        return updatedPost;
      }
      
      // 如果没有更新，返回原帖子对象
      return post;
    });
    
    // 如果有更新，则更新页面数据
    if (hasUpdates) {
      console.debug('更新发现页帖子列表数据');
      this.setData({ posts: updatedPosts });
    }
  },
  
  // 接收全局数据更新通知
  onPostsDataUpdate(updates) {
    console.debug('发现页收到全局数据更新通知');
    this.updatePostsWithLatestData(updates);
  },

  // 处理下拉刷新
  onPullDownRefresh() {
    // 下拉刷新，重置为第一页
    this.setData({
      posts: [],
      page: 1,
      hasMore: true
    })
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const result = await postAPI.getPosts({
        limit: this.data.pageSize,
        offset: (this.data.page - 1) * this.data.pageSize,
        order_by: 'update_time DESC'
      });
      
      // 转换数据格式以兼容原有结构
      const posts = Array.isArray(result) ? result.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        images: post.images || [],
        author: {
          id: post.openid,
          name: post.user_name || '用户',
          avatar: post.user_avatar || '/assets/icons/default_avatar.png'
        },
        stats: {
          views: post.view_count || 0,
          likes: post.like_count || 0,
          comments: post.comment_count || 0
        },
        createTime: post.create_time,
        userInteraction: {
          isLiked: false // 默认未点赞
        }
      })) : [];
      
      // 安全获取当前用户ID并设置点赞状态
      try {
        const currentUser = userManager.getCurrentUser();
        const userId = currentUser && currentUser.openid;
        
        if (userId) {
          // 设置点赞状态
          posts.forEach(post => {
            if (Array.isArray(post.liked_users)) {
              post.userInteraction.isLiked = post.liked_users.includes(userId);
            }
          });
        }
      } catch (userErr) {
        console.error('获取用户信息失败:', userErr);
      }

      // 更新数据
      this.setData({
        posts: refresh ? posts : [...this.data.posts, ...posts],
        loading: false,
        page: this.data.page + 1,
        hasMore: posts.length === this.data.pageSize
      });
    } catch (error) {
      console.error('加载帖子失败:', error);
      this.setData({ loading: false });
    }
  },

  // 跳转到发帖页面
  goToPost(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/post/post?id=${id}`
    })
  },

  // 点赞
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset
    try {
      // 安全获取当前用户
      const currentUser = userManager.getCurrentUser();
      if (!currentUser || !currentUser.openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      // 获取当前点赞状态
      const isCurrentlyLiked = this.data.posts[index].userInteraction.isLiked;
      
      // 立即更新UI，给用户即时反馈
      const key = `posts[${index}].stats.likes`;
      const keyLiked = `posts[${index}].userInteraction.isLiked`;
      const delta = isCurrentlyLiked ? -1 : 1;
      
      this.setData({
        [key]: this.data.posts[index].stats.likes + delta,
        [keyLiked]: !isCurrentlyLiked
      });
      
      // 使用新的接口格式，直接传递布尔值表示点赞/取消点赞
      const res = await postAPI.likePost(id, !isCurrentlyLiked);
      
      if (!res || res.error) {
        // 如果失败，回滚UI状态
        this.setData({
          [key]: this.data.posts[index].stats.likes - delta,
          [keyLiked]: isCurrentlyLiked
        });
        throw new Error(res?.error || '操作失败');
      }
      
      // 如果服务器返回最新点赞数，使用服务器数据更新UI
      if (res && res.likes !== undefined) {
        this.setData({
          [key]: res.likes
        });
      }
      
      wx.showToast({
        title: !isCurrentlyLiked ? '点赞成功' : '已取消点赞',
        icon: 'success',
        duration: 1000
      });
    } catch (err) {
      console.error('点赞失败：', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 点击帖子跳转到详情页
  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}`
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts()
    }
  }
}) 