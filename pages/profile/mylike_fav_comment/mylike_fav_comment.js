// 我的帖子页面
const app = getApp();
const { ui, error, ToastType, createApiClient, formatTimeAgo } = require('../../../utils/util');

// 创建用户API客户端
const userApi = createApiClient('/api/wxapp/user', {
  // 获取用户点赞列表 GET /api/wxapp/user/like
  getLikes: {
    method: 'GET',
    path: '/like',
    params: {
      openid: true,
      offset: true,
      limit: true
    }
  },
  // 获取用户收藏列表 GET /api/wxapp/user/favorite
  getFavorites: {
    method: 'GET',
    path: '/favorite',
    params: {
      openid: true,
      offset: true,
      limit: true
    }
  },
  // 获取用户评论列表 GET /api/wxapp/user/comment
  getComments: {
    method: 'GET',
    path: '/comment',
    params: {
      openid: true,
      offset: true,
      limit: true
    }
  }
});

// 创建帖子API客户端
const postApi = createApiClient('/api/wxapp/post', {
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
const pageBehavior = require('../../../behaviors/page-behavior');
const listBehavior = require('../../../behaviors/list-behavior');
const postBehavior = require('../../../behaviors/post-behavior');
const authBehavior = require('../../../behaviors/auth-behavior');

// 常量配置
const TAB_CONFIG = {
  LIKE: {
    index: 0,
    title: '我的点赞',
    emptyText: '您还没有点赞任何帖子'
  },
  FAVORITE: {
    index: 1,
    title: '我的收藏',
    emptyText: '您还没有收藏任何帖子'
  },
  COMMENT: {
    index: 2,
    title: '我的评论',
    emptyText: '您还没有评论任何帖子'
  }
};

Page({
  behaviors: [pageBehavior, listBehavior, postBehavior, authBehavior],

  data: {
    posts: [],
    loading: false,
    error: false,
    errorMsg: '',
    hasMore: true,
    page: 1,
    pageSize: 10,
    openid: '',
    tabIndex: 0,
    pageTitle: TAB_CONFIG.LIKE.title,
    emptyText: TAB_CONFIG.LIKE.emptyText,
    refreshing: false,
    tabTitles: ['我的点赞', '我的收藏', '我的评论']
  },

  async onLoad(options) {
    await this.initPage(options);
  },

  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    await this.resetList();
    wx.stopPullDownRefresh();
    this.setData({ refreshing: false });
  },

  async initPage(options) {
    const userInfo = await this.getUserInfo();
    if (!userInfo?.openid) {
      this.setData({ 
        error: true,
        errorMsg: '请先登录' 
      });
      return;
    }

    const tabIndex = parseInt(options.tab || 0);
    const tabConfig = Object.values(TAB_CONFIG)[tabIndex];
    
    this.setData({
      openid: userInfo.openid,
      tabIndex,
      pageTitle: tabConfig.title,
      emptyText: tabConfig.emptyText
    });
    
    await this.loadList();
  },

  async switchTab(e) {
    const tabIndex = e.detail.index;
    if (tabIndex === this.data.tabIndex) return;
    
    const tabConfig = Object.values(TAB_CONFIG)[tabIndex];
    
    this.setData({
      tabIndex,
      pageTitle: tabConfig.title,
      emptyText: tabConfig.emptyText
    });
    
    await this.resetList();
  },

  // --- Data Loading ---
  async loadList() {
    if (this.data.loading || !this.data.hasMore) return;

    try {
      ui.showLoading();
      this.setData({ loading: true, error: false });

      let res;
      const params = {
        openid: this.data.openid,
        offset: (this.data.page - 1) * this.data.pageSize,
        limit: this.data.pageSize
      };

      switch (this.data.tabIndex) {
        case TAB_CONFIG.LIKE.index:
          res = await userApi.getLikes(params);
          break;
        case TAB_CONFIG.FAVORITE.index:
          res = await userApi.getFavorites(params);
          break;
        case TAB_CONFIG.COMMENT.index:
          res = await userApi.getComments(params);
          break;
      }

      if (!res.data) {
        throw new Error('获取数据失败');
      }

      const newPosts = res.data.map(post => ({
        ...post,
        formattedTime: formatTimeAgo(post.create_time)
      }));

      this.setData({
        posts: [...this.data.posts, ...newPosts],
        hasMore: newPosts.length === this.data.pageSize,
        page: this.data.page + 1
      });
    } catch (err) {
      error.handle(err, '加载失败');
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

  onIndexTap() {
    wx.switchTab({
      url: '/pages/index/index'
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

      // 如果在点赞标签页取消点赞，需要移除该帖子
      if (this.data.tabIndex === TAB_CONFIG.LIKE.index && !res.data.is_liked) {
        this.removePost(index);
      }
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

      // 如果在收藏标签页取消收藏，需要移除该帖子
      if (this.data.tabIndex === TAB_CONFIG.FAVORITE.index && !res.data.is_favorited) {
        this.removePost(index);
      }
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

  removePost(index) {
    const posts = this.data.posts.filter((_, i) => i !== index);
    this.setData({ posts });
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
