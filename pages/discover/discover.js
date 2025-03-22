Page({
  data: {
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadPosts()
  },

  // 页面显示时刷新帖子
  onShow: function() {
    this.loadPosts()
  },

  // 处理下拉刷新
  async onPullDownRefresh() {
    try {
      this.setData({
        page: 1,
        hasMore: true
      })
      await this.loadPosts(true)
      wx.stopPullDownRefresh()
    } catch (err) {
      console.error('刷新失败：', err)
      wx.stopPullDownRefresh()
    }
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 使用HTTP API代替云数据库调用
      const api = require('../../utils/api/index');
      const result = await api.postAPI.getPosts({
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
          id: post.user_id,
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
        const app = getApp();
        const currentUser = app && app.getUserInfo ? app.getUserInfo() : null;
        const userId = currentUser && currentUser.id;
        
        if (userId) {
          // 设置点赞状态
          posts.forEach(post => {
            if (Array.isArray(post.liked_users)) {
              post.userInteraction.isLiked = post.liked_users.includes(userId);
            }
          });
        }
      } catch (e) {
        console.warn('获取用户信息失败，默认显示未点赞状态:', e);
      }

      this.setData({
        posts: refresh ? posts : [...this.data.posts, ...posts],
        page: this.data.page + 1,
        hasMore: posts.length === this.data.pageSize,
        loading: false
      })
    } catch (err) {
      console.error('加载帖子失败：', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
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
      // 使用HTTP API代替云函数调用
      const api = require('../../utils/api/index');
      
      // 安全获取当前用户
      const app = getApp();
      if (!app) {
        console.error('获取App实例失败');
        wx.showToast({
          title: '系统错误',
          icon: 'none'
        });
        return;
      }
      
      const currentUser = app.getUserInfo ? app.getUserInfo() : null;
      if (!currentUser || !currentUser.id) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      const res = await api.postAPI.likePost(id, currentUser.id);
      
      if (res && res.success !== false) {
        const key = `posts[${index}].stats.likes`
        const keyLiked = `posts[${index}].userInteraction.isLiked`
        const isLiked = res.liked || res.is_favorited;
        const delta = isLiked ? 1 : -1;

        this.setData({
          [key]: this.data.posts[index].stats.likes + delta,
          [keyLiked]: isLiked
        });
        
        wx.showToast({
          title: isLiked ? '点赞成功' : '已取消点赞',
          icon: 'success'
        });
      }
    } catch (err) {
      console.error('点赞失败：', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  }
}) 