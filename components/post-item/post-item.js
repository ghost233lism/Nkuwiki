const baseBehavior = require('../../behaviors/baseBehavior');
const postBehavior = require('../../behaviors/postBehavior');
const userBehavior = require('../../behaviors/userBehavior');
const { formatRelativeTime } = require('../../utils/util.js');

Component({
  behaviors: [baseBehavior, postBehavior, userBehavior],

  options: {
    multipleSlots: true,
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    post: {
      type: Object,
      value: {}
    },
    showAction: {
      type: Boolean,
      value: true
    },
    showComment: {
      type: Boolean,
      value: true
    },
    showFollow: {
      type: Boolean,
      value: true
    },
    showUserInfo: {
      type: Boolean,
      value: true
    },
    showImage: {
      type: Boolean,
      value: true
    },
    showContent: {
      type: Boolean,
      value: true
    },
    isCard: {
      type: Boolean,
      value: false
    },
    index: {
      type: Number,
      value: -1
    },
    customStyle: {
      type: String,
      value: ''
    }
  },

  data: {
    isLiked: false,
    isFavorited: false,
    isFollowed: false,
    showFull: false,
    isProcessing: {
      like: false,
      favorite: false,
      follow: false,
      delete: false
    },
    contentExpanded: false,
    contentOverflow: false,
    formattedTime: ''
  },

  observers: {
    'post': function(post) {
      if (post && post.id) {
        this._initPost();
        
        // 格式化发布时间
        if (post.create_time) {
          this.setData({
            formattedTime: formatRelativeTime(post.create_time)
          });
        }
        
        // 解析图片数据
        if (post.image && typeof post.image === 'string') {
          try {
            const images = JSON.parse(post.image);
            if (Array.isArray(images)) {
              this.setData({
                'post.images': images
              });
            }
          } catch (e) {
            console.error('解析图片数据失败:', e);
          }
        }
        
        // 解析标签数据
        if (post.tag && typeof post.tag === 'string') {
          try {
            const tags = JSON.parse(post.tag);
            if (Array.isArray(tags)) {
              this.setData({
                'post.tags': tags
              });
            }
          } catch (e) {
            console.error('解析标签数据失败:', e);
          }
        }
      }
    }
  },

  lifetimes: {
    attached() {
      this.init();
      this.checkContentOverflow();
      this.checkUserInteraction();
    },
    ready() {
      // 在组件完全渲染后检查内容是否溢出
      this.checkContentOverflow();
    }
  },

  methods: {
    async init() {      
      if (this.properties.post) {
        this.updatePostStatus();
        
        // 获取用户信息补充bio
        try {
          // 使用_enrichPostWithUserInfo方法获取用户信息
          const enrichedPost = await this._enrichPostWithUserInfo(this.properties.post);
          if (enrichedPost && enrichedPost.bio) {
            this.setData({
              'post.bio': enrichedPost.bio
            });
          }
        } catch (e) {
          console.debug('获取用户信息失败:', e);
        }
      }
    },
    
    // 初始化帖子数据和状态
    _initPost() {
      if (!this.data.post) return;
      
      // 检查内容是否超出
      this.checkContentOverflow();
      
      // 更新交互状态
      this.updatePostStatus();
    },
    
    // 检查内容是否超出
    checkContentOverflow() {
      try {
        const query = this.createSelectorQuery();
        query.select('.post-body').boundingClientRect();
        query.exec(rect => {
          if (rect && rect[0]) {
            const lineHeight = 28; // 根据CSS中的字体大小和行高估算
            const maxHeight = lineHeight * 3; // 3行文本的高度
            const contentOverflow = rect[0].height > maxHeight;
            this.setData({ contentOverflow });
          }
        });
      } catch (e) {
        console.error('检查内容高度失败', e);
      }
    },
    
    // 获取当前用户信息
    async _getUserInfo() {
      const { post } = this.data;
      if (!post || !post.openid) return null;
      
      const userInfo = this.getStorage('userInfo');
      if (userInfo && userInfo.openid === post.openid) {
        return userInfo;
      }
      
      return null;
    },
    
    // 更新帖子状态（点赞、收藏等）
    updatePostStatus() {
      const post = this.data.post;
      if (!post) return;
      
      // 从帖子数据中获取状态 - 后端会返回交互状态
      // is_liked、is_favorited和is_followed都是后端返回的字段
      this.setData({
        isLiked: post.is_liked === 1,
        isFavorited: post.is_favorited === 1,
        isFollowed: post.is_followed === 1
      });
    },
    
    // 展开/收起内容
    _onExpandTap() {
      this.setData({
        contentExpanded: !this.data.contentExpanded
      });
    },
    
    // 点击头像
    _onAvatarTap() {
      const openid = this.data.post.openid;
      if (openid) {
        wx.navigateTo({
          url: `/pages/user-profile/user-profile?openid=${openid}`
        });
      }
    },
    
    // 点击作者
    _onAuthorTap() {
      this._onAvatarTap();
    },
    
    // 点击帖子
    _onPostTap() {
      const postId = this.data.post.id;
      if (postId) {
        wx.navigateTo({
          url: `/pages/post-detail/post-detail?post_id=${postId}`
        });
      }
    },
    
    // 点击图片
    _onImageTap(e) {
      const { index, images } = e.currentTarget.dataset;
      const urls = this.data.post.images || [];
      
      wx.previewImage({
        current: urls[index],
        urls: urls
      });
    },
    
    // 点击标签
    _onTagTap(e) {
      const tag = e.currentTarget.dataset.tag;
      wx.navigateTo({
        url: `/pages/tag-posts/tag-posts?tag=${encodeURIComponent(tag)}`
      });
    },
    
    // 点赞
    _onLikeTap() {
      const post = this.data.post;
      if (!post || !post.id) return;
      
      const isLiked = this.data.isLiked;
      const newLikeCount = post.like_count + (isLiked ? -1 : 1);
      
      // 乐观更新UI
      this.setData({
        isLiked: !isLiked,
        'post.like_count': newLikeCount >= 0 ? newLikeCount : 0
      });
      
      // 调用行为方法处理实际的点赞/取消点赞操作
      this._likePost(post.id)
        .catch(err => {
          console.error('点赞操作失败', err);
          // 恢复原状态
          this.setData({
            isLiked: isLiked,
            'post.like_count': post.like_count
          });
        });
    },
    
    // 收藏
    _onFavoriteTap() {
      const post = this.data.post;
      if (!post || !post.id) return;
      
      const isFavorited = this.data.isFavorited;
      const newFavoriteCount = post.favorite_count + (isFavorited ? -1 : 1);
      
      // 乐观更新UI
      this.setData({
        isFavorited: !isFavorited,
        'post.favorite_count': newFavoriteCount >= 0 ? newFavoriteCount : 0
      });
      
      // 调用行为方法处理实际的收藏/取消收藏操作
      this._favoritePost(post.id)
        .catch(err => {
          console.error('收藏操作失败', err);
          // 恢复原状态
          this.setData({
            isFavorited: isFavorited,
            'post.favorite_count': post.favorite_count
          });
        });
    },
    
    // 评论
    _onCommentTap() {
      const postId = this.data.post.id;
      if (postId) {
        wx.navigateTo({
          url: `/pages/post-detail/post-detail?post_id=${postId}&focus=comment`
        });
      }
    },
    
    // 关注
    _onFollowTap(e) {
      const { authorId, followed } = e.currentTarget.dataset;
      if (!authorId) return;
      
      // 乐观更新UI
      this.setData({ isFollowed: !followed });
      
      // 调用行为方法处理实际的关注/取消关注操作
      this._toggleFollow(authorId)
        .catch(err => {
          console.error('关注操作失败', err);
          // 恢复原状态
          this.setData({ isFollowed: followed });
        });
    },
    
    // 查看更多评论
    _onViewMoreComments() {
      const postId = this.data.post.id;
      if (postId) {
        wx.navigateTo({
          url: `/pages/post-detail/post-detail?post_id=${postId}&tab=comment`
        });
      }
    },

    checkUserInteraction() {
      const { post } = this.data;
      if (!post) return;
      
      this.setData({
        isLiked: post.is_liked === 1,
        isFavorited: post.is_favorited === 1,
        isFollowed: post.is_followed === 1
      });
    },

    getCurrentOpenid() {
      const app = getApp();
      return app.globalData.openid || '';
    },

    handleReport() {
      const { post } = this.data;
      if (!post || !post.id) return;
      
      this.navigateTo({
        url: `/pages/report/report?type=post&id=${post.id}`
      });
    },

    handleEdit() {
      const { post } = this.data;
      if (!post || !post.id) return;
      
      this.navigateTo({
        url: `/pages/post/publish/publish?id=${post.id}&action=edit`
      });
    },

    handleDelete() {
      const { post, isProcessing } = this.data;
      if (!post || !post.id || isProcessing.delete) return;
      
      // 显示确认对话框
      this.showModal({
        title: '删除帖子',
        content: '确定要删除这篇帖子吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#e64340',
        success: (res) => {
          if (res.confirm) {
            this.deletePost();
          }
        }
      });
    },

    deletePost() {
      const { post } = this.data;
      
      // 设置处理中状态
      this.setData({
        'isProcessing.delete': true
      });
      
      // 使用API删除帖子
      const app = getApp();
      const apiClient = app.createApiClient();
      
      apiClient.post('/post/delete', { id: post.id })
        .then(res => {
          // 显示成功消息
          this.showToast('删除成功', 'success');
          
          // 删除成功后返回上一页
          setTimeout(() => {
            this.navigateBack({
              delta: 1
            });
          }, 1500);
        })
        .catch(err => {
          console.debug('删除帖子失败', err);
          
          // 显示错误消息
          this.showToast({
            title: '删除失败，请稍后重试',
            icon: 'none'
          });
        })
        .finally(() => {
          this.updateState({
            'isProcessing.delete': false
          });
        });
    }
  }
}); 