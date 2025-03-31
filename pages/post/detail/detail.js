const app = getApp()
const {
  formatTime,
  formatRelativeTime,
  getStorage,
  setStorage,
  removeStorage,
  processCloudUrl,
  processPostData,
  getOpenID
} = require('../../../utils/util');
// 引入API模块
const api = require('../../../utils/api/index');

Page({
  data: {
    post: {},
    postId: null,
    loading: true,
    comment: [],
    commentLoading: false,
    commentPage: 1,
    commentPageSize: 20,
    commentHasMore: false,
    commentTotal: 0,
    showCommentInput: false,
    isCommentExpanded: false,
    commentText: '',
    commentImage: [],
    commentCount: 0,
    replyToCommentId: null, // 要回复的评论ID
    commentPlaceholder: '写下你的评论(不超过200字)...', // 评论输入框占位文本
    errorMsg: '',
    isLiking: false,
    isSubmitting: false,
    defaultTimeText: '刚刚发布',
    showExpandedEditor: false,
    isFavoriting: false
  },

  onLoad: function (options) {
    console.log('帖子详情页参数:', options);
    
    // 获取帖子ID
    const postId = options.id;
    if (!postId) {
      this.setData({ 
        loading: false,
        errorMsg: '未提供帖子ID'
      });
      wx.showToast({
        title: '跳转详情页失败：未提供帖子ID',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    this.setData({ postId: postId });
    
    // 加载帖子详情
    this.loadPostDetail(postId);
    
    // 加载评论列表
    this.loadComments(postId, true);
  },

  // 强化加载帖子详情函数
  async loadPostDetail(postId) {
    console.debug("开始加载帖子详情，ID:", postId);
    
    this.setData({ loading: true });
    
    try {
      const result = await api.post.getPostDetail(postId);
      
      // 修改判断条件，使用result.code检查，200表示成功
      if (!result || result.code !== 200) {
        throw new Error(result?.message || '获取帖子详情失败');
      }
      
      const post = processPostData(result.data);
      console.debug("获取到的帖子数据:", post);
      
      if (!post) {
        throw new Error('帖子不存在');
      }
      
      // 处理相对时间
      post.relativeTime = formatRelativeTime(post.create_time);
      
      // 处理兼容字段
      post._id = post.id;
      post.createTime = post.create_time;
      post.updateTime = post.update_time;
      post.authorId = post.openid;
      post.authorName = post.nickname || '用户';
      post.authorAvatar = post.avatar || '/assets/icons/default-avatar.png';
      post.likes = post.like_count || 0;
      post.commentCount = post.comment_count || 0;
      post.favoriteCounts = post.favorite_count || 0;
      
      // 处理点赞和收藏状态
      const OPENID = getStorage('openid') || '';
      post.isLiked = post.liked || false;
      post.isFavorited = post.favorited || false;
      
      this.setData({
        post: post,
        loading: false
      });
      
      // 更新标题
      wx.setNavigationBarTitle({
        title: post.title || '帖子详情'
      });
    } catch (err) {
      console.debug("加载帖子详情失败:", err);
      this.setData({
        loading: false,
        loadError: true,
        errorMsg: err.message || '加载失败'
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示错误信息
  showError(message) {
    this.setData({ 
      loading: false,
      errorMsg: message
    })
    
    wx.showToast({
      title: message || '加载失败',
      icon: 'none'
    })
    
    // 严重错误时返回上一页
    if (message && (
      message.includes('不存在') || 
      message.includes('已删除') || 
      message.includes('参数错误')
    )) {
      setTimeout(() => {
        wx.navigateBack({ delta: 1 })
      }, 1500)
    }
  },

  // 检查登录状态
  async checkLogin() {
    const openid = await getOpenID();
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return false;
    }
    return true;
  },

  // 处理点赞，增加安全检查
  async handleLike() {
    if (!this.data.post || !this.data.post._id) {
      return;
    }
    
    // 检查登录状态
    if (!await this.checkLogin()) {
      return;
    }
    
    if (this.data.isLiking) return;
    this.setData({ isLiking: true });
    
    try {
      const newIsLiked = !this.data.post.isLiked;
      const newLikes = this.data.post.likes + (newIsLiked ? 1 : -1);
      
      this.setData({
        'post.isLiked': newIsLiked,
        'post.likes': newLikes,
        'post.like_count': newLikes
      });
      
      let result;
      if (newIsLiked) {
        result = await api.post.likePost(this.data.post._id);
      } else {
        result = await api.post.unlikePost(this.data.post._id);
      }
      
      // 修改判断条件，使用result.code检查，200表示成功
      if (!result || result.code !== 200) {
        if (result && result.message && (
          result.message.includes('已经点赞') || 
          result.message.includes('未点赞')
        )) {
          console.debug('点赞状态不一致，重新获取帖子状态');
          this.checkPostStatus();
        } else if (result && result.message && (
          result.message.includes('未登录') || 
          result.message.includes('登录状态') ||
          result.message.includes('token') ||
          result.message.includes('认证')
        )) {
          // 登录状态失效，重新检查登录
          if (!await this.checkLogin()) {
            return;
          }
          
          this.setData({
            'post.isLiked': !newIsLiked,
            'post.likes': this.data.post.likes - (newIsLiked ? 1 : -1),
            'post.like_count': this.data.post.likes - (newIsLiked ? 1 : -1)
          });
        } else {
          this.setData({
            'post.isLiked': !newIsLiked,
            'post.likes': this.data.post.likes - (newIsLiked ? 1 : -1),
            'post.like_count': this.data.post.likes - (newIsLiked ? 1 : -1)
          });
          
          throw new Error(result?.message || '操作失败');
        }
      } else {
        wx.showToast({
          title: newIsLiked ? '已点赞' : '已取消',
          icon: 'none',
          duration: 1000
        });
        
        if (result.details && result.details.like_count !== undefined) {
          this.setData({
            'post.likes': result.details.like_count,
            'post.like_count': result.details.like_count
          });
        }
      }
    } catch (err) {
      console.debug('点赞操作失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLiking: false });
    }
  },
  
  // 检查帖子状态（点赞、收藏等）
  async checkPostStatus() {
    try {
      if (!this.data.post || !this.data.post._id) return;
      
      const result = await api.post.getPostStatus(this.data.post._id);
      // 修改判断条件，使用result.code检查，200表示成功
      if (result && result.code === 200 && result.data) {
        this.setData({
          'post.isLiked': result.data.is_liked,
          'post.likes': result.data.like_count,
          'post.isFavorited': result.data.is_favorited,
          'post.favoriteCounts': result.data.favorite_count
        });
        
        // 更新本地存储
        const likedPosts = getStorage('likedPosts') || {};
        const favoritePosts = getStorage('favoritePosts') || {};
        
        if (result.data.is_liked) {
          likedPosts[this.data.post._id] = true;
        } else {
          delete likedPosts[this.data.post._id];
        }
        
        if (result.data.is_favorited) {
          favoritePosts[this.data.post._id] = true;
        } else {
          delete favoritePosts[this.data.post._id];
        }
        
        setStorage('likedPosts', likedPosts);
        setStorage('favoritePosts', favoritePosts);
      }
    } catch (err) {
      console.debug('获取帖子状态失败:', err);
    }
  },

  // 处理收藏，与handleLike类似
  async handleFavorite() {
    if (!this.data.post || !this.data.post._id) {
      return;
    }
    
    // 检查登录状态
    if (!await this.checkLogin()) {
      return;
    }
    
    if (this.data.isFavoriting) return;
    this.setData({ isFavoriting: true });
    
    try {
      const newIsFavorited = !this.data.post.isFavorited;
      const newFavoriteCount = this.data.post.favoriteCounts + (newIsFavorited ? 1 : -1);
      
      this.setData({
        'post.isFavorited': newIsFavorited,
        'post.favoriteCounts': newFavoriteCount,
        'post.favorite_count': newFavoriteCount
      });
      
      let result;
      if (newIsFavorited) {
        result = await api.post.favoritePost(this.data.post._id);
      } else {
        result = await api.post.unfavoritePost(this.data.post._id);
      }
      
      // 修改判断条件，使用result.code检查，200表示成功
      if (!result || result.code !== 200) {
        if (result && result.message && (
          result.message.includes('已收藏') || 
          result.message.includes('未收藏')
        )) {
          console.debug('收藏状态不一致，重新获取帖子状态');
          this.checkPostStatus();
        } else if (result && result.message && (
          result.message.includes('未登录') || 
          result.message.includes('登录状态') ||
          result.message.includes('token') ||
          result.message.includes('认证')
        )) {
          // 登录状态失效，重新检查登录
          if (!await this.checkLogin()) {
            return;
          }
          
          this.setData({
            'post.isFavorited': !newIsFavorited,
            'post.favoriteCounts': this.data.post.favoriteCounts - (newIsFavorited ? 1 : -1),
            'post.favorite_count': this.data.post.favoriteCounts - (newIsFavorited ? 1 : -1)
          });
        } else {
          this.setData({
            'post.isFavorited': !newIsFavorited,
            'post.favoriteCounts': this.data.post.favoriteCounts - (newIsFavorited ? 1 : -1),
            'post.favorite_count': this.data.post.favoriteCounts - (newIsFavorited ? 1 : -1)
          });
          
          throw new Error(result?.message || '操作失败');
        }
      } else {
        wx.showToast({
          title: newIsFavorited ? '已收藏' : '已取消收藏',
          icon: 'none',
          duration: 1000
        });
        
        if (result.details && result.details.favorite_count !== undefined) {
          this.setData({
            'post.favoriteCounts': result.details.favorite_count,
            'post.favorite_count': result.details.favorite_count
          });
        }
      }
    } catch (err) {
      console.debug('收藏操作失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isFavoriting: false });
    }
  },

  // 图片错误处理
  onAvatarError() {
    this.setData({
      'post.authorAvatar': '/assets/icons/default-avatar.png'
    })
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) {
      this.setData({
        [`post.images[${index}]`]: '/assets/icons/image-error.png'
      })
    }
  },

  onCommentAvatarError(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) {
      this.setData({
        [`post.comments[${index}].authorAvatar`]: '/assets/icons/default-avatar.png'
      })
    }
  },
  
  // 时间格式化函数
  formatTime(dateStr) {
    if (!dateStr) return '未知时间'
    
    try {
      // 特别处理：如果dateStr已经是对象，直接格式化
      if (typeof dateStr === 'object') {
        // 如果是Date对象
        if (dateStr instanceof Date) {
          const date = dateStr;
          const now = new Date();
          const diff = now - date;
          const minutes = Math.floor(diff / 1000 / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          if (minutes < 60) return `${minutes || 1}分钟前`;
          if (hours < 24) return `${hours}小时前`;
          if (days < 30) return `${days}天前`;
          
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
        }
        // 如果是服务器日期对象(包含serverDate字段)
        else if (dateStr.$date) {
          return this.formatTime(new Date(dateStr.$date));
        }
        // 如果是其他未知对象，转为字符串
        else {
          return '时间格式错误';
        }
      }
      
      // 常规字符串处理
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return '未知时间';
      }
      
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 1000 / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 60) return `${minutes || 1}分钟前`;
      if (hours < 24) return `${hours}小时前`;
      if (days < 30) return `${days}天前`;
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
    } catch (e) {
      console.error('时间格式化错误:', e, '原始值:', dateStr);
      return '未知时间';
    }
  },
  
  // 评论相关功能
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    })
  },
  
  // 选择评论图片
  chooseCommentImage() {
    wx.chooseImage({
      count: 9 - (this.data.commentImage ? this.data.commentImage.length : 0),
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 构建标准格式的图片对象数组
        const newImage = res.tempFilePaths.map(path => ({
          tempUrl: path,     // 用于预览显示
          tempFilePath: path // 用于上传的完整路径
        }));
        
        // 合并现有图片
        const updatedImage = [...(this.data.commentImage || []), ...newImage];
        
        this.setData({
          commentImage: updatedImage
        });
      }
    });
  },
  
  // 移除已选择的评论图片
  removeCommentImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.commentImage;
    images.splice(index, 1);
    this.setData({
      commentImage: images
    });
  },
  
  // 评论图片预览
  previewCommentImage(e) {
    const current = e.currentTarget.dataset.current;
    const urls = e.currentTarget.dataset.urls;
    
    wx.previewImage({
      current,
      urls
    });
  },
  
  // 提交评论
  async submitComment() {
    if (this.data.isSubmitting) {
      return;
    }
    
    // 检查登录状态
    if (!await this.checkLogin()) {
      return;
    }
    
    const content = this.data.commentText;
    if (!content || content.trim() === '') {
      wx.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isSubmitting: true });
    
    try {
      const commentData = {
        openid: await getOpenID(),
        post_id: this.data.postId,
        content: content
      };
      
      if (this.data.replyToCommentId) {
        commentData.parent_id = this.data.replyToCommentId;
      }
      
      const userInfo = getStorage('userInfo');
      if (userInfo) {
        commentData.nickname = userInfo.nickName || userInfo.nickname;
        commentData.avatar = userInfo.avatarUrl || userInfo.avatar;
      }
      
      console.debug('提交评论数据:', commentData);
      
      const result = await api.post.createComment(commentData);
      
      console.debug('评论提交结果:', result);
      
      // 修改判断条件，使用result.code检查，200表示成功
      if (result && result.code === 200) {
        this.setData({
          commentText: '',
          commentImage: [],
          isCommentExpanded: false,
          replyToCommentId: null,
          commentPlaceholder: '写下你的评论(不超过200字)...'
        });
        
        await this.loadComments(this.data.postId, true);
        
        this.setData({
          'post.commentCount': (this.data.post.commentCount || 0) + 1,
          'post.comment_count': (this.data.post.comment_count || 0) + 1
        });
        
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        });
        
        console.debug('评论成功，已刷新评论列表');
      } else {
        if (result && result.message && (
          result.message.includes('未登录') || 
          result.message.includes('登录状态') ||
          result.message.includes('token') ||
          result.message.includes('认证')
        )) {
          // 登录状态失效，重新检查登录
          if (!await this.checkLogin()) {
            return;
          }
        } else {
          wx.showToast({
            title: result.message || '评论失败，请重试',
            icon: 'none'
          });
        }
      }
    } catch (err) {
      console.debug('提交评论失败:', err);
      wx.showToast({
        title: '提交评论失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },
  
  // 添加上传图片辅助函数(如果没有)
  async uploadImage(tempFilePath) {
    if (!tempFilePath) return '';
    
    try {
      // 使用API模块上传图片
      const result = await api.upload.uploadImage(tempFilePath);
      console.log('图片上传成功:', result);
      return result.fileID;
    } catch (err) {
      console.error('图片上传失败:', err);
      throw err;
    }
  },
  
  // 获取用户信息
  async getUserInfo() {
    try {
      const userInfo = getStorage('userInfo');
      if (userInfo) {
        return userInfo;
      }
      
      // 使用API模块获取用户信息
      const loginResult = await api.user.login();
      // 修改判断条件，使用code === 200检查成功
      if (loginResult.code === 200 && loginResult.data) {
        return loginResult.data;
      }
      
      return {};
    } catch (err) {
      console.debug('获取用户信息失败:', err);
      return {};
    }
  },
  
  // 图片预览
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    
    wx.previewImage({
      current: url, // 当前显示图片的链接
      urls: urls || [url], // 需要预览的图片链接列表
      showmenu: true, // 显示转发、保存等菜单
      success: () => {
        console.log('图片预览成功');
      },
      fail: (err) => {
        console.error('图片预览失败:', err);
      }
    });
  },
  
  // 返回上一页
  goBack() {
    console.log('点击返回按钮');
    wx.navigateBack({
      delta: 1,
      fail: () => {
        console.log('返回失败，跳转到首页');
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },

  // 加载评论列表
  async loadComments(postId, refresh = false) {
    if (this.data.commentLoading) return;
    
    try {
      this.setData({ commentLoading: true });
      
      // 分页参数
      const limit = 20;
      const offset = refresh ? 0 : (this.data.comment?.length || 0);
      
      console.debug(`加载评论，参数: postId=${postId}, limit=${limit}, offset=${offset}`);
      
      // 使用API模块获取评论列表
      const result = await api.post.getPostCommentList(postId, { limit, offset });
      
      console.debug("评论列表API返回结果:", result);
      
      // 修改判断条件，使用result.code检查，200表示成功
      if (!result || result.code !== 200) {
        throw new Error(result?.message || '获取评论失败');
      }
      
      // 处理评论数据
      const processedComments = (result.data || []).map(comment => ({
        ...comment,
        _id: comment.id,
        createTime: comment.create_time,
        relativeTime: formatRelativeTime(comment.create_time),
        reply_preview: comment.reply_preview || [],
        reply_count: comment.reply_count || 0,
        liked: comment.liked || false,
        nickname: comment.nickname || '用户',
        avatar: comment.avatar || '/assets/icons/default-avatar.png'
      }));
      
      // 更新UI
      this.setData({
        comment: refresh ? processedComments : [...(this.data.comment || []), ...processedComments],
        commentHasMore: result.pagination.has_more,
        commentLoading: false,
        commentTotal: result.pagination.total
      });
      
      console.debug(`评论列表已更新，当前共有${this.data.comment.length}条评论，总共${result.pagination.total}条`);
    } catch (err) {
      console.debug("加载评论失败:", err);
      this.setData({ 
        commentLoading: false,
        commentLoadError: true
      });
      
      wx.showToast({
        title: err.message || '加载评论失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 添加一个简单的日期格式化函数 - 避免复杂逻辑
  simpleDateFormat(date) {
    if (!date) return '未知时间';
    
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      
      return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day} ${hour < 10 ? '0' + hour : hour}:${minute < 10 ? '0' + minute : minute}`;
    } catch (e) {
      console.error('简单日期格式化错误:', e);
      return '未知时间';
    }
  },

  // 显示扩展编辑区
  showExpandedEditor() {
    this.setData({
      showExpandedEditor: true
    });
  },

  // 隐藏扩展编辑区
  hideExpandedEditor() {
    this.setData({
      showExpandedEditor: false
    });
  },

  // 确认评论内容
  confirmComment() {
    this.setData({
      showExpandedEditor: false
    });
    this.submitComment();
  },

  // 显示评论输入框
  showCommentInput() {
    this.setData({
      showCommentInput: true,
      commentText: '',
      commentImage: []
    });
  },

  // 隐藏评论输入框
  hideCommentInput() {
    this.setData({
      showCommentInput: false,
      commentText: '',
      commentImage: []
    });
  },

  // 展开评论框
  expandCommentBox() {
    this.setData({
      isCommentExpanded: true
    });
  },

  // 收起评论框
  collapseCommentBox() {
    this.setData({
      isCommentExpanded: false,
      replyToCommentId: null,
      commentPlaceholder: '写下你的评论(不超过200字)...'
    });
  },

  // 处理图片加载错误
  handleImageError(e) {
    console.error('评论图片加载失败:', e);
    // 可以替换为默认图片
    const index = e.currentTarget.dataset.index;
    const imgIndex = e.target.dataset.imgindex;
    
    // 如果需要替换为默认图片，可以使用下面的代码
    // 更新特定评论中特定图片的URL
    // const newImageUrl = '/assets/icons/image-error.png'; // 默认错误图片
    // const commentsCopy = [...this.data.comments];
    // commentsCopy[index].images[imgIndex] = newImageUrl;
    // this.setData({
    //   comments: commentsCopy
    // });
  },

  // 查看更多回复
  viewMoreReplies(e) {
    const commentId = e.currentTarget.dataset.commentId;
    if (!commentId) return;
    
    // 跳转到回复列表页面
    wx.navigateTo({
      url: `/pages/post/reply/reply?comment_id=${commentId}&post_id=${this.data.postId}`
    });
  },
  
  // 回复评论
  replyToComment(e) {
    const commentId = e.currentTarget.dataset.commentId;
    if (!commentId) return;
    
    this.setData({
      replyToCommentId: commentId,
      isCommentExpanded: true,
      commentPlaceholder: `回复评论...`
    });
  }
}) 