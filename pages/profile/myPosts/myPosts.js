// 我的帖子页面
const app = getApp();
const { ui, error, ToastType, createApiClient, formatTimeAgo } = require('../../../utils/util');

// 创建帖子API客户端
const postApi = createApiClient('/api/wxapp/post', {
  // 获取我的帖子列表 GET /api/wxapp/post/list
  getMyPosts: { 
    method: 'GET', 
    path: '/list',
    params: {
      openid: true,
      page: true,
      limit: true
    }
  },
  // 点赞帖子 POST /api/wxapp/post/like
  likePost: { 
    method: 'POST', 
    path: '/like',
    data: {
      post_id: true,
      openid: true
    }
  },
  // 收藏帖子 POST /api/wxapp/post/favorite
  favoritePost: { 
    method: 'POST', 
    path: '/favorite',
    data: {
      post_id: true,
      openid: true
    }
  }
});

// behaviors
const baseBehavior = require('../../../behaviors/baseBehavior');
const postBehavior = require('../../../behaviors/postBehavior');
const authBehavior = require('../../../behaviors/authBehavior');

Page({
  behaviors: [baseBehavior, postBehavior, authBehavior],

  data: {
    posts: [],
    loading: false,
    error: false,
    errorMsg: '',
    hasMore: true,
    page: 1,
    pageSize: 10,
    openid: '',
    refreshing: false,
    // 导航按钮配置
    navButtons: [
      {type: "back", icon: "back", show: true, delta: 1},
      {type: "home", show: false},
      {type: "logo", show: false},
      {type: "notification", show: false},
      {type: "avatar", show: false}
    ]
  },

  async onLoad() {
    await this.initPage();
  },

  onShow() {
    // 如果有更新，重新加载
    if (app.globalData.postsUpdated) {
      this.resetList();
      app.globalData.postsUpdated = false;
    }
  },

  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    await this.resetList();
    wx.stopPullDownRefresh();
    this.setData({ refreshing: false });
  },

  // --- Data Loading ---
  async initPage() {
    const userInfo = await this.getUserInfo();
    if (!userInfo?.openid) {
      this.setData({ 
        error: true,
        errorMsg: '请先登录' 
      });
      return;
    }

    this.setData({ openid: userInfo.openid });
    await this.loadList();
  },

  async loadList() {
    if (this.data.loading || !this.data.hasMore) return;

    try {
      ui.showLoading();
      this.setData({ loading: true, error: false });

      const res = await postApi.getMyPosts({
        openid: this.data.openid,
        page: this.data.page,
        limit: this.data.pageSize
      });

      if (!res.data) {
        throw new Error('获取帖子失败');
      }

      const newPosts = res.data.map(post => ({
        ...post,
        formattedTime: formatTimeAgo(post.createTime)
      }));

      this.setData({
        posts: [...this.data.posts, ...newPosts],
        hasMore: newPosts.length === this.data.pageSize,
        page: this.data.page + 1
      });
    } catch (err) {
      error.handle(err, '加载帖子失败');
      this.setData({
        error: true,
        errorMsg: err.message || '加载失败，请重试'
      });
    } finally {
      this.setData({ loading: false });
      ui.hideLoading();
    }
  },

  // --- Event Handlers ---
  onPostTap(e) {
    const { id } = e.detail;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}`
    });
  },

  onNewPost() {
    if (!this.data.openid) {
      ui.showToast('请先登录', { type: ToastType.ERROR });
      return;
    }
    wx.navigateTo({
      url: '/pages/post/edit/edit'
    });
  },

  async onLike(e) {
    if (!this.data.openid) {
      ui.showToast('请先登录', { type: ToastType.ERROR });
      return;
    }

    const { id, index } = e.detail;
    const post = this.data.posts[index];
    const isLiked = post.isLiked;

    // 乐观更新
    this.updatePost(index, {
      isLiked: !isLiked,
      like_count: isLiked ? post.like_count - 1 : post.like_count + 1
    });

    try {
      const res = await postApi.likePost({
        post_id: id,
        openid: this.data.openid
      });

      if (res.code !== 200 || !res.data) {
        throw new Error(res.message || '操作失败');
      }

      this.updatePost(index, {
        isLiked: res.data.is_liked,
        like_count: res.data.like_count
      });
    } catch (err) {
      this.updatePost(index, post);
      error.handle(err, '点赞失败');
    }
  },

  async onFavorite(e) {
    if (!this.data.openid) {
      ui.showToast('请先登录', { type: ToastType.ERROR });
      return;
    }

    const { id, index } = e.detail;
    const post = this.data.posts[index];
    const isFavorited = post.isFavorited;

    // 乐观更新
    this.updatePost(index, {
      isFavorited: !isFavorited,
      favorite_count: isFavorited ? post.favorite_count - 1 : post.favorite_count + 1
    });

    try {
      const res = await postApi.favoritePost({
        post_id: id,
        openid: this.data.openid
      });

      if (res.code !== 200 || !res.data) {
        throw new Error(res.message || '操作失败');
      }

      this.updatePost(index, {
        isFavorited: res.data.is_favorited,
        favorite_count: res.data.favorite_count
      });
    } catch (err) {
      this.updatePost(index, post);
      error.handle(err, '收藏失败');
    }
  },

  onComment(e) {
    if (!this.data.openid) {
      ui.showToast('请先登录', { type: ToastType.ERROR });
      return;
    }

    const { id } = e.detail;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}&focus=comment`
    });
  },

  onUserTap(e) {
    const { userId } = e.detail;
    wx.navigateTo({
      url: `/pages/profile/user/user?id=${userId}`
    });
  },

  // --- Helper Methods ---
  updatePost(index, data) {
    this.setData({
      [`posts[${index}]`]: {
        ...this.data.posts[index],
        ...data
      }
    });
  },

  resetList() {
    this.setData({
      posts: [],
      page: 1,
      hasMore: true
    });
    return this.loadList();
  }
}); 