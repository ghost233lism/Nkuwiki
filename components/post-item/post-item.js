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
    },
    isLiked: {
      type: Boolean,
      value: false
    },
    isFavorited: {
      type: Boolean,
      value: false
    },
    currentUserOpenid: {
      type: String,
      value: ''
    }
  },

  data: {
    is_liked: false,
    is_favorited: false,
    is_following: false,
    showFull: false,
    isProcessing: false,
    contentExpanded: false,
    contentOverflow: false,
    formattedTime: '',
    // Markdown相关
    isMarkdown: true,
    markdownNodes: null,
    // 默认头像
    defaultAvatar: '',
    // 用户信息
    userInfo: null,
    isSubmitting: false
  },

  observers: {
    'post': function(post) {
      if (!post || !post.id) return;
      
      this._updatePostData();
      
      // 解析内容数据
      this._parsePostContent();
    },
    'detailPage': function(isDetailPage) {
      if (isDetailPage) {
        this.setData({ contentExpanded: true });
        // 详情页模式下，每次属性变化时都主动刷新状态
        this._updateFromServer();
      }
    }
  },

  lifetimes: {
    attached() {
      this.setData({ 
        defaultAvatar: this.getStorage('defaultAvatar'),
        userInfo: this.getStorage('userInfo')
      });
    },
    
    ready() {
      // 只在详情页面时由post-item自己刷新状态
      if (this.properties.detailPage) {
        this._updateFromServer();
      }
      
      // 检查内容是否溢出
      this.checkContentOverflow();
    }
  },

  methods: {
    // 初始化/刷新组件
    init() {
      // 解析内容数据
      this._parsePostContent();
      
      // 检查内容是否溢出
      this.checkContentOverflow();
      
      // 如果在详情页，主动刷新状态
      if (this.properties.detailPage) {
        this._updateFromServer();
      }
    },
    
    // 解析帖子内容数据（图片、标签等）
    _parsePostContent() {
      const post = this.properties.post;
      if (!post) return;
      
      // 处理用户信息
      let userData = post.user || {};
      // 如果帖子包含用户信息字段，但没有专门的user对象，创建一个
      if (!post.user && (post.nickname || post.avatar || post.bio || post.openid)) {
        userData = {
          openid: post.openid,
          nickname: post.nickname,
          avatar: post.avatar,
          bio: post.bio
        };
      }
      
      // 格式化发布时间
      if (post.create_time) {
        this.setData({
          formattedTime: formatRelativeTime(post.create_time),
          userData: userData
        });
      } else {
        this.setData({
          userData: userData
        });
      }
      
      // 解析图片数据
      if (post.image && typeof post.image === 'string') {
        try {
          const images = JSON.parse(post.image);
          if (Array.isArray(images)) {
            this.setData({ 'post.images': images });
          }
        } catch (e) {}
      }
      
      // 解析标签数据
      if (post.tag && typeof post.tag === 'string') {
        try {
          const tags = JSON.parse(post.tag);
          if (Array.isArray(tags)) {
            this.setData({ 'post.tags': tags });
          }
        } catch (e) {}
      }
    },
    
    // 更新帖子状态数据
    _updatePostData() {
      const post = this.data.post;
      if (!post) return;
      
      // 准备更新的数据对象，只包含有效值
      const updateData = {};
      
      // 只有当值不是 undefined 时才设置
      if (post.is_liked !== undefined) {
        updateData.is_liked = post.is_liked;
      }
      
      if (post.is_favorited !== undefined) {
        updateData.is_favorited = post.is_favorited;
      }
      
      if (post.is_following !== undefined) {
        updateData.is_following = post.is_following;
      }
      
      // 只有在有数据需要更新时才调用 setData
      if (Object.keys(updateData).length > 0) {
        this.setData(updateData);
      }
    },
    
    // 从服务器获取最新帖子状态
    async _updateFromServer() {
      const postId = this.data.post?.id;
      if (!postId) return;
      
      try {
        // 使用postBehavior中的_getPostStatus获取最新状态
        const res = await this._getPostStatus(postId);
        
        if (res && res.code === 200 && res.data) {
          // 更新帖子状态
          const statusData = res.data[postId] || {};
          
          // 准备更新的数据对象，只包含有效值
          const updateData = {};
          
          // 直接使用后端返回的值和字段名，但要检查是否为 undefined
          if (statusData.is_liked !== undefined) {
            updateData['post.is_liked'] = statusData.is_liked;
          }
          
          if (statusData.like_count !== undefined) {
            updateData['post.like_count'] = statusData.like_count;
          }
          
          if (statusData.is_favorited !== undefined) {
            updateData['post.is_favorited'] = statusData.is_favorited;
          }
          
          if (statusData.favorite_count !== undefined) {
            updateData['post.favorite_count'] = statusData.favorite_count;
          }
          
          if (statusData.is_following !== undefined) {
            updateData['post.is_following'] = statusData.is_following;
          }
          
          // 只有在有数据需要更新时才调用 setData
          if (Object.keys(updateData).length > 0) {
            this.setData(updateData, () => {
              // 更新UI状态标志 - 精简后只需要调用一次
              this._updatePostData();
            });
          }
        }
      } catch (err) {
        // 忽略错误
      }
    },
    
    // 检查内容是否超出，基于长度判断是否需要显示展开按钮
    checkContentOverflow() {
      // 详情页始终展开
      if (this.properties.detailPage) {
        this.setData({ contentExpanded: true, contentOverflow: false });
        return;
      }
      
      const content = this.data.post?.content;
      if (!content || content.trim() === '') {
        this.setData({ contentOverflow: false });
        return;
      }
      
      // 判断纯文本长度，超过50个字符就显示展开按钮
      // 这个阈值设置较小，因为我们希望在首页预览时内容固定高度
      const textLength = content.trim().length;
      
      // 默认阈值
      const threshold = 50; 
      
      // 内容超出判断标准
      let isLongContent = textLength > threshold;
      
      // 对于Markdown内容有特殊处理
      if (this.data.isMarkdown) {
        // 如果包含标题、列表、代码块等结构化内容，视为长内容
        const hasMultipleHeaders = (content.match(/#{1,6}\s/g) || []).length > 0;
        const hasList = content.includes('- ') || content.includes('* ') || content.includes('1. ');
        const hasCodeBlock = content.includes('```');
        
        isLongContent = isLongContent || hasMultipleHeaders || hasList || hasCodeBlock;
      }
      
      // 对于非常短的内容，不显示展开按钮
      if (textLength < 20) {
        isLongContent = false;
      }
      
      this.setData({ contentOverflow: isLongContent });
    },
    
    // 展开/收起内容
    _onExpandTap() {
      this.setData({ contentExpanded: !this.data.contentExpanded });
    },
    
    // 点击头像或作者
    _onAvatarTap() {
      const openid = this.data.post?.openid;
      if (openid) {
        wx.navigateTo({ url: `/pages/profile/profile?openid=${openid}` });
      }
    },
    
    // 点击作者
    _onAuthorTap() {
      this._onAvatarTap();
    },
    
    // 点击帖子
    _onPostTap() {
      const postId = this.data.post?.id;
      if (postId) {
        wx.navigateTo({ url: `/pages/post/detail/detail?id=${postId}` });
      }
    },
    
    // 点击图片
    _onImageTap(e) {
      const { index } = e.currentTarget.dataset;
      const urls = this.data.post?.images || [];
      wx.previewImage({ current: urls[index], urls });
    },
    
    // 点击标签
    _onTagTap(e) {
      const tag = e.currentTarget.dataset.tag;
      wx.navigateTo({ url: `/pages/search/search?keyword=${encodeURIComponent(tag)}` });
    },
    
    // 点赞
    _onLikeTap() {
      if (this.data.isProcessing) return;
      
      const postId = this.data.post?.id;
      if (!postId) return;
      
      // 检查用户登录状态
      const openid = this.getStorage('openid');
      if (!openid) {
        this.showToast('请先登录', 'error');
        return;
      }
      
      // 设置处理中状态，避免重复点击
      this.setData({ isProcessing: true });
      
      // 预先更新UI状态，提供即时反馈
      const new_is_liked = !this.data.is_liked;
      const newLikeCount = this.data.post.like_count + (new_is_liked ? 1 : -1);
      
      this.setData({
        is_liked: new_is_liked,
        'post.is_liked': new_is_liked,
        'post.like_count': newLikeCount >= 0 ? newLikeCount : 0
      });
      
      // 调用API发送请求
      this._likePost(postId)
        .then(res => {
          if (res && res.code === 200) {
            // 触发事件通知父组件刷新数据
            this.triggerEvent('like', {
              id: postId,
              refreshNeeded: true
            });
            
            // 如果在详情页则完整刷新状态
            if (this.properties.detailPage) {
              this._updateFromServer();
            }
          } else {
            // 操作失败，恢复原状态
            this.setData({
              is_liked: !new_is_liked,
              'post.is_liked': !new_is_liked,
              'post.like_count': this.data.post.like_count + (!new_is_liked ? 1 : -1)
            });
            this.showToast('操作失败', 'error');
          }
        })
        .catch(err => {
          console.debug('点赞请求失败', err);
          // 恢复原状态
          this.setData({
            is_liked: !new_is_liked,
            'post.is_liked': !new_is_liked,
            'post.like_count': this.data.post.like_count + (!new_is_liked ? 1 : -1)
          });
          this.showToast('网络异常', 'error');
        })
        .finally(() => {
          this.setData({ isProcessing: false });
        });
    },
    
    // 收藏
    _onFavoriteTap() {
      if (this.data.isProcessing) return;
      
      const postId = this.data.post?.id;
      if (!postId) return;
      
      // 检查用户登录状态
      const openid = this.getStorage('openid');
      if (!openid) {
        this.showToast('请先登录', 'error');
        return;
      }
      
      // 设置处理中状态，避免重复点击
      this.setData({ isProcessing: true });
      
      // 预先更新UI状态，提供即时反馈
      const new_is_favorited = !this.data.is_favorited;
      const newFavoriteCount = this.data.post.favorite_count + (new_is_favorited ? 1 : -1);
      
      this.setData({
        is_favorited: new_is_favorited,
        'post.is_favorited': new_is_favorited,
        'post.favorite_count': newFavoriteCount >= 0 ? newFavoriteCount : 0
      });
      
      // 调用API发送请求
      this._favoritePost(postId)
        .then(res => {
          if (res && res.code === 200) {
            // 触发事件通知父组件刷新数据
            this.triggerEvent('favorite', {
              id: postId,
              refreshNeeded: true
            });
            
            // 如果在详情页则完整刷新状态
            if (this.properties.detailPage) {
              this._updateFromServer();
            }
          } else {
            // 操作失败，恢复原状态
            this.setData({
              is_favorited: !new_is_favorited,
              'post.is_favorited': !new_is_favorited,
              'post.favorite_count': this.data.post.favorite_count + (!new_is_favorited ? 1 : -1)
            });
            this.showToast('操作失败', 'error');
          }
        })
        .catch(err => {
          console.debug('收藏请求失败', err);
          // 恢复原状态
          this.setData({
            is_favorited: !new_is_favorited,
            'post.is_favorited': !new_is_favorited,
            'post.favorite_count': this.data.post.favorite_count + (!new_is_favorited ? 1 : -1)
          });
          this.showToast('网络异常', 'error');
        })
        .finally(() => {
          this.setData({ isProcessing: false });
        });
    },
    
    // 评论
    _onCommentTap() {
      const postId = this.data.post?.id;
      if (postId) {
        wx.navigateTo({ url: `/pages/post/detail/detail?id=${postId}&focus=comment` });
      }
    },
    
    // 关注
    _onFollowTap() {
      if (this.data.isProcessing) return;
      
      const post = this.data.post;
      if (!post?.openid) return;
      
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
      
      // 设置处理中状态，避免重复点击
      this.setData({ isProcessing: true });
      
      // 预先更新UI状态，提供即时反馈
      const new_is_following = !this.data.is_following;
      
      this.setData({
        is_following: new_is_following,
        'post.is_following': new_is_following
      });
      
      // 调用API发送请求
      this._toggleFollow(post.openid)
        .then(res => {
          if (res?.success) {
            // 只在详情页面由post-item自己刷新状态
            if (this.properties.detailPage) {
              this._updateFromServer();
            }
            this.showToast(res.is_following ? '关注成功' : '已取消关注', 'success');
            
            // 触发事件通知父组件刷新数据
            this.triggerEvent('follow', {
              id: post.id,
              authorId: post.openid,
              is_following: new_is_following
            });
          } else {
            // 操作失败，恢复原状态
            this.setData({
              is_following: !new_is_following,
              'post.is_following': !new_is_following
            });
            this.showToast('操作失败', 'error');
          }
        })
        .catch(err => {
          // 恢复原状态
          this.setData({
            is_following: !new_is_following,
            'post.is_following': !new_is_following
          });
          this.showToast('网络异常', 'error');
        })
        .finally(() => {
          this.setData({ isProcessing: false });
        });
    },
    
    // 查看更多评论
    _onViewMoreComments() {
      const postId = this.data.post?.id;
      if (postId) {
        wx.navigateTo({ url: `/pages/post/detail/detail?id=${postId}&tab=comment` });
      }
    },
    
    // 分享
    _onShareTap() {
      // 在这里可以添加分享成功后的处理逻辑
      const postId = this.data.post?.id;
      if (postId) {
        // 如果需要记录分享事件，可以在这里处理
        console.debug('分享按钮点击');
      }
    }
  }
}); 