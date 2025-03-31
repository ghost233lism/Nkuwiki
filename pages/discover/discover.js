// 引入API模块
const api = require('../../utils/api/index');
const util = require('../../utils/util');
const { getOpenID } = util;

// 工具函数
const formatTimeDisplay = (dateStr) => {
  if (!dateStr) return '';

  try {
    let date;
    if (typeof dateStr === 'string') {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        dateStr = dateStr.replace(' ', 'T');
      }
      date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        console.error('无效的日期格式:', dateStr);
        return '';
      }
    } else {
      date = new Date(dateStr);
    }
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  } catch (e) {
    console.error('时间格式化错误：', e);
    return '';
  }
};

// 处理JSON字段
const parseJsonField = (field, defaultValue = []) => {
  try {
    if (typeof field === 'string') {
      return JSON.parse(field || '[]');
    }
    return Array.isArray(field) ? field : defaultValue;
  } catch (err) {
    console.error('解析JSON字段失败:', err);
    return defaultValue;
  }
};

// 验证图片URL
const isValidImageUrl = (url) => {
  if (typeof url !== 'string' || url.trim() === '') return false;
  return url.startsWith('cloud://') || url.startsWith('http://') || url.startsWith('https://');
};

// 过滤有效图片URL
const filterValidImageUrls = (urls) => {
  return Array.isArray(urls) ? urls.filter(isValidImageUrl) : [];
};

Page({
  data: {
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    openid: ''
  },

  onLoad: async function() {
    try {
      // 获取用户openid
      const openid = await getOpenID();
      if (!openid) {
        throw new Error('获取用户信息失败');
      }

      this.setData({ openid });
      await this.loadPosts(true);
    } catch (err) {
      console.error('页面加载失败:', err);
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  onShow: async function() {
    try {
      await this.loadPosts(true);
    } catch (err) {
      console.error('页面显示失败:', err);
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 处理下拉刷新
  async onPullDownRefresh() {
    try {
      this.setData({
        page: 1,
        hasMore: true,
        posts: []
      });
      await this.loadPosts(true);
    } catch (err) {
      console.error('刷新失败：', err);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading || (!refresh && !this.data.hasMore)) return;

    try {
      this.setData({ loading: true });

      // 构建请求参数
      const params = {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        order_by: 'create_time DESC'
      };

      // 使用新的函数名getPostList
      const result = await api.post.getPostList(params);

      if (!result || !result.success) {
        throw new Error(result?.message || '获取帖子列表失败');
      }

      const posts = result.data || [];
      console.log('发现页获取到的帖子数量:', posts.length);

      // 处理帖子数据，post.js已经处理过图片URL和字段名，这里只需要处理UI相关的字段
      const processedPosts = posts.map(post => ({
        ...post,
        create_time_formatted: formatTimeDisplay(post.create_time),
        isLiked: post.liked_user.includes(this.data.openid),
        isFavorited: post.favorite_user.includes(this.data.openid)
      }));

      this.setData({
        posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
        page: refresh ? 2 : this.data.page + 1,
        hasMore: posts.length === this.data.pageSize,
        loading: false
      });
    } catch (err) {
      console.error('加载帖子失败：', err);
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 跳转到帖子详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      console.error('跳转详情页失败：未提供帖子ID');
      return;
    }

    try {
      wx.navigateTo({
        url: `/pages/post/detail/detail?id=${id}`,
        fail: (err) => {
          console.error('跳转详情页失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } catch (err) {
      console.error('跳转详情页出错:', err);
      wx.showToast({
        title: '跳转失败',
        icon: 'none'
      });
    }
  },

  // 点赞处理
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset;

    // 防止重复点击
    if (this.data.isLiking) return;
    this.setData({ isLiking: true });

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index];
      if (!currentPost) {
        throw new Error('帖子不存在');
      }

      // 立即更新UI状态
      const newIsLiked = !currentPost.isLiked;
      const newLikeCount = currentPost.like_count + (newIsLiked ? 1 : -1);

      // 保存原始状态，用于失败时回滚
      const originalState = {
        isLiked: currentPost.isLiked,
        likeCount: currentPost.like_count
      };

      // 先更新UI
      this.setData({
        [`posts[${index}].isLiked`]: newIsLiked,
        [`posts[${index}].like_count`]: newLikeCount
      });

      // 调用API
      try {
        const result = await api.post.likePost(id);
        
        // 使用API返回的点赞数更新UI
        if (result.success && result.data?.like_count !== undefined) {
          this.setData({
            [`posts[${index}].like_count`]: result.data.like_count
          });
        }
      } catch (err) {
        console.error('点赞失败：', err);
        // 回滚到原始状态
        this.setData({
          [`posts[${index}].isLiked`]: originalState.isLiked,
          [`posts[${index}].like_count`]: originalState.likeCount
        });
        
        // 显示错误信息
        wx.showToast({
          title: err.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('点赞操作出错：', err);
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLiking: false });
    }
  },

  // 收藏处理
  async handleFavorite(e) {
    const { id, index } = e.currentTarget.dataset;

    // 防止重复点击
    if (this.data.isFavoriting) return;
    this.setData({ isFavoriting: true });

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index];
      if (!currentPost) {
        throw new Error('帖子不存在');
      }

      // 立即更新UI状态
      const newIsFavorited = !currentPost.isFavorited;
      const newFavoriteCount = currentPost.favorite_count + (newIsFavorited ? 1 : -1);

      this.setData({
        [`posts[${index}].isFavorited`]: newIsFavorited,
        [`posts[${index}].favorite_count`]: newFavoriteCount
      });

      // 使用API模块收藏/取消收藏
      const result = newIsFavorited 
        ? await api.post.favoritePost(id)
        : await api.post.unfavoritePost(id);

      if (result.success) {
        // 使用API返回的收藏数更新UI
        if (result.data?.favorite_count !== undefined) {
          this.setData({
            [`posts[${index}].favorite_count`]: result.data.favorite_count
          });
        }

        wx.showToast({
          title: newIsFavorited ? '收藏成功' : '取消收藏',
          icon: 'none'
        });
      } else {
        // 失败时回滚UI状态
        this.setData({
          [`posts[${index}].isFavorited`]: currentPost.isFavorited,
          [`posts[${index}].favorite_count`]: currentPost.favorite_count
        });
        throw new Error(result?.message || '操作失败');
      }
    } catch (err) {
      console.error('收藏失败：', err);
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isFavoriting: false });
    }
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts();
    }
  }
});