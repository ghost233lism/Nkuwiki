// 我的帖子页面
const {
  getStorage,
  formatRelativeTime
} = require('../../../utils/util');
const api = require('../../../utils/api/index');

Page({
  data: {
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad() {
    console.debug('加载我的帖子页面');
    this.loadPosts();
  },
  
  // 加载我的帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      const page = refresh ? 1 : this.data.page;
      const userInfo = getStorage('userInfo');
      if (!userInfo) throw new Error('未登录');
      
      const result = await api.post.getUserPosts({
        page,
        pageSize: this.data.pageSize,
        openid: userInfo.openid
      });
      
      console.debug('获取帖子列表:', result);
      
      if (result?.success) {
        const posts = result.posts.map(post => ({
          ...post,
          formattedTime: formatRelativeTime(post.createTime)
        }));
        
        this.setData({
          posts: refresh ? posts : [...this.data.posts, ...posts],
          page: page + 1,
          hasMore: posts.length === this.data.pageSize
        });
      } else {
        throw new Error(result?.message || '加载失败');
      }
    } catch (err) {
      console.debug('加载失败:', err);
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  
  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadPosts(true);
    wx.stopPullDownRefresh();
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadPosts();
    }
  },
  
  // 返回上一页
  goBack() {
    wx.navigateBack()
  },
  
  // 跳转到帖子详情
  goToPostDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}`,
      fail: err => {
        console.debug('跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 创建新帖子
  createNewPost() {
    wx.navigateTo({
      url: '/pages/post/post',
      fail: err => {
        console.debug('跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  }
}) 