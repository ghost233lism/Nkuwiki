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
    console.log('详情页参数：', options)
    
    // 判断是否有有效的帖子ID
    if (options && options.id) {
      this.loadPostDetail(options.id)
    } else {
      this.setData({ 
        loading: false,
        errorMsg: '无法加载帖子：缺少ID参数'
      })
      
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      
      setTimeout(() => {
        wx.navigateBack({ delta: 1 })
      }, 1500)
    }
    
    this.setData({
      isCommentExpanded: false,
      isFavoriting: false
    });
  },

  // 强化加载帖子详情函数
  async loadPostDetail(postId) {
    console.log("开始加载帖子详情，ID:", postId);
    
    this.setData({ loading: true });
    
    try {
      const db = wx.cloud.database();
      const result = await db.collection('posts').doc(postId).get();
      
      if (!result.data) {
        throw new Error('帖子不存在');
      }
      
      const post = result.data;
      console.log("获取到的帖子数据:", post);
      
      // 查询作者最新信息 - 直接使用authorId查询用户集合
      if (post.authorId) {
        try {
          // 使用doc直接查询单个用户，更高效
          const authorResult = await db.collection('users').doc(post.authorId).get();
          
          if (authorResult.data) {
            // 更新帖子作者信息为最新
            post.authorName = authorResult.data.nickName || post.authorName;
            post.authorAvatar = authorResult.data.avatarUrl || post.authorAvatar;
            console.log("更新了帖子作者信息:", post.authorName);
          }
        } catch (err) {
          console.error("查询作者信息失败:", err);
        }
      }
      
      // 处理相对时间
      if (post.createTime) {
        post.relativeTime = util.formatRelativeTime(post.createTime);
      }
      
      // 处理评论用户信息 - 可选，如果需要更新评论作者信息
      if (post.comments && post.comments.length > 0) {
        const commentAuthorIds = [...new Set(post.comments.map(c => c.authorId))];
        if (commentAuthorIds.length > 0) {
          try {
            // 限制查询数量
            const maxCommentQuery = commentAuthorIds.slice(0, 20);
            
            // 查询评论作者信息
            const commentAuthorsResult = await db.collection('users').where({
              _id: db.command.in(maxCommentQuery)
            }).get();
            
            // 构建评论作者映射
            const commentAuthorMap = {};
            commentAuthorsResult.data.forEach(user => {
              commentAuthorMap[user._id] = user;
            });
            
            // 更新评论作者信息
            post.comments.forEach(comment => {
              const commentAuthor = commentAuthorMap[comment.authorId];
              if (commentAuthor) {
                comment.authorName = commentAuthor.nickName || comment.authorName;
                comment.authorAvatar = commentAuthor.avatarUrl || comment.authorAvatar;
              }
              
              // 处理评论时间
              if (comment.createTime) {
                comment.relativeTime = util.formatRelativeTime(comment.createTime);
              }
            });
          } catch (err) {
            console.error("查询评论作者信息失败:", err);
          }
        }
      }
      
      // 获取用户openid - 从多种可能的来源
      let userOpenId = '';
      try {
        // 1. 尝试从缓存获取
        userOpenId = wx.getStorageSync('openid');
        
        // 2. 如果没有，尝试从用户信息获取
        if (!userOpenId) {
          const userInfo = wx.getStorageSync('userInfo');
          if (userInfo && userInfo._openid) {
            userOpenId = userInfo._openid;
          }
        }
        
        // 3. 如果还没有，调用login云函数获取
        if (!userOpenId) {
          const wxContext = await wx.cloud.callFunction({
            name: 'login'
          });
          userOpenId = wxContext.result.openid || wxContext.result.data?.openid;
          // 缓存获取到的openid
          if (userOpenId) {
            wx.setStorageSync('openid', userOpenId);
          }
        }
      } catch (err) {
        console.error('获取用户openid失败:', err);
      }
      
      console.log("当前用户ID:", userOpenId);
      
      // 获取本地存储的点赞状态
      const likedPosts = wx.getStorageSync('likedPosts') || {};
      // 获取本地存储的收藏状态
      const favoritePosts = wx.getStorageSync('favoritePosts') || {};
      
      // 综合判断点赞状态 - 使用多种方式检查
      post.isLiked = false; // 默认未点赞
      
      // 方法1: 检查likedUsers数组
      if (post.likedUsers && post.likedUsers.length > 0 && userOpenId) {
        if (post.likedUsers.includes(userOpenId)) {
          post.isLiked = true;
        }
      }
      
      // 方法2: 检查本地存储
      if (!post.isLiked && likedPosts[postId]) {
        post.isLiked = true;
      }
      
      // 添加收藏状态判断
      post.isFavorited = false; // 默认未收藏
      
      // 方法1: 检查favoriteUsers数组
      if (post.favoriteUsers && post.favoriteUsers.length > 0 && userOpenId) {
        if (post.favoriteUsers.includes(userOpenId)) {
          post.isFavorited = true;
        }
      }
      
      // 方法2: 检查本地存储
      if (!post.isFavorited && favoritePosts[postId]) {
        post.isFavorited = true;
      }
      
      console.log("帖子收藏状态:", post.isFavorited, "原因:", 
                 post.isFavorited ? "用户ID在收藏列表中或本地存储标记为已收藏" : "用户未收藏");
      
      this.setData({
        post: post,
        comments: post.comments || [],
        commentCount: post.comments ? post.comments.length : 0,
        loading: false
      });
      
      console.log("帖子详情已加载:", post);
    } catch (err) {
      console.error("加载帖子详情失败:", err);
      this.setData({ loading: false });
      this.showError('加载失败，请重试');
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
    if (!this.data.post || !this.data.post._id) {
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
        'post.likes': newLikes
      });
      
      // 立即更新本地存储的点赞状态 - 确保刷新页面后依然记住
      const likedPosts = wx.getStorageSync('likedPosts') || {};
      
      if (newIsLiked) {
        likedPosts[this.data.post._id] = true;
      } else {
        delete likedPosts[this.data.post._id];
      }
      
      wx.setStorageSync('likedPosts', likedPosts);
      console.log("更新本地点赞状态:", newIsLiked ? "已点赞" : "取消点赞", this.data.post._id);
      
      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'likes',
        data: {
          type: 'toggleLike',
          postId: this.data.post._id
        }
      });
      
      if (!res.result || !res.result.success) {
        // 如果失败，回滚UI状态和本地存储
        this.setData({
          'post.isLiked': !newIsLiked,
          'post.likes': this.data.post.likes - (newIsLiked ? 1 : -1)
        });
        
        // 回滚本地存储
        if (!newIsLiked) {
          likedPosts[this.data.post._id] = true;
        } else {
          delete likedPosts[this.data.post._id];
        }
        wx.setStorageSync('likedPosts', likedPosts);
        
        throw new Error(res.result?.message || '操作失败');
      }
      
      // 成功时显示轻量级提示
      wx.showToast({
        title: newIsLiked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1000
      });
    } catch (err) {
      console.error('点赞操作失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLiking: false });
    }
  },

  // 处理收藏，与handleLike类似
  async handleFavorite() {
    if (!this.data.post || !this.data.post._id) {
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
      
      // 立即更新本地存储的收藏状态 - 确保刷新页面后依然记住
      const favoritePosts = wx.getStorageSync('favoritePosts') || {};
      
      if (newIsFavorited) {
        favoritePosts[this.data.post._id] = true;
      } else {
        delete favoritePosts[this.data.post._id];
      }
      
      wx.setStorageSync('favoritePosts', favoritePosts);
      console.log("更新本地收藏状态:", newIsFavorited ? "已收藏" : "取消收藏", this.data.post._id);
      
      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'favorite',
        data: {
          postId: this.data.post._id
        }
      });
      
      if (!res.result || !res.result.success) {
        // 如果失败，回滚UI状态和本地存储
        this.setData({
          'post.isFavorited': !newIsFavorited
        });
        
        // 回滚本地存储
        if (!newIsFavorited) {
          favoritePosts[this.data.post._id] = true;
        } else {
          delete favoritePosts[this.data.post._id];
        }
        wx.setStorageSync('favoritePosts', favoritePosts);
        
        throw new Error(res.result?.message || '操作失败');
      }
      
      // 成功时显示轻量级提示
      wx.showToast({
        title: newIsFavorited ? '已收藏' : '已取消收藏',
        icon: 'none',
        duration: 1000
      });
    } catch (err) {
      console.error('收藏操作失败:', err);
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
    const postId = this.data.post._id;
    
    // 验证帖子ID
    if (!postId) {
      wx.showToast({
        title: '帖子ID不存在',
        icon: 'none'
      });
      return;
    }
    
    // 验证内容
    if (!content && this.data.commentImages.length === 0) {
      wx.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '发送中...' });
    
    try {
      // 图片上传逻辑优化
      let uploadedImageUrls = [];
      
      if (this.data.commentImages && this.data.commentImages.length > 0) {
        const uploadTasks = this.data.commentImages.map(async (img) => {
          // 确保使用临时文件路径而非预览路径
          const filePath = img.tempFilePath || img.tempUrl;
          
          // 上传到云存储
          try {
            console.log('开始上传图片:', filePath);
            const uploadRes = await wx.cloud.uploadFile({
              cloudPath: `comments/${Date.now()}-${Math.random().toString(36).slice(-6)}.${filePath.match(/\.([^.]+)$/)[1] || 'png'}`,
              filePath: filePath
            });
            
            console.log('图片上传成功:', uploadRes.fileID);
            return uploadRes.fileID; // 返回云存储路径
          } catch (uploadErr) {
            console.error('图片上传失败:', uploadErr);
            wx.showToast({
              title: '图片上传失败',
              icon: 'none'
            });
            throw uploadErr; // 抛出错误中断评论提交
          }
        });
        
        // 等待所有图片上传完成
        uploadedImageUrls = await Promise.all(uploadTasks);
        console.log('所有图片上传完成:', uploadedImageUrls);
      }
      
      // 调用云函数添加评论
      const result = await wx.cloud.callFunction({
        name: 'addComment',
        data: {
          postId: postId,
          content: content,
          images: uploadedImageUrls // 使用云存储路径
        }
      });
      
      console.log('评论提交结果:', result);
      
      if (result.result && result.result.success) {
        // 更新本地数据
        const newComment = result.result.comment;
        
        this.setData({
          commentText: '',
          commentImages: [],
          comments: [...this.data.comments, newComment],
          commentCount: this.data.commentCount + 1,
          isCommentExpanded: false // 收起评论框
        });
        
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.result?.message || '评论失败');
      }
    } catch (err) {
      console.error('评论提交出错:', err);
      wx.showToast({
        title: '评论失败: ' + (err.message || '未知错误'),
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },
  
  // 添加上传图片辅助函数(如果没有)
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
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        return userInfo;
      }
      
      const db = wx.cloud.database();
      const userRes = await db.collection('users').where({
        _openid: wx.getStorageSync('openid')
      }).get();
      
      if (userRes.data.length > 0) {
        wx.setStorageSync('userInfo', userRes.data[0]);
        return userRes.data[0];
      }
      
      return {};
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
    console.log("加载帖子评论:", postId);
    
    try {
      // 直接从posts集合获取评论，不使用独立的comments集合
      const db = wx.cloud.database();
      const result = await db.collection('posts').doc(postId).get();
      
      if (result.data && result.data.comments) {
        this.setData({
          comments: result.data.comments,
          commentCount: result.data.comments.length
        });
        console.log("评论加载成功, 共", result.data.comments.length, "条");
      } else {
        this.setData({
          comments: [],
          commentCount: 0
        });
        console.log("该帖子没有评论");
      }
    } catch (err) {
      console.error("加载评论失败:", err);
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
  }
}) 