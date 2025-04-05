// 我的帖子页面
const app = getApp();
const { formatRelativeTime } = require('../../../utils/util');

// 创建用户API客户端
const userApi = wx.$api ? wx.$api.createApiClient('/api/wxapp/user', {
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
}) : require('../../../utils/util').createApiClient('/api/wxapp/user', {
  getLikes: {
    method: 'GET',
    path: '/like',
    params: {
      openid: true,
      offset: true,
      limit: true
    }
  },
  getFavorites: {
    method: 'GET',
    path: '/favorite',
    params: {
      openid: true,
      offset: true,
      limit: true
    }
  },
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
const postApi = wx.$api ? wx.$api.createApiClient('/api/wxapp/post', {
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
}) : require('../../../utils/util').createApiClient('/api/wxapp/post', {
  likePost: {
    method: 'POST',
    path: '/like',
    data: {
      post_id: true,
      openid: true
    }
  },
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
    tabIndex: 0,
    pageTitle: TAB_CONFIG.LIKE.title,
    emptyText: TAB_CONFIG.LIKE.emptyText,
    refreshing: false,
    tabTitles: ['我的点赞', '我的收藏', '我的评论'],
    isLoadingShown: false // 跟踪loading状态
  },

  async onLoad(options) {
    console.log('mylike_fav_comment页面接收参数:', options);
    
    try {
      // 获取登录信息
      const app = getApp();
      const openid = app.globalData?.openid || wx.getStorageSync('openid');
      
      if (!openid) {
        this.setData({ 
          error: true,
          errorMsg: '请先登录' 
        });
        return;
      }
      
      // 解析tab参数
      let tabIndex = 0; // 默认为0（我的点赞）
      
      if (options && options.tab !== undefined) {
        tabIndex = parseInt(options.tab);
        // 检查是否解析成功以及是否在有效范围内
        if (isNaN(tabIndex) || tabIndex < 0 || tabIndex > 2) {
          console.warn('无效的tab参数:', options.tab, '将使用默认值0');
          tabIndex = 0;
        }
      }
      
      console.log('将使用tabIndex:', tabIndex);
      
      // 获取对应的tab配置
      const tabKeys = Object.keys(TAB_CONFIG);
      const tabKey = tabKeys[tabIndex] || 'LIKE';
      const tabConfig = TAB_CONFIG[tabKey];
      
      // 更新页面状态
      this.setData({
        openid,
        tabIndex,
        pageTitle: tabConfig.title,
        emptyText: tabConfig.emptyText
      });
      
      // 加载数据
      await this.loadList();
    } catch (err) {
      console.error('页面初始化失败:', err);
      this.setData({
        error: true,
        errorMsg: '页面加载失败，请重试'
      });
      
      // 确保loading状态被隐藏
      if (this.data.isLoadingShown) {
        wx.hideLoading();
        this.setData({ isLoadingShown: false });
      }
    }
  },

  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    await this.resetList();
    wx.stopPullDownRefresh();
    this.setData({ refreshing: false });
  },

  // 确保switchTab方法能够正确响应标签切换
  async switchTab(e) {
    try {
      // 支持多种事件类型
      const tabIndex = e.detail?.index !== undefined ? e.detail.index : 
                      (e.currentTarget?.dataset?.index !== undefined ? 
                      parseInt(e.currentTarget.dataset.index) : 0);
      
      console.log('切换到标签:', tabIndex);
      
      if (tabIndex === this.data.tabIndex) return;
      
      // 获取对应的tab配置
      const tabKeys = Object.keys(TAB_CONFIG);
      const tabKey = tabKeys[tabIndex] || 'LIKE';
      const tabConfig = TAB_CONFIG[tabKey];
      
      this.setData({
        tabIndex,
        pageTitle: tabConfig.title,
        emptyText: tabConfig.emptyText,
        // 切换标签时重置列表状态
        posts: [],
        page: 1,
        hasMore: true
      });
      
      await this.loadList();
    } catch (err) {
      console.error('切换标签页失败:', err);
      // 确保loading被隐藏
      if (this.data.isLoadingShown) {
        wx.hideLoading();
        this.setData({ isLoadingShown: false });
      }
    }
  },

  // --- Data Loading ---
  async loadList() {
    if (this.data.loading || !this.data.hasMore) return;

    // 安全处理：如果已经有showLoading，先隐藏它
    if (this.data.isLoadingShown) {
      wx.hideLoading();
    }

    wx.showLoading({ title: '加载中' });
    this.setData({ 
      loading: true, 
      error: false,
      isLoadingShown: true
    });

    try {
      // 准备请求参数
      const params = {
        openid: this.data.openid,
        offset: (this.data.page - 1) * this.data.pageSize,
        limit: this.data.pageSize
      };

      let response = null;

      // 根据当前标签选择不同的API
      switch (this.data.tabIndex) {
        case TAB_CONFIG.LIKE.index:
          try {
            response = await userApi.getLikes(params);
            console.log('点赞列表响应:', response);
          } catch (err) {
            console.error('获取点赞列表失败:', err);
            response = { code: 200, data: [] };
          }
          break;
        case TAB_CONFIG.FAVORITE.index:
          try {
            response = await userApi.getFavorites(params);
            console.log('收藏列表响应:', response);
          } catch (err) {
            console.error('获取收藏列表失败:', err);
            response = { code: 200, data: [] };
          }
          break;
        case TAB_CONFIG.COMMENT.index:
          try {
            response = await userApi.getComments(params);
            console.log('评论列表响应:', response);
          } catch (err) {
            console.error('获取评论列表失败:', err);
            response = { code: 200, data: [] };
          }
          break;
      }

      // 确保响应数据有效
      if (!response || response.code !== 200) {
        console.warn('API响应无效:', response);
        response = { code: 200, data: [] };
      }
      
      if (!response.data) {
        console.warn('API响应缺少data字段:', response);
        response.data = [];
      }

      // 确保data是数组
      let dataArray = [];
      if (Array.isArray(response.data)) {
        dataArray = response.data;
      } else {
        console.warn('响应data不是数组:', response.data);
      }
      
      // 根据当前标签页类型过滤数据
      if (this.data.tabIndex === TAB_CONFIG.LIKE.index) {
        // 确保只显示已点赞的帖子
        dataArray = dataArray.filter(post => post.isLiked === true);
      } else if (this.data.tabIndex === TAB_CONFIG.FAVORITE.index) {
        // 确保只显示已收藏的帖子
        dataArray = dataArray.filter(post => post.isFavorited === true);
      }
      
      // 处理帖子数据
      const newPosts = dataArray.map(post => ({
        ...post,
        // 确保所有必要的字段都存在
        id: post.id || post.post_id || '',
        title: post.title || '',
        content: post.content || '',
        username: post.username || post.author_name || '用户',
        avatar: post.avatar || post.author_avatar || '',
        like_count: post.like_count || 0,
        favorite_count: post.favorite_count || 0,
        comment_count: post.comment_count || 0,
        isLiked: post.isLiked === true,
        isFavorited: post.isFavorited === true,
        formattedTime: formatRelativeTime(post.create_time || Date.now())
      }));

      // 更新页面数据
      this.setData({
        posts: [...this.data.posts, ...newPosts],
        hasMore: newPosts.length === this.data.pageSize,
        page: this.data.page + 1
      });
      
      // 更新空状态提示
      if (this.data.posts.length === 0) {
        const emptyText = TAB_CONFIG[
          Object.keys(TAB_CONFIG)[this.data.tabIndex]
        ].emptyText;
        this.setData({ emptyText });
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      
      this.setData({
        error: true,
        errorMsg: err.message || '加载失败，请重试'
      });
      
      wx.showToast({
        title: '加载失败: ' + (err.message || '请重试'),
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ 
        loading: false,
        isLoadingShown: false
      });
      
      wx.hideLoading();
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
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const { id, index } = e.detail;
    const post = this.data.posts[index];
    const isLiked = post.isLiked;

    // 乐观更新
    this.updatePost(index, {
      isLiked: !isLiked,
      like_count: isLiked ? Math.max(0, post.like_count - 1) : (post.like_count + 1)
    });

    try {
      const res = await postApi.likePost({
        post_id: id,
        openid: this.data.openid
      });

      if (res.code !== 200 || !res.data) {
        throw new Error(res.message || '操作失败');
      }

      // 使用后端返回的实际数据更新UI
      this.updatePost(index, {
        isLiked: res.data.is_liked,
        like_count: res.data.like_count
      });

      // 关键逻辑：如果帖子的点赞状态为false，并且是在"我的点赞"标签页，则移除该帖子
      if (this.data.tabIndex === TAB_CONFIG.LIKE.index && !res.data.is_liked) {
        this.removePost(index);
        
        // 如果移除后列表为空，显示合适的提示
        if (this.data.posts.length === 0) {
          this.setData({ emptyText: TAB_CONFIG.LIKE.emptyText });
        }
        
        wx.showToast({
          title: '已取消点赞',
          icon: 'success',
          duration: 1500
        });
      }
    } catch (err) {
      console.error('点赞操作失败:', err);
      // 恢复原始状态
      this.updatePost(index, post);
      
      wx.showToast({
        title: '点赞失败',
        icon: 'none',
        duration: 1500
      });
    }
  },

  async onFavorite(e) {
    if (!this.data.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const { id, index } = e.detail;
    const post = this.data.posts[index];
    const isFavorited = post.isFavorited;

    // 乐观更新
    this.updatePost(index, {
      isFavorited: !isFavorited,
      favorite_count: isFavorited ? Math.max(0, post.favorite_count - 1) : (post.favorite_count + 1)
    });

    try {
      const res = await postApi.favoritePost({
        post_id: id,
        openid: this.data.openid
      });

      if (res.code !== 200 || !res.data) {
        throw new Error(res.message || '操作失败');
      }

      // 使用后端返回的实际数据更新UI
      this.updatePost(index, {
        isFavorited: res.data.is_favorited,
        favorite_count: res.data.favorite_count
      });

      // 关键逻辑：如果帖子的收藏状态为false，并且是在"我的收藏"标签页，则移除该帖子
      if (this.data.tabIndex === TAB_CONFIG.FAVORITE.index && !res.data.is_favorited) {
        this.removePost(index);
        
        // 如果移除后列表为空，显示合适的提示
        if (this.data.posts.length === 0) {
          this.setData({ emptyText: TAB_CONFIG.FAVORITE.emptyText });
        }
        
        wx.showToast({
          title: '已取消收藏',
          icon: 'success',
          duration: 1500
        });
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
      // 恢复原始状态
      this.updatePost(index, post);
      
      wx.showToast({
        title: '收藏失败',
        icon: 'none',
        duration: 1500
      });
    }
  },

  onComment(e) {
    if (!this.data.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
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
    // 防止越界
    if (index < 0 || index >= this.data.posts.length) {
      console.warn('更新帖子索引越界:', index, this.data.posts.length);
      return;
    }
    
    this.setData({
      [`posts[${index}]`]: {
        ...this.data.posts[index],
        ...data
      }
    });
  },

  removePost(index) {
    // 防止越界
    if (index < 0 || index >= this.data.posts.length) {
      console.warn('移除帖子索引越界:', index, this.data.posts.length);
      return;
    }
    
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
  },
  
  // 生命周期方法
  onShow() {
    // 确保页面显示时没有遗留的loading
    if (this.data.isLoadingShown) {
      wx.hideLoading();
      this.setData({ isLoadingShown: false });
    }
  },
  
  onHide() {
    // 页面隐藏时隐藏loading
    if (this.data.isLoadingShown) {
      wx.hideLoading();
      this.setData({ isLoadingShown: false });
    }
  },
  
  onUnload() {
    // 页面卸载时隐藏loading
    if (this.data.isLoadingShown) {
      wx.hideLoading();
      this.setData({ isLoadingShown: false });
    }
  }
});
