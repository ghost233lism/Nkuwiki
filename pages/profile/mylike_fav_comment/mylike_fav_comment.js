// 我的帖子页面
const { postAPI, logger } = require('../../../utils/api');
const userManager = require('../../../utils/user_manager');

Page({
  data: {
    userAvatar: "",
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    mytype: null,
    mytitle: null
  },

  onLoad(options) {
    logger.debug('mylike_fav_comment页面onLoad触发')
    this.data.mytype = options.type
    switch (options.type) {
      case 'star' :
        this.setData({ mytitle: '收藏' })
        break;
      case 'comment' :
        this.setData({ mytitle: '评论' })
        break;
      case 'like' :
        this.setData({ mytitle: '点赞' })
        break;
      default :
        logger.debug('未知类型: ', options.type)
    }
    logger.debug('当前类型: ', options.type)
    this.loadPosts(options.type)
  },
  
  // 加载我的帖子列表
  async loadPosts(type, refresh = false) {
    if (this.data.loading) return
    
    try {
      this.setData({ loading: true })
      
      const page = refresh ? 1 : this.data.page
      const userInfo = userManager.getCurrentUser()
      
      // 设置用户头像
      this.setData({
        userAvatar: userInfo.avatarUrl || '/assets/icons/default-avatar.png'
      })
      
      logger.debug('当前用户信息:', userInfo)
      
      // 使用新的API接口
      const userId = userInfo.id
      let result = { data: [] }
      
      if (type === 'star') {
        // 获取收藏的帖子
        result = await postAPI.getUserFavorites(userId)
      } else if (type === 'like') {
        // 获取点赞的帖子
        result = await postAPI.getUserLikedPosts(userId)
      } else if (type === 'comment') {
        // 获取评论过的帖子 - 暂无专门API，可以后续添加
        result = { data: [] }
      }
      
      // 如果返回数据符合标准格式，则提取data字段
      const posts = (result.data && Array.isArray(result.data)) ? result.data : []
      
      logger.debug('API返回结果:', posts.length > 0 ? `${posts.length}条数据` : '无数据')
      
      if (posts.length > 0) {
        // 处理帖子数据，添加格式化时间
        const processedPosts = posts.map(post => {
          return {
            ...post,
            formattedTime: this.formatTime(post.create_time || post.update_time)
          }
        })
        
        this.setData({
          posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
          page: page + 1,
          hasMore: processedPosts.length === this.data.pageSize,
          loading: false
        })
        
        logger.debug('更新页面数据完成, 总条数:', this.data.posts.length)
      } else {
        this.setData({
          posts: refresh ? [] : this.data.posts,
          hasMore: false,
          loading: false
        })
      }
    } catch (err) {
      logger.error('加载帖子失败：', err)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1 })
    this.loadPosts(this.data.mytype, true)
      .then(() => {
        wx.stopPullDownRefresh()
      })
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadPosts(this.data.mytype)
    }
  },
  
  // 返回上一页
  goBack() {
    wx.navigateBack()
  },
  
  // 跳转到帖子详情
  goToPostDetail(e) {
    const id = e.currentTarget.dataset.id;
    console.log('个人中心-收藏/点赞-详情页跳转帖子ID:', id, '类型:', typeof id);
    
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
