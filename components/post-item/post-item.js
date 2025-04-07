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
    },
    // 是否在详情页面显示，详情页不应折叠内容
    detailPage: {
      type: Boolean,
      value: false
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
    formattedTime: '',
    // Markdown相关
    isMarkdown: false,
    markdownNodes: null,
    // 默认头像
    defaultAvatar: '',
    // 用户信息
    userInfo: null,
    likeIcon: {
      name: 'like',
      size: 24,
      color: '#666'
    },
    commentIcon: {
      name: 'comment',
      size: 24,
      color: '#666'
    },
    favoriteIcon: {
      name: 'favorite',
      size: 24,
      color: '#666'
    },
    shareIcon: {
      name: 'share',
      size: 24,
      color: '#666'
    }
  },

  observers: {
    'post': function(post) {
      if (!post || !post.id) return;
      
      // 使用nextTick避免框架渲染冲突
      wx.nextTick(() => {
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
          }
        }
        
        // 默认所有内容都使用text-area组件渲染
        // 检查是否包含Markdown格式
        const isMarkdown = post.content && (
          post.content.includes('#') || 
          post.content.includes('*') || 
          post.content.includes('[') || 
          post.content.includes('```')
        );
        
        this.setData({ isMarkdown: true });
      });
    },
    'detailPage': function(isDetailPage) {
      // 在详情页面，默认展开内容
      if (isDetailPage) {
        this.setData({
          contentExpanded: true
        });
      }
    },
    'isLiked': function(isLiked) {
      this.setData({
        likeIcon: {
          name: 'like',
          size: 24,
          color: isLiked ? '#ff6b6b' : '#666'
        },
        commentIcon: {
          name: 'comment',
          size: 24,
          color: '#666'
        },
        shareIcon: {
          name: 'share',
          size: 24,
          color: '#666'
        },
        
      });
    },
    'isFavorited': function(isFavorited) {
      this.setData({
        favoriteIcon: {
          name: 'favorite',
          size: 24,
          color: isFavorited ? '#ffc107' : '#666'
        }
      });
    }
  },

  lifetimes: {
    attached() {
      // 获取默认头像和用户信息
      const defaultAvatar = this.getStorage('defaultAvatar');
      const userInfo = this.getStorage('userInfo');
      
      this.setData({ 
        defaultAvatar,
        userInfo: userInfo || null
      });
      
      // 延迟初始化，避免渲染框架内部状态冲突
      wx.nextTick(() => {
        this.init();
        this.checkContentOverflow();
        this.checkUserInteraction();
        this._updateIcons();
      });
    },
    ready() {
      // 在组件完全渲染后检查内容是否溢出
      this.checkContentOverflow();
    }
  },

  methods: {
    async init() {      
      if (!this.properties.post || !this.properties.post.id) return;
      
      this.updatePostStatus();
      
      // 获取用户信息补充bio
      try {
        // 使用_enrichPostWithUserInfo方法获取用户信息
        const enrichedPost = await this._enrichPostWithUserInfo(this.properties.post);
        if (enrichedPost && enrichedPost.bio) {
          wx.nextTick(() => {
            this.setData({
              'post.bio': enrichedPost.bio
            });
          });
        }
      } catch (e) {
      }
    },
    
    // 初始化帖子数据和状态
    _initPost() {
      const post = this.data.post;
      
      // 判断当前用户是否已点赞、收藏和关注
      const isLiked = post.is_liked === 1;
      const isFavorited = post.is_favorited === 1;
      const isFollowed = post.is_followed === 1;
      
      // 更新状态
      this.setData({
        isLiked,
        isFavorited,
        isFollowed
      });
      
      // 更新图标
      this._updateIcons();
    },
    
    // 检查内容是否超出
    checkContentOverflow() {
      // 如果是详情页，不检查内容溢出
      if (this.properties.detailPage) {
        this.setData({
          contentExpanded: true,
          contentOverflow: false
        });
        return;
      }
      
      // 检查是否有内容
      const content = this.data.post && this.data.post.content;
      if (!content || content.trim() === '') {
        this.setData({
          contentOverflow: false,
          isMarkdown: false // 空内容不使用Markdown渲染
        });
        return;
      }

      // 防止重复检测过多
      if (this.checkingContentOverflow) {
        return;
      }
      this.checkingContentOverflow = true;

      try {
        const query = this.createSelectorQuery();
        
        // 根据内容类型选择对应的选择器
        if (this.data.isMarkdown) {
          query.select('.markdown-wrapper').boundingClientRect();
        } else {
          query.select('.post-body').boundingClientRect();
        }
        
        query.exec(rect => {
          if (rect && rect[0]) {
            const lineHeight = 28; // 根据CSS中的字体大小和行高估算
            const maxHeight = lineHeight * 4; // 减少到4行文本的高度
            
            // 判断内容是否超出最大高度
            let contentOverflow = false;
            
            // 检查内容实际高度
            if (rect[0].height > maxHeight) {
              // 内容超过最大高度，显示展开按钮
              contentOverflow = true;
            } else if (this.data.isMarkdown && content.length > 60) {
              // Markdown内容特殊处理，减少字符阈值
              contentOverflow = rect[0].height > lineHeight * 2;
            }
            
            // 如果高度为0，可能是因为内容还未渲染，延迟检测，但限制递归次数
            if (rect[0].height === 0) {
              if (!this.retryCount) {
                this.retryCount = 0;
              }
              
              if (this.retryCount < 2) {
                this.retryCount++;
                setTimeout(() => {
                  this.checkingContentOverflow = false;
                  this.checkContentOverflow();
                }, 100);
                return;
              }
            }
            
            this.setData({ contentOverflow });
          }
          this.checkingContentOverflow = false;
        });
      } catch (e) {
        this.checkingContentOverflow = false;
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
        isLiked: post.is_liked === 1 || post.is_liked === true,
        isFavorited: post.is_favorited === 1 || post.is_favorited === true,
        isFollowed: post.is_followed === 1 || post.is_followed === true
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
          url: `/pages/post/detail/detail?id=${postId}`
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
      this.triggerEvent('tagtap', { tag });
    },
    
    // 处理点赞事件
    async _onLikeTap() {
      // 防止重复点击
      if (this.data.isProcessing.like) return;
      
      const postId = this.properties.post.id;
      if (!postId) return;
      
      const isLiked = this.data.isLiked;
      
      // 设置按钮状态为处理中，避免重复操作
      this.setData({
        'isProcessing.like': true,
        'isLiked': !isLiked
      });
      
      try {
        // 调用post行为的点赞/取消点赞方法
        const action = isLiked ? 'unlike' : 'like';
        const res = await this._doPostAction(postId, action);
        
        // 更新帖子状态
        if (res && res.code === 200) {
          // 更新点赞数
          const currentLikes = parseInt(this.properties.post.like_count || 0);
          this.setData({
            'post.like_count': isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
            'isProcessing.like': false
          });
        }
      } catch (err) {
        // 恢复原状态
        this.setData({
          'isLiked': isLiked,
          'isProcessing.like': false
        });
      }
    },
    
    // 收藏
    _onFavoriteTap() {
      const post = this.data.post;
      if (!post || !post.id) return;
      
      // 检查用户登录状态
      const openid = this.getStorage('openid');
      if (!openid) {
        this.showToast('请先登录', 'error');
        return;
      }
      
      const isFavorited = this.data.isFavorited;
      const newFavoriteCount = post.favorite_count + (isFavorited ? -1 : 1);
      
      // 乐观更新UI
      this.setData({
        isFavorited: !isFavorited,
        'post.favorite_count': newFavoriteCount >= 0 ? newFavoriteCount : 0,
        'post.is_favorited': !isFavorited ? 1 : 0
      });
      
      // 调用行为方法处理实际的收藏/取消收藏操作
      this._favoritePost(post.id)
        .then(res => {
          if (res && res.code === 200 && res.data) {
            // 获取服务器返回的状态数据
            // 服务器返回格式: {data: {"post_id": {is_favorited: true, favorite_count: 2}}}
            const postId = post.id.toString();
            const statusData = res.data || {};
            
            // 使用服务器返回的状态更新
            this.setData({
              isFavorited: statusData.is_favorited || false,
              'post.favorite_count': statusData.favorite_count || 0,
              'post.is_favorited': statusData.is_favorited ? 1 : 0
            });
            
            // 触发事件通知父组件
            this.triggerEvent('favorite', {
              id: post.id,
              index: this.data.index,
              isFavorited: statusData.is_favorited || false,
              favoriteCount: statusData.favorite_count || 0
            });
          }
        })
        .catch(err => {
          // 恢复原状态
          this.setData({
            isFavorited: isFavorited,
            'post.favorite_count': post.favorite_count,
            'post.is_favorited': isFavorited ? 1 : 0
          });
        });
    },
    
    // 评论
    _onCommentTap() {
      const postId = this.data.post.id;
      if (postId) {
        wx.navigateTo({
          url: `/pages/post/detail/detail?id=${postId}&focus=comment`
        });
      }
    },
    
    // 关注
    _onFollowTap(e) {
      const post = this.data.post;
      if (!post || !post.openid) return;
      
      // 检查用户登录状态
      const openid = this.getStorage('openid');
      if (!openid) {
        this.showToast('请先登录', 'error');
        return;
      }
      
      // 不能关注自己
      if (post.openid === openid) {
        this.showToast('不能关注自己', 'error');
        return;
      }
      
      const isFollowed = this.data.isFollowed;
      
      // 乐观更新UI
      this.setData({ 
        isFollowed: !isFollowed,
        'post.is_followed': !isFollowed ? 1 : 0
      });
      
      // 调用行为方法处理实际的关注/取消关注操作
      this._toggleFollow(post.openid)
        .then(res => {
          if (res && res.success) {
            // 使用服务器返回的状态更新
            const isNowFollowing = res.is_following || res.status === 'followed';
            this.setData({ 
              isFollowed: isNowFollowing,
              'post.is_followed': isNowFollowing ? 1 : 0
            });
            
            // 触发事件通知父组件
            this.triggerEvent('follow', {
              id: post.id,
              authorId: post.openid,
              index: this.data.index,
              isFollowed: isNowFollowing
            });
            
            // 显示操作结果提示
            this.showToast(isNowFollowing ? '关注成功' : '已取消关注', 'success');
          }
        })
        .catch(err => {
          // 恢复原状态
          this.setData({ 
            isFollowed: isFollowed,
            'post.is_followed': isFollowed ? 1 : 0
          });
        });
    },
    
    // 查看更多评论
    _onViewMoreComments() {
      const postId = this.data.post.id;
      if (postId) {
        wx.navigateTo({
          url: `/pages/post/detail/detail?id=${postId}&tab=comment`
        });
      }
    },

    checkUserInteraction() {
      const { post } = this.data;
      if (!post) return;
      
      this.setData({
        isLiked: post.is_liked === 1 || post.is_liked === true,
        isFavorited: post.is_favorited === 1 || post.is_favorited === true,
        isFollowed: post.is_followed === 1 || post.is_followed === true
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
      
      // 使用postBehavior中的_deletePost方法删除帖子
      this._deletePost(post.id)
        .then(res => {
          // 显示成功消息
          this.showToast('删除成功', 'success');
          
          // 触发删除成功事件
          this.triggerEvent('postDeleted', {
            id: post.id,
            index: this.data.index
          });
        })
        .catch(err => {
          // 显示错误消息
          this.showToast('删除失败，请稍后重试', 'error');
        })
        .finally(() => {
          this.setData({
            'isProcessing.delete': false
          });
        });
    },

    // 更新图标状态
    _updateIcons() {
      // 确保使用最新的状态
      const isLiked = this.data.isLiked;
      const isFavorited = this.data.isFavorited;
      
      this.setData({
        likeIcon: {
          name: 'like',
          size: 24,
          color: isLiked ? '#ff6b6b' : '#666'
        },
        commentIcon: {
          name: 'comment',
          size: 24,
          color: '#666'
        },
        favoriteIcon: {
          name: 'favorite',
          size: 24,
          color: isFavorited ? '#ffc107' : '#666'
        },
        shareIcon: {
          name: 'share',
          size: 24,
          color: '#666'
        }
      });
    }
  }
}); 