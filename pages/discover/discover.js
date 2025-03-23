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
      
      const res = await postAPI.likePost(id, currentUser.openid);
      
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