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
    if (this.data.loading || (!refresh && !this.data.hasMore)) return

    try {
      this.setData({ loading: true })

      const db = wx.cloud.database()
      const result = await db.collection('posts')
        .orderBy('createTime', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()

      const posts = result.data

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
      const res = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          type: 'toggleLike',
          postId: id
        }
      })

      if (res.result.success) {
        const key = `posts[${index}].stats.likes`
        const keyLiked = `posts[${index}].userInteraction.isLiked`
        const delta = res.result.hasLiked ? 1 : -1

        this.setData({
          [key]: this.data.posts[index].stats.likes + delta,
          [keyLiked]: res.result.hasLiked
        })
      }
    } catch (err) {
      console.error('点赞失败：', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }
}) 