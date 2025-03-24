const app = getApp()
const util = require('../../../utils/util');

Page({
  data: {
    post: null,
    commentText: '',
    commentImages: [],
    loading: true,
    errorMsg: '',
    isLiking: false,
    isSubmitting: false,
    comments: [],
    defaultTimeText: '刚刚发布',
    showExpandedEditor: false,
    showCommentInput: false,
    isCommentExpanded: false,
    isFavoriting: false
  },

  onLoad(options) {
    console.log('详情页参数：', options);
    
    try {
      // 增强ID验证
      if (!options) {
        throw new Error('加载选项为空');
      }
      
      // 判断是否有有效的帖子ID
      if (options.id) {
        // 去除可能的空格和引号
        const postId = options.id.toString().trim().replace(/['"]/g, '');
        console.log('处理后的帖子ID:', postId);
        
        if (!postId) {
          throw new Error('帖子ID无效');
        }
        
        // 保存帖子ID
        this.postId = postId;
        
        // 加载帖子详情
        this.loadPostDetail(postId);
        
      } else {
        throw new Error('缺少ID参数');
      }
      
      this.setData({
        isCommentExpanded: false,
        isFavoriting: false
      });
    } catch (error) {
      console.error('初始化详情页失败:', error);
      this.setData({ 
        loading: false,
        errorMsg: '无法加载帖子：' + error.message
      });
      
      wx.showToast({
        title: '参数错误：' + error.message,
        icon: 'none'
      });
      
      // 短暂延迟后返回
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 1500);
    }
  },

  onShow() {
    // 检查是否有全局数据更新
    this.checkGlobalUpdates();
  },
  
  // 检查全局数据更新
  checkGlobalUpdates() {
    if (!this.postId) return;
    
    const app = getApp();
    const postUpdate = app.getPostLatestData(this.postId);
    
    if (postUpdate) {
      console.debug('检测到帖子数据更新:', postUpdate);
      this.updatePostWithLatestData(postUpdate);
    }
  },
  
  // 使用最新数据更新帖子
  updatePostWithLatestData(update) {
    if (!update || !this.data.post) return;
    
    // 创建要更新的数据对象
    const updateData = {};
    
    // 更新点赞状态和数量
    if (update.hasOwnProperty('isLiked')) {
      updateData['post.isLiked'] = update.isLiked;
    }
    if (update.hasOwnProperty('likes')) {
      updateData['post.likes'] = update.likes;
    }
    
    // 更新收藏状态和数量
    if (update.hasOwnProperty('isFavorited')) {
      updateData['post.isFavorited'] = update.isFavorited;
    }
    if (update.hasOwnProperty('favorite_count')) {
      updateData['post.favorite_count'] = update.favorite_count;
    }
    
    // 更新评论数量
    if (update.hasOwnProperty('comment_count')) {
      updateData['post.comment_count'] = update.comment_count;
    }
    
    // 如果有更新，则更新页面数据
    if (Object.keys(updateData).length > 0) {
      console.debug('更新帖子详情数据:', updateData);
      this.setData(updateData);
    }
  },
  
  // 接收全局数据更新通知
  onPostsDataUpdate(updates) {
    if (!this.postId || !updates || !updates[this.postId]) return;
    
    console.debug('收到帖子数据更新通知');
    this.updatePostWithLatestData(updates[this.postId]);
  },

  // 强化加载帖子详情函数
  async loadPostDetail(postId) {
    console.log("开始加载帖子详情，ID:", postId);
    
    // 增强ID验证
    if (!postId) {
      this.setData({
        loading: false,
        errorMsg: '无效的帖子ID: 参数为空'
      });
      this.showError('无法加载帖子: 缩请ID参数');
      return;
    }
    
    // 检查ID类型
    if (typeof postId === 'object') {
      const errMsg = '无效的帖子ID: 对象类型';
      console.error(errMsg, postId);
      this.setData({
        loading: false,
        errorMsg: errMsg
      });
      this.showError('帖子数据格式错误');
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      // 使用API接口获取帖子详情
      const { postAPI, logger } = require('../../../utils/api/index');
      logger.debug('调用API获取帖子详情，ID:', postId);
      const result = await postAPI.getPostDetail(postId);
      
      // 处理标准API响应格式
      if (!result || (result.code !== 200 && !result.data && !result._id)) {
        throw new Error(result?.message || '帖子不存在或已被删除');
      }
      
      logger.debug("获取到的原始帖子数据:", JSON.stringify(result).substring(0, 200) + '...');
      
      // 处理多种可能的返回格式
      let post;
      if (result.code === 200 && result.data) {
        // 标准API响应
        post = result.data;
      } else if (result._id || result.id) {
        // 旧格式直接返回帖子对象
        post = result;
      } else {
        throw new Error('未知的响应格式');
      }
      
      // 确保帖子有ID字段
      if (!post._id && post.id) {
        post._id = post.id;
      } else if (!post.id && post._id) {
        post.id = post._id;
      } else if (!post._id && !post.id) {
        post._id = post.id = postId; // 使用请求参数作为ID
      }
      
      // 处理相对时间
      if (post.create_time) {
        post.relativeTime = util.formatRelativeTime(post.create_time);
      } else if (post.createTime) {
        post.relativeTime = util.formatRelativeTime(post.createTime);
      } else {
        post.relativeTime = '未知时间';
      }
      
      // 获取用户信息
      const userManager = require('../../../utils/user_manager');
      const userInfo = userManager.getCurrentUser();
      const userId = userInfo?.id || '';
      const userOpenId = userInfo?.openid || '';
      
      if (userInfo) {
        logger.debug("当前用户信息:", userInfo.nickname, userId, userOpenId);
      }
      
      // 获取本地存储的点赞收藏状态
      const likedPosts = wx.getStorageSync('likedPosts') || {};
      const favoritePosts = wx.getStorageSync('favoritePosts') || {};
      
      // 综合判断点赞状态 - 适配多种API响应格式
      post.isLiked = false; // 默认未点赞
      
      if (post.is_liked !== undefined) {
        // 新API格式直接返回是否点赞
        post.isLiked = !!post.is_liked;
      } else if (post.liked_by_me !== undefined) {
        // 兼容格式
        post.isLiked = !!post.liked_by_me;
      } else if (post.liked_users && Array.isArray(post.liked_users) && userOpenId) {
        // 旧格式
        post.isLiked = post.liked_users.includes(userOpenId);
      } else if (post.likedUsers && Array.isArray(post.likedUsers) && userOpenId) {
        // 旧格式
        post.isLiked = post.likedUsers.includes(userOpenId);
      } else if (likedPosts[post.id || post._id]) {
        // 本地缓存
        post.isLiked = true;
      }
      
      // 统一点赞数量字段
      if (post.likes === undefined) {
        post.likes = post.likes_count || post.like_count || 0;
      }
      
      // 添加收藏状态判断 - 适配多种API响应格式
      post.isFavorited = false; // 默认未收藏
      
      if (post.is_favorited !== undefined) {
        // 新API格式直接返回是否收藏
        post.isFavorited = !!post.is_favorited;
      } else if (post.favorited_by_me !== undefined) {
        // 兼容格式
        post.isFavorited = !!post.favorited_by_me;
      } else if (post.favorite_users && Array.isArray(post.favorite_users) && userOpenId) {
        // 旧格式
        post.isFavorited = post.favorite_users.includes(userOpenId);
      } else if (post.favoriteUsers && Array.isArray(post.favoriteUsers) && userOpenId) {
        // 旧格式
        post.isFavorited = post.favoriteUsers.includes(userOpenId);
      } else if (favoritePosts[post.id || post._id]) {
        // 本地缓存
        post.isFavorited = true;
      }
      
      // 统一收藏数量字段
      if (post.favorite_count === undefined) {
        post.favorite_count = post.favorites_count || post.favorites || 0;
      }
      
      // 统一评论数量字段
      if (post.comment_count === undefined) {
        post.comment_count = post.comments_count || (post.comments ? post.comments.length : 0);
      }
      
      // 处理图片数组，确保微信云存储图片可以正确显示
      if (post.images && Array.isArray(post.images)) {
        // 检查是否有云存储图片
        const cloudImages = post.images.filter(url => typeof url === 'string' && url.startsWith('cloud://'));
        
        if (cloudImages.length > 0) {
          // 异步获取临时链接
          this.getCloudFileUrls(cloudImages);
        }
      } else if (post.images && typeof post.images === 'string') {
        // 如果images是字符串，尝试解析JSON
        try {
          const parsedImages = JSON.parse(post.images);
          if (Array.isArray(parsedImages)) {
            post.images = parsedImages;
            
            // 检查是否有云存储图片
            const cloudImages = post.images.filter(url => typeof url === 'string' && url.startsWith('cloud://'));
            if (cloudImages.length > 0) {
              this.getCloudFileUrls(cloudImages);
            }
          } else {
            post.images = [];
          }
        } catch (e) {
          // 如果解析失败，假设它是单个URL
          const imageUrl = post.images;
          post.images = [imageUrl];
          
          // 检查是否是云存储图片
          if (imageUrl.startsWith('cloud://')) {
            this.getCloudFileUrls([imageUrl]);
          }
        }
      } else if (!post.images) {
        post.images = [];
      }
      
      // 加载评论
      let comments = [];
      
      try {
        // 尝试加载评论
        const { commentAPI } = require('../../../utils/api/index');
        const commentsResult = await commentAPI.getComments(post.id || post._id);
        
        if (commentsResult && commentsResult.code === 200 && Array.isArray(commentsResult.data)) {
          // 新API格式
          comments = commentsResult.data;
        } else if (commentsResult && Array.isArray(commentsResult)) {
          // 旧API格式
          comments = commentsResult;
        } else if (commentsResult && commentsResult.data && Array.isArray(commentsResult.data)) {
          // 兼容格式
          comments = commentsResult.data;
        } else if (post.comments && Array.isArray(post.comments)) {
          // 使用帖子中已有的评论
          comments = post.comments;
        }
        
        logger.debug("加载评论结果:", comments.length, "条");
      } catch (commentErr) {
        logger.error("加载评论失败:", commentErr);
        // 评论加载失败不影响帖子显示
      }
      
      // 更新界面
      this.setData({
        post: post,
        comments: comments,
        commentCount: comments.length,
        loading: false
      });
      
      logger.debug("帖子详情已加载完成");
    } catch (err) {
      console.error("加载帖子详情失败:", err);
      this.setData({
        loading: false,
        errorMsg: '加载帖子失败: ' + (err.message || err)
      });
      
      this.showError('加载帖子失败，请稍后再试');
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

  // 处理点赞，增加安全检查
  async handleLike() {
    const { postAPI, logger, userManager } = require('../../../utils/api/index');
    
    // 获取帖子ID
    const postId = this.data.post?.id || this.data.post?._id;
    if (!postId) {
      logger.warn('点赞失败：帖子ID不存在');
      return;
    }
    
    // 检查用户登录状态
    if (!userManager.isLoggedIn()) {
      logger.debug('用户未登录，跳转到登录页');
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 添加重复点击保护
    if (this.data.isLiking) return;
    this.setData({ isLiking: true });
    
    try {
      // 立即更新UI，给用户即时反馈
      const newIsLiked = !this.data.post.isLiked;
      const newLikes = this.data.post.likes + (newIsLiked ? 1 : -1);
      
      this.setData({
        'post.isLiked': newIsLiked,
        'post.likes': newLikes >= 0 ? newLikes : 0
      });
      
      // 立即更新本地存储的点赞状态 - 确保刷新页面后依然记住
      const likedPosts = wx.getStorageSync('likedPosts') || {};
      
      if (newIsLiked) {
        likedPosts[postId] = true;
      } else {
        delete likedPosts[postId];
      }
      
      wx.setStorageSync('likedPosts', likedPosts);
      logger.debug("更新本地点赞状态:", newIsLiked ? "已点赞" : "取消点赞", postId);
      
      // 调用API
      const result = await postAPI.likePost(postId, newIsLiked);
      
      // 处理API响应
      if (!result || (result.code !== 200 && result.error)) {
        // 操作失败，回滚UI状态
        this.setData({
          'post.isLiked': !newIsLiked,
          'post.likes': this.data.post.likes + (newIsLiked ? -1 : 1)
        });
        
        // 回滚本地存储
        if (!newIsLiked) {
          likedPosts[postId] = true;
        } else {
          delete likedPosts[postId];
        }
        wx.setStorageSync('likedPosts', likedPosts);
        
        // 抛出错误
        throw new Error(result?.message || result?.error || '操作失败');
      }
      
      // 如果服务器返回最新点赞数，使用服务器返回的数据更新UI
      if (result.data && result.data.likes_count !== undefined) {
        // 新API格式
        this.setData({
          'post.likes': result.data.likes_count
        });
      } else if (result.likes !== undefined) {
        // 旧API格式
        this.setData({
          'post.likes': result.likes
        });
      }
      
      // 成功时显示轻量级提示
      wx.showToast({
        title: newIsLiked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1000
      });
      
      // 更新全局状态，确保列表页状态一致
      const app = getApp();
      app.updatePostStatus(postId, {
        isLiked: newIsLiked,
        likes: this.data.post.likes
      });
    } catch (err) {
      logger.error('点赞操作失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLiking: false });
    }
  },

  // 处理收藏
  async handleFavorite() {
    const { postAPI, logger, userManager } = require('../../../utils/api/index');
    
    // 获取帖子ID
    const postId = this.data.post?.id || this.data.post?._id;
    if (!postId) {
      logger.warn('收藏失败：帖子ID不存在');
      return;
    }
    
    // 检查用户登录状态
    if (!userManager.isLoggedIn()) {
      logger.debug('用户未登录，跳转到登录页');
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 添加重复点击保护
    if (this.data.isFavoriting) return;
    this.setData({ isFavoriting: true });
    
    try {
      // 立即更新UI，给用户即时反馈
      const newIsFavorited = !this.data.post.isFavorited;
      
      this.setData({
        'post.isFavorited': newIsFavorited
      });
      
      // 更新本地收藏状态
      const favoritePosts = wx.getStorageSync('favoritePosts') || {};
      
      if (newIsFavorited) {
        favoritePosts[postId] = true;
      } else {
        delete favoritePosts[postId];
      }
      
      wx.setStorageSync('favoritePosts', favoritePosts);
      logger.debug("更新本地收藏状态:", newIsFavorited ? "已收藏" : "取消收藏", postId);
      
      // 调用API
      const result = await postAPI.favoritePost(postId, newIsFavorited);
      
      // 处理API响应
      if (!result || (result.code !== 200 && result.error)) {
        // 操作失败，回滚UI状态
        this.setData({
          'post.isFavorited': !newIsFavorited
        });
        
        // 回滚本地存储
        if (!newIsFavorited) {
          favoritePosts[postId] = true;
        } else {
          delete favoritePosts[postId];
        }
        wx.setStorageSync('favoritePosts', favoritePosts);
        
        // 抛出错误
        throw new Error(result?.message || result?.error || '操作失败');
      }
      
      // 如果服务器返回最新收藏数，使用服务器返回的数据更新UI
      if (result.data && result.data.favorites_count !== undefined) {
        // 新API格式
        this.setData({
          'post.favorite_count': result.data.favorites_count
        });
      } else if (result.favorite_count !== undefined) {
        // 旧API格式
        this.setData({
          'post.favorite_count': result.favorite_count
        });
      }
      
      // 成功时显示轻量级提示
      wx.showToast({
        title: newIsFavorited ? '已收藏' : '已取消收藏',
        icon: 'none',
        duration: 1000
      });
      
      // 更新全局状态，确保列表页状态一致
      const app = getApp();
      app.updatePostStatus(postId, {
        isFavorited: newIsFavorited,
        favorite_count: this.data.post.favorite_count
      });
    } catch (err) {
      logger.error('收藏操作失败:', err);
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
      count: 9 - (this.data.commentImages ? this.data.commentImages.length : 0),
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 构建标准格式的图片对象数组
        const newImages = res.tempFilePaths.map(path => ({
          tempUrl: path,     // 用于预览显示
          tempFilePath: path // 用于上传的完整路径
        }));
        
        // 合并现有图片
        const updatedImages = [...(this.data.commentImages || []), ...newImages];
        
        this.setData({
          commentImages: updatedImages
        });
      }
    });
  },
  
  // 移除已选择的评论图片
  removeCommentImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.commentImages;
    images.splice(index, 1);
    this.setData({
      commentImages: images
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
    const content = this.data.commentText.trim();
    const postId = this.data.post.id || this.data.post._id;
    
    // 验证帖子ID
    if (!postId) {
      wx.showToast({
        title: '帖子ID不存在',
        icon: 'none'
      });
      return;
    }
    
    // 验证内容
    if (!content) {
      wx.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 检查用户是否登录
    const userManager = require('../../../utils/user_manager');
    if (!userManager.isLoggedIn()) {
      wx.showToast({
        title: '请先登录后再评论',
        icon: 'none'
      });
      
      // 跳转到登录页面
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    
    // 获取用户信息
    const userInfo = userManager.getUserInfoForAPI();
    if (!userInfo || !userInfo.openid) {
      wx.showToast({
        title: '用户信息不完整，请重新登录',
        icon: 'none'
      });
      return;
    }
    
    // 显示提交中...
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });
    
    try {
      // 上传图片（如果有）
      let uploadedImageUrls = [];
      if (this.data.commentImages && this.data.commentImages.length > 0) {
        for (const image of this.data.commentImages) {
          const fileID = await this.uploadImage(image);
          if (fileID) {
            uploadedImageUrls.push(fileID);
          }
        }
      }
      
      const params = {
        post_id: postId,
        content: content,
        images: uploadedImageUrls || [],
        openid: userInfo.openid,
        nick_name: userInfo.nick_name,
        avatar: userInfo.avatar
      };
      
      // 如果是回复评论，添加parent_id
      if (this.data.replyToComment) {
        params.parent_id = this.data.replyToComment.id;
      }
      
      // 使用新的API接口提交评论
      const { commentAPI } = require('../../../utils/api/index');
      
      console.debug('提交评论数据:', params);
      
      // 使用新API提交评论
      const result = await commentAPI.addComment(params);
      
      console.log('评论提交结果:', result);
      
      if (result && !result.error) {
        // 清空评论框
        this.setData({
          commentText: '',
          commentImages: [],
          replyToComment: null,
          isCommentExpanded: false // 收起评论框
        });
        
        // 刷新评论列表
        this.loadComments(postId);
        
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        });
      } else {
        throw new Error(result?.error || '评论失败');
      }
    } catch (err) {
      console.error('评论提交出错:', err);
      wx.showToast({
        title: '评论失败: ' + (err.message || '未知错误'),
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
    }
  },
  
  // 添加上传图片辅助函数
  async uploadImage(tempFilePath) {
    if (!tempFilePath) return '';
    
    try {
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const cloudPath = `comment_images/${timestamp}_${randomStr}.jpg`;
      
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });
      
      console.log('图片上传成功:', uploadResult);
      return uploadResult.fileID;
    } catch (err) {
      console.error('图片上传失败:', err);
      throw err;
    }
  },
  
  // 获取用户信息
  async getUserInfo() {
    try {
      // 使用用户管理器获取用户信息
      const userManager = require('../../../utils/user_manager');
      return userManager.getUserInfoForAPI();
    } catch (err) {
      console.error('获取用户信息失败:', err);
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

  // 添加单独加载评论的方法
  async loadComments(postId) {
    const { commentAPI, logger } = require('../../../utils/api/index');
    
    logger.debug("加载帖子评论:", postId);
    
    if (!postId) {
      logger.error("加载评论失败: 帖子ID不存在");
      return;
    }
    
    try {
      // 使用API接口获取评论
      const result = await commentAPI.getComments(postId);
      
      // 处理多种可能的响应格式
      let comments = [];
      
      if (result && result.code === 200 && Array.isArray(result.data)) {
        // 标准API响应
        comments = result.data;
      } else if (result && Array.isArray(result)) {
        // 旧格式直接返回评论数组
        comments = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        // 兼容格式
        comments = result.data;
      }
      
      // 更新UI
      this.setData({
        comments: comments,
        commentCount: comments.length
      });
      
      logger.debug("评论加载成功, 共", comments.length, "条");
      return comments;
    } catch (err) {
      logger.error("加载评论失败:", err);
      return [];
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
      commentImages: []
    });
  },

  // 隐藏评论输入框
  hideCommentInput() {
    this.setData({
      showCommentInput: false,
      commentText: '',
      commentImages: []
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
      isCommentExpanded: false
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

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    this.setData({
      isCommentDialogShow: false
    });
  },

  /**
   * 获取云存储文件的临时访问链接
   * @param {Array} cloudFileIDs 云文件ID数组
   */
  getCloudFileUrls: function (cloudFileIDs) {
    if (!cloudFileIDs || cloudFileIDs.length === 0) {
      return;
    }
    console.debug(`正在处理${cloudFileIDs.length}个云存储图片`);

    // 检查云服务是否已初始化
    if (!wx.cloud) {
      console.error('云函数未初始化');
      return;
    }

    wx.cloud.getTempFileURL({
      fileList: cloudFileIDs,
      success: res => {
        if (res.fileList && res.fileList.length > 0) {
          // 创建一个映射用于快速查找
          const fileMap = {};
          res.fileList.forEach(file => {
            if (file.tempFileURL) {
              fileMap[file.fileID] = file.tempFileURL;
            }
          });

          // 更新post中的images
          let post = this.data.post;
          let hasChanges = false;

          if (post && post.images) {
            for (let i = 0; i < post.images.length; i++) {
              const imgUrl = post.images[i];
              if (typeof imgUrl === 'string' && fileMap[imgUrl]) {
                post.images[i] = fileMap[imgUrl];
                hasChanges = true;
              }
            }

            if (hasChanges) {
              this.setData({
                post: post
              });
            }
          }
        }
      },
      fail: err => {
        console.error('获取云存储临时链接失败', err);
      }
    });
  },

  /**
   * 用户点击右上角分享
   */
}) 