const postBehavior = require('../../behaviors/post-behavior');
const userBehavior = require('../../behaviors/user-behavior');
const { getOpenID, ui, nav } = require('../../utils/util');

Component({
  behaviors: [postBehavior, userBehavior],

  properties: {
    post: {
      type: Object,
      value: null
    },
    currentOpenid: {
      type: String,
      value: ''
    },
    showActions: {
      type: Boolean,
      value: true
    },
    showComments: {
      type: Boolean,
      value: true
    },
    showFollow: {
      type: Boolean,
      value: true
    }
  },

  data: {
    isLiked: false,
    isFavorited: false,
    isFollowed: false,
    showFull: false
  },

  observers: {
    'post': function(post) {
      if (post) {
        this.updatePostStatus();
      }
    }
  },

  lifetimes: {
    attached() {
      this.init();
    }
  },

  methods: {
    async init() {
      // 如果没有指定currentOpenid，则获取当前用户openid
      if (!this.properties.currentOpenid) {
        const openid = await getOpenID(false);
        this.setData({ currentOpenid: openid });
      }
      
      if (this.properties.post) {
        this.updatePostStatus();
      }
    },
    
    toggleContent() {
      this.setData({
        showFull: !this.data.showFull
      });
    },
    
    updatePostStatus() {
      const { post, currentOpenid } = this.properties;
      
      if (!post || !currentOpenid) return;
      
      // 优先使用API返回的状态
      const isLiked = post.is_liked !== undefined ? post.is_liked : 
                      (Array.isArray(post.liked_users) && 
                      post.liked_users.includes(currentOpenid));
      
      const isFavorited = post.is_favorited !== undefined ? post.is_favorited : 
                         (Array.isArray(post.favorite_users) && 
                         post.favorite_users.includes(currentOpenid));
      
      // 检查关注状态
      const isFollowed = Array.isArray(post.followed_users) && 
                         post.followed_users.includes(currentOpenid);
      
      this.setData({
        isLiked,
        isFavorited,
        isFollowed
      });
    },
    
    // 处理点赞
    handleLike() {
      if (!this.properties.post) return;
      
      const { id } = this.properties.post;
      const { isLiked } = this.data;
      
      if (isLiked) {
        this.unlikePost(id)
          .then(() => {
            this.setData({ 
              isLiked: false,
              'post.like_count': Math.max(0, (this.properties.post.like_count || 0) - 1)
            });
            this.triggerEvent('updatePost', { id, action: 'unlike' });
          });
      } else {
        this.likePost(id)
          .then(() => {
            this.setData({ 
              isLiked: true,
              'post.like_count': (this.properties.post.like_count || 0) + 1
            });
            this.triggerEvent('updatePost', { id, action: 'like' });
          });
      }
    },
    
    // 处理收藏
    handleFavorite() {
      if (!this.properties.post) return;
      
      const { id } = this.properties.post;
      const { isFavorited } = this.data;
      
      if (isFavorited) {
        this.unfavoritePost(id)
          .then(() => {
            this.setData({ 
              isFavorited: false,
              'post.favorite_count': Math.max(0, (this.properties.post.favorite_count || 0) - 1)
            });
            this.triggerEvent('updatePost', { id, action: 'unfavorite' });
          });
      } else {
        this.favoritePost(id)
          .then(() => {
            this.setData({ 
              isFavorited: true,
              'post.favorite_count': (this.properties.post.favorite_count || 0) + 1
            });
            this.triggerEvent('updatePost', { id, action: 'favorite' });
          });
      }
    },
    
    // 处理关注
    handleFollow() {
      if (!this.properties.post || !this.properties.post.openid) return;
      
      const userId = this.properties.post.openid;
      const { isFollowed } = this.data;
      
      if (isFollowed) {
        this.unfollowUser(userId)
          .then(() => {
            this.setData({ isFollowed: false });
            this.triggerEvent('updateUser', { userId, action: 'unfollow' });
          });
      } else {
        this.followUser(userId)
          .then(() => {
            this.setData({ isFollowed: true });
            this.triggerEvent('updateUser', { userId, action: 'follow' });
          });
      }
    },
    
    // 处理评论点击
    handleComment() {
      if (!this.properties.post) return;
      
      const { id } = this.properties.post;
      this.goToComments({ currentTarget: { dataset: { id } } });
    },
    
    // 处理帖子点击
    handlePostTap() {
      if (!this.properties.post) return;
      
      const { id } = this.properties.post;
      this.goToDetail({ currentTarget: { dataset: { id } } });
    },
    
    // 处理用户点击
    handleUserTap() {
      if (!this.properties.post || !this.properties.post.openid) return;
      
      const userId = this.properties.post.openid;
      this.goToUserProfile(userId);
    },
    
    // 跳转到用户主页
    goToUserProfile(userId) {
      if (!userId) return;
      
      wx.navigateTo({
        url: `/pages/user-profile/user-profile?id=${userId}`
      });
    },
    
    // 处理图片点击
    handleImageTap(e) {
      if (!this.properties.post || !this.properties.post.image) return;
      
      const { index } = e.currentTarget.dataset;
      const url = this.properties.post.image;
      const current = url[index];
      
      this.previewImage({ 
        currentTarget: { 
          dataset: { 
            url, 
            current 
          } 
        } 
      });
    },

    // 图片预览
    previewImage(e) {
      const { url, current } = e.currentTarget.dataset;
      
      if (!url || !url.length) return;
      
      wx.previewImage({
        current: current || url[0],
        urls: url
      });
    },
    
    // 跳转到帖子详情
    goToDetail(e) {
      const { id } = e.currentTarget.dataset;
      if (!id) return;
      
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${id}`
      });
    },
    
    // 跳转到评论区
    goToComments(e) {
      const { id } = e.currentTarget.dataset;
      if (!id) return;
      
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${id}&tab=comments`
      });
    },
    
    // 图片加载错误处理
    handleImageError(e) {
      console.debug('图片加载失败', {
        type: e.currentTarget.dataset.type,
        src: e.currentTarget.dataset.src || '未提供',
        e: e.detail
      });
    },
    
    // 分享处理
    onShareTap() {
      this.triggerEvent('share', { post: this.properties.post });
    },
    
    // 处理标签点击
    handleTagTap(e) {
      const { tag } = e.currentTarget.dataset;
      if (!tag) return;
      
      wx.navigateTo({
        url: `/pages/tag/tag?tag=${encodeURIComponent(tag)}`
      });
    },
    
    // 点赞帖子
    async likePost(postId) {
      try {
        await this.toggleLike(postId);
        return Promise.resolve();
      } catch (err) {
        console.debug('点赞失败:', err);
        ui.showToast('点赞失败', { type: 'error' });
        return Promise.reject(err);
      }
    },
    
    // 取消点赞
    async unlikePost(postId) {
      return this.likePost(postId);
    },
    
    // 收藏帖子
    async favoritePost(postId) {
      try {
        await this.toggleFavorite(postId);
        return Promise.resolve();
      } catch (err) {
        console.debug('收藏失败:', err);
        ui.showToast('收藏失败', { type: 'error' });
        return Promise.reject(err);
      }
    },
    
    // 取消收藏
    async unfavoritePost(postId) {
      return this.favoritePost(postId);
    },
    
    // 关注用户
    async followUser(userId) {
      try {
        await this.toggleFollow(userId);
        return Promise.resolve();
      } catch (err) {
        console.debug('关注失败:', err);
        ui.showToast('关注失败', { type: 'error' });
        return Promise.reject(err);
      }
    },
    
    // 取消关注
    async unfollowUser(userId) {
      return this.followUser(userId);
    }
  }
}); 