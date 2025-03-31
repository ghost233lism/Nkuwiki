// 我的帖子页面
const api = require('../../../utils/api/index');

Page({
  data: {
    userAvatar: "",
    post: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    mytype: null,
    mytitle: null
  },

  onLoad(options) {
    console.log('mylike_fav_comment页面onLoad触发')
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
        console.log('type is : ',options.type)
    }
    console.log('type is : ',options.type)
    this.loadPosts(options.type)
  },
  
  // 加载我的帖子列表
  async loadPosts(like_fav_comment, refresh = false) {
    if (this.data.loading) return
    
    try {
      this.setData({ loading: true })
      
      const page = refresh ? 1 : this.data.page
      const userInfo = wx.getStorageSync('userInfo')

      wx.cloud.database().collection("users").where({
        openid: userInfo.openid
      }).get()
          .then(result => {
            this.setData({
              userAvatar: result.data[0].avatarUrl
            });
            console.log("获取头像", this.userAvatar);
          })
      
      console.log('当前用户信息:', userInfo)
      
      // 使用API模块获取用户的点赞、收藏或评论帖子
      // 注意: 后端API目前没有直接支持获取用户交互帖子的接口
      // 后续需要完善:
      // 1. 修改后端API添加相关接口
      // 2. 或者在前端维护用户交互记录
      // 目前是临时实现，可能无法正常工作
      const result = await api.user.getUserInteractionPosts({
        page,
        pageSize: this.data.pageSize,
        // 传入用户ID以确保查询正确
        openid: userInfo._id || userInfo.openid,
        type: like_fav_comment
      });
      
      console.log('API返回结果:', result)
      
      if (result && result.success) {
        // 处理帖子数据，添加格式化时间
        const post = result.post.map(post => {
          return {
            ...post,
            formattedTime: this.formatTime(post.createTime)
          }
        })
        
        console.log('处理后的帖子数据:', post)
        
        this.setData({
          post: refresh ? post : [...this.data.post, ...post],
          page: page + 1,
          hasMore: post.length === this.data.pageSize,
          loading: false
        })
        
        console.log('更新页面数据完成, 总条数:', this.data.post.length)
      } else {
        throw new Error(result?.message || '加载失败')
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
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}`
    })
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
