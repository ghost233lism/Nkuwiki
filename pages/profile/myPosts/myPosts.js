// 我的帖子页面
Page({
  data: {
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad() {
    console.log('myPosts页面onLoad触发')
    this.loadPosts()
  },
  
  // 加载我的帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading) return
    
    try {
      this.setData({ loading: true })
      
      const page = refresh ? 1 : this.data.page
      const userInfo = wx.getStorageSync('userInfo')
      
      console.log('当前用户信息:', userInfo)
      
      const res = await wx.cloud.callFunction({
        name: 'getUserPosts',
        data: {
          page,
          pageSize: this.data.pageSize,
          // 传入用户ID以确保查询正确
          openid: userInfo._id || userInfo.openid
        }
      })
      
      console.log('云函数返回结果:', res.result)
      
      if (res.result && res.result.success) {
        // 处理帖子数据，添加格式化时间
        const posts = res.result.posts.map(post => {
          return {
            ...post,
            formattedTime: this.formatTime(post.createTime)
          }
        })
        
        console.log('处理后的帖子数据:', posts)
        
        this.setData({
          posts: refresh ? posts : [...this.data.posts, ...posts],
          page: page + 1,
          hasMore: posts.length === this.data.pageSize,
          loading: false
        })
        
        console.log('更新页面数据完成, 总条数:', this.data.posts.length)
      } else {
        throw new Error(res.result?.message || '加载失败')
      }
    } catch (err) {
      console.error('加载帖子失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1 })
    this.loadPosts(true)
      .then(() => {
        wx.stopPullDownRefresh()
      })
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadPosts()
    }
  },
  
  // 返回上一页
  goBack() {
    wx.navigateBack()
  },
  
  // 跳转到帖子详情
  goToPostDetail(e) {
    const id = e.currentTarget.dataset.id;
    console.log('个人中心-我的帖子-详情页跳转帖子ID:', id, '类型:', typeof id);
    
    // 验证帖子ID
    if (!id) {
      console.error('帖子ID为空');
      wx.showToast({
        title: '无法查看帖子详情',
        icon: 'none'
      });
      return;
    }
    
    // 确保ID是整数
    let postId;
    try {
      if (typeof id === 'number') {
        postId = id;
      } else if (typeof id === 'string') {
        // 尝试转换为整数
        const numericPart = id.replace(/[^0-9]/g, '');
        if (!numericPart) {
          throw new Error('帖子ID不包含有效数字');
        }
        postId = parseInt(numericPart, 10);
      } else {
        throw new Error('帖子ID类型无效');
      }
      
      // 验证是否为有效整数
      if (isNaN(postId) || postId <= 0) {
        throw new Error('无效的帖子ID值');
      }
    } catch (error) {
      console.error('帖子ID处理失败:', error);
      wx.showToast({
        title: '无法查看帖子详情',
        icon: 'none'
      });
      return;
    }
    
    // 使用整数ID跳转
    const numericPostId = Number(postId);
    console.log('跳转到详情页，处理后ID:', numericPostId);
    
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${numericPostId}`
    });
  },
  
  // 创建新帖子
  createNewPost() {
    wx.navigateTo({
      url: '/pages/post/post'
    })
  },
  
  // 格式化时间显示
  formatTime(dateStr) {
    if (!dateStr) return ''
    
    const date = new Date(dateStr)
    const now = new Date()
    
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    
    if (diffSec < 60) {
      return '刚刚'
    } else if (diffMin < 60) {
      return `${diffMin}分钟前`
    } else if (diffHour < 24) {
      return `${diffHour}小时前`
    } else if (diffDay < 30) {
      return `${diffDay}天前`
    } else {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    }
  }
}) 