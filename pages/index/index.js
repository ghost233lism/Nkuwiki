// index.js
const app = getApp();
const defaultAvatarUrl = '/assets/icons/default-avatar.png'

let isLiking = false  // 添加在 Page 外部
let isFavoriting = false;  // 防止重复点击收藏按钮
let needRefresh = false;  // 标记是否需要刷新

// 在文件顶部引入工具函数和API
const util = require('../../utils/util');
const userManager = require('../../utils/user_manager');
const { postAPI, userAPI, commentAPI, logger } = require('../../utils/api/index');

// 更新带有processAvatarUrl的引用
const { processAvatarUrl } = require('../../utils/api/index');

Page({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    currentCommentPostId: null,
    currentCommentPostIndex: null,
    showCommentInput: false,
    commentText: '',
    commentImages: [],
    showExpandedEditor: false,
    searchValue: '',
    searchHistory: [],
    searchResults: [],
    currentPage: 1,
    baseUrl: app.globalData.config.services.app.base_url,
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  onLoad() {
    console.log('页面加载')
    this.loadPosts()
    this.setData({
      currentPostId: '',  // 初始化为空字符串
      currentPostIndex: -1
    })
    
    // 启动帖子数据同步任务
    if (app && typeof app.startDataSyncTask === 'function') {
      app.startDataSyncTask();
    }
  },
  onShow() {
    console.log('页面显示')
    // 检查是否需要刷新数据
    if (app.globalData.needRefreshIndexPosts) {
      this.loadPosts(true) // 参数true表示强制刷新
      app.globalData.needRefreshIndexPosts = false // 重置标志
    }
    
    // 检查是否有全局数据更新
    this.checkGlobalUpdates();
  },
  // 检查全局数据更新
  checkGlobalUpdates() {
    const app = getApp();
    const lastUpdateTime = this.lastUpdateTime || 0;
    
    // 如果全局数据已更新且本页面数据较旧，则更新本页面数据
    if (app.globalData.postUpdateTimestamp > lastUpdateTime) {
      console.debug('检测到全局数据更新，同步到本页面');
      
      // 获取更新的帖子数据
      const updates = app.globalData.postUpdates || {};
      
      // 更新页面数据
      this.updatePostsWithLatestData(updates);
      
      // 更新本页面最后更新时间
      this.lastUpdateTime = app.globalData.postUpdateTimestamp;
    }
  },
  
  // 使用最新数据更新帖子列表
  updatePostsWithLatestData(updates) {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }
    
    // 获取当前帖子列表
    const posts = this.data.posts;
    if (!posts || !posts.length) {
      return;
    }
    
    // 标记是否有更新
    let hasUpdates = false;
    
    // 遍历帖子列表，更新数据
    const updatedPosts = posts.map(post => {
      // 获取帖子ID
      const postId = post.id || post._id;
      
      // 检查是否有此帖子的更新数据
      if (postId && updates[postId]) {
        // 合并更新数据
        const update = updates[postId];
        
        // 创建新的帖子对象，避免直接修改原对象
        const updatedPost = { ...post };
        
        // 更新点赞状态和数量
        if (update.hasOwnProperty('isLiked')) {
          updatedPost.isLiked = update.isLiked;
        }
        if (update.hasOwnProperty('likes')) {
          updatedPost.likes = update.likes;
        }
        
        // 更新收藏状态和数量
        if (update.hasOwnProperty('isFavorited')) {
          updatedPost.isFavorited = update.isFavorited;
        }
        if (update.hasOwnProperty('favorite_count')) {
          updatedPost.favoriteCounts = update.favorite_count;
        }
        
        // 更新评论数量
        if (update.hasOwnProperty('comment_count')) {
          updatedPost.commentCount = update.comment_count;
        }
        
        hasUpdates = true;
        return updatedPost;
      }
      
      // 如果没有更新，返回原帖子对象
      return post;
    });
    
    // 如果有更新，则更新页面数据
    if (hasUpdates) {
      console.debug('更新帖子列表数据');
      this.setData({ posts: updatedPosts });
    }
  },
  
  // 接收全局数据更新通知
  onPostsDataUpdate(updates) {
    console.debug('收到全局数据更新通知');
    this.updatePostsWithLatestData(updates);
  },
  // 下拉刷新
  onPullDownRefresh() {
    console.log('触发下拉刷新')

    // 维持页面位置，只刷新数据
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },
  // 加载帖子列表
  loadPosts: function (reset = false) {
    if (this.data.loading && !reset) {
      return;
    }

    this.setData({
      loading: true
    });

    // 构建查询参数
    const params = {
      limit: 10,
      offset: reset ? 0 : this.data.posts.length,
      sort_by: this.data.sortBy,
      category: this.data.selectedCategory === 'all' ? '' : this.data.selectedCategory
    };

    logger.debug('加载帖子，参数：', params);

    // 使用API加载帖子
    return postAPI.getPosts(params)
      .then(res => {
        logger.debug('帖子加载成功, 原始响应:', JSON.stringify(res).substring(0, 500) + '...');
        
        let newPosts = [];
        // 处理返回数据，兼容多种格式
        if (Array.isArray(res)) {
          newPosts = res;
        } else if (res && Array.isArray(res.data)) {
          newPosts = res.data;
        } else if (res && res.posts && Array.isArray(res.posts)) {
          newPosts = res.posts;
        } else {
          logger.warn('无法解析帖子数据格式:', JSON.stringify(res));
          newPosts = [];
        }
        
        // 如果有帖子数据，记录第一条帖子的字段
        if (newPosts && newPosts.length > 0) {
          logger.debug('第一条帖子数据示例:', JSON.stringify(newPosts[0]));
        }
        
        // 处理帖子数据，统一格式化为前端展示所需的格式
        newPosts = newPosts.map(post => {
          // 确保帖子有ID字段
          if (!post._id && post.id) {
            post._id = post.id;
          } else if (!post._id && !post.id) {
            logger.warn('帖子缺少ID字段:', post);
            post._id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          
          // 格式化显示需要的其他字段
          const processedPost = {
            _id: post._id || post.id,
            id: post.id || post._id,
            title: post.title || '',
            content: post.content || '',
            displayContent: post.content 
              ? (post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content) 
              : '',
            hasMore: post.content && post.content.length > 100,
            authorName: post.nick_name || post.author_name || '南开大学用户',
            authorAvatar: post.avatar || post.author_avatar || '/assets/icons/default-avatar.png',
            images: post.images || [],
            likes: post.like_count || post.likes || 0,
            favoriteCounts: post.favorite_count || post.favoriteCounts || 0,
            commentCount: post.comment_count || post.commentCount || 0,
            relativeTime: this.formatTimeDisplay(post.create_time || post.createTime || Date.now()),
            tags: post.tags || []
          };
          
          return processedPost;
        });
        
        logger.debug('处理后第一条帖子数据:', newPosts.length > 0 ? JSON.stringify(newPosts[0]) : '无数据');
        
        // 如果是重置，直接替换帖子列表
        const posts = reset ? newPosts : [...this.data.posts, ...newPosts];
        
        this.setData({
          posts: posts,
          loading: false,
          lastPage: newPosts.length < 10,
          refreshing: false
        });
      })
      .catch(err => {
        logger.error('加载帖子失败:', err);
        
        this.setData({
          loading: false,
          refreshing: false
        });
        
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      });
  },
  
  // 处理帖子数据(保留的优化函数)
  async processPostsData(posts, refresh = false) {
    try {
      // 如果没有帖子数据，提前退出
      if (!posts.length) {
        this.setData({
          posts: refresh ? [] : this.data.posts,
          loading: false,
          loadingFailed: false,
          page: refresh ? 2 : this.data.page + 1,
          hasMore: false
        });
        return;
      }
      
      // 处理帖子数据
      const { processAvatarUrl } = require('../../utils/api/index');
      
      // 处理每个帖子的数据，与WXML模板期望的格式保持一致
      const processedPosts = await Promise.all(posts.map(async post => {
        try {
          // 首先确保ID字段存在且有效
          let postId = null;
          
          // 检查并设置帖子ID
          if (post.id && typeof post.id !== 'object') {
            postId = post.id;
          } else if (post._id && typeof post._id !== 'object') {
            postId = post._id;
          } else if (post.postId && typeof post.postId !== 'object') {
            postId = post.postId;
          } else {
            // 如果没有有效ID，生成一个临时ID
            postId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            logger.warn('帖子无有效ID，生成临时ID:', postId);
          }
          
          // 获取处理后的头像URL
          let avatarUrl = post.avatar || post.user_avatar || post.author_avatar || 
              (post.author ? post.author.avatar_url : null);
          if (avatarUrl) {
            avatarUrl = await processAvatarUrl(avatarUrl);
          }

          // 格式化显示内容
          const displayContent = post.content 
            ? (post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content) 
            : '';
          
          // 转换为WXML期望的格式
          return {
            _id: postId, // 使用处理过的ID
            id: postId,  // 同时设置id字段，确保兼容性
            title: post.title || '',
            content: post.content || '',
            displayContent: displayContent,
            hasMore: post.content && post.content.length > 100,
            authorName: post.nick_name || post.user_name || post.author_name || 
                (post.author ? post.author.name : '南开大学用户'),
            authorAvatar: avatarUrl || '/assets/icons/default-avatar.png',
            images: post.images || [],
            likes: post.likes || 0,
            favoriteCounts: post.favorite_count || 0,
            commentCount: post.comment_count || 0,
            relativeTime: this.formatTimeDisplay(post.create_time || post.createTime || Date.now()),
            tags: post.tags || [],
            isLiked: post.isLiked || false,
            isFavorited: post.isFavorited || false,
            comments: post.comments || []
          };
        } catch (itemError) {
          console.error('处理帖子项失败:', itemError, post);
          // 返回一个基本格式的帖子项，避免整个渲染过程失败
          const tempId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          return {
            _id: tempId,
            id: tempId,
            title: post.title || '帖子标题',
            content: post.content || '帖子内容',
            displayContent: '内容加载失败，请刷新重试...',
            authorName: '南开大学用户',
            authorAvatar: '/assets/icons/default-avatar.png',
            relativeTime: '刚刚',
            likes: 0,
            commentCount: 0
          };
        }
      }));
      
      console.debug('处理后的帖子数据:', processedPosts);
      
      // 更新数据
      this.setData({
        posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
        loading: false,
        loadingFailed: false,
        page: refresh ? 2 : this.data.page + 1,
        hasMore: posts.length >= this.data.pageSize
      });
      
      // 若是下拉刷新，显示提示并停止刷新
      if (this.data.isRefreshing) {
        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1000
        });
        wx.stopPullDownRefresh();
        this.setData({
          isRefreshing: false
        });
      }
    } catch (err) {
      console.error('处理数据错误:', err);
      this.setData({ 
        loading: false,
        loadingFailed: true
      });
      throw err;
    }
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadPosts();
    }
  },

  // 预览图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      current,
      urls
    });
  },

  // 格式化时间显示
  formatTimeDisplay(dateStr) {
    return util.formatRelativeTime(dateStr);
  },

  // 跳转到发布帖子页面
  goToPost() {
    wx.navigateTo({
      url: '/pages/post/post'
    });
  },

  // 查看帖子详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    
    // 增强ID验证
    if (!id) {
      console.error('帖子ID不存在:', e.currentTarget.dataset);
      wx.showToast({
        title: '无法查看帖子详情',
        icon: 'none'
      });
      return;
    }
    
    // 检查ID是否为对象
    if (typeof id === 'object') {
      console.error('帖子ID格式错误 (对象类型):', id);
      wx.showToast({
        title: '帖子数据格式错误',
        icon: 'none'
      });
      return;
    }
    
    console.debug('跳转到帖子详情页, ID:', id);
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}`
    });
  },

  // 点赞帖子
  async handleLike(e) {
    if (isLiking) return;
    isLiking = true;
    
    const { id, index } = e.currentTarget.dataset;
    const posts = this.data.posts;
    const currentPost = posts[index];
    
    try {
      const isLiked = currentPost.isLiked;
      
      // 更新本地点赞状态
      const likedPosts = wx.getStorageSync('likedPosts') || {};
      
      if (isLiked) {
        delete likedPosts[id];
      } else {
        likedPosts[id] = true;
      }
      
      wx.setStorageSync('likedPosts', likedPosts);
      
      // 计算新的点赞数
      const newLikes = isLiked ? currentPost.likes - 1 : currentPost.likes + 1;
      
      // 更新UI - 深拷贝避免引用问题
      const newPosts = [...posts];
      newPosts[index] = {
        ...newPosts[index],
        isLiked: !isLiked,
        likes: newLikes
      };
      
      this.setData({
        posts: newPosts
      });
      
      // 调用后端API
      try {
        const res = isLiked 
          ? await postAPI.likePost(id, false)
          : await postAPI.likePost(id, true);
        
        // 获取服务器返回的最新点赞数
        if (res && res.likes !== undefined) {
          newPosts[index].likes = res.likes;
          this.setData({
            posts: newPosts
          });
        }
      } catch (apiError) {
        console.error('API调用失败:', apiError);
        // 如果API调用失败，恢复UI
        newPosts[index].isLiked = isLiked;
        newPosts[index].likes = currentPost.likes;
        this.setData({
          posts: newPosts
        });
        throw apiError;
      }
      
    } catch (error) {
      console.error('点赞操作失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    } finally {
      isLiking = false;
    }
  },

  // 头像加载失败时使用默认头像
  onAvatarError(e) {
    const { index } = e.currentTarget.dataset;
    const key = `posts[${index}].author_avatar`;
    this.setData({
      [key]: defaultAvatarUrl
    });
  },

  // 显示评论输入框
  showCommentInput(e) {
    const { id, index } = e.currentTarget.dataset;
    this.setData({
      currentCommentPostId: id,
      currentCommentPostIndex: index,
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

  // 评论文本输入
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },

  // 选择评论图片
  chooseCommentImage() {
    wx.chooseImage({
      count: 3 - this.data.commentImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        
        // 检查图片数量限制
        if (this.data.commentImages.length + tempFilePaths.length > 3) {
          wx.showToast({
            title: '最多只能添加3张图片',
            icon: 'none'
          });
          return;
        }
        
        this.setData({
          commentImages: [...this.data.commentImages, ...tempFilePaths]
        });
      }
    });
  },

  // 移除评论图片
  removeCommentImage(e) {
    const { index } = e.currentTarget.dataset;
    const newImages = [...this.data.commentImages];
    newImages.splice(index, 1);
    this.setData({
      commentImages: newImages
    });
  },

  // 提交评论
  async submitComment() {
    // 检查评论内容
    if (!this.data.commentText.trim() && this.data.commentImages.length === 0) {
      wx.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前用户信息
    const userInfo = userManager.getUserInfoForAPI();
    
    // 检查是否登录
    if (!userManager.isLoggedIn()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '提交中...',
    });
    
    try {
      // 上传图片
      const imageUrls = [];
      if (this.data.commentImages.length > 0) {
        for (const imagePath of this.data.commentImages) {
          const cloudPath = `comments/${userInfo.openid}/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${imagePath.split('.').pop()}`;
          const res = await wx.cloud.uploadFile({
            cloudPath,
            filePath: imagePath
          });
          imageUrls.push(res.fileID);
        }
      }
      
      // 准备评论数据
      const commentData = {
        post_id: this.data.currentCommentPostId,
        openid: userInfo.openid,
        nick_name: userInfo.nickname,
        avatar: userInfo.avatar_url,
        content: this.data.commentText.trim(),
        images: imageUrls,
        parent_id: null  // 添加parent_id字段，默认为null表示顶级评论
      };
      
      // 提交评论
      await commentAPI.createComment(commentData);
      
      // 更新评论计数
      const newPosts = [...this.data.posts];
      const index = this.data.currentCommentPostIndex;
      if (index !== null && index !== undefined) {
        newPosts[index].comment_count = (newPosts[index].comment_count || 0) + 1;
        this.setData({
          posts: newPosts
        });
      }
      
      // 重置评论状态
      this.hideCommentInput();
      
      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('提交评论失败:', error);
      wx.showToast({
        title: '评论失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 显示展开的编辑器
  showExpandedEditor() {
    this.setData({
      showExpandedEditor: true
    });
  },

  // 隐藏展开的编辑器
  hideExpandedEditor() {
    this.setData({
      showExpandedEditor: false
    });
  },

  // 确认评论
  confirmComment() {
    this.submitComment();
  },

  // 收藏帖子
  async handleFavorite(e) {
    if (isFavoriting) return;
    isFavoriting = true;

    try {
      const { id, index } = e.currentTarget.dataset;
      const currentPost = this.data.posts[index];
      const isFavorited = currentPost.isFavorited;
      
      // 获取当前用户信息
      const userInfo = userManager.getCurrentUser();
      
      // 检查是否登录
      if (!userManager.isLoggedIn()) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        isFavoriting = false;
        return;
      }
      
      // 乐观更新UI
      const newPosts = [...this.data.posts];
      newPosts[index].isFavorited = !isFavorited;
      // 更新收藏数量显示
      newPosts[index].favoriteCounts = isFavorited 
        ? Math.max(0, currentPost.favoriteCounts - 1) 
        : (currentPost.favoriteCounts || 0) + 1;
      
      this.setData({
        posts: newPosts
      });
      
      // 调用后端API
      try {
        let response;
        if (isFavorited) {
          response = await postAPI.favoritePost(id, false);
        } else {
          response = await postAPI.favoritePost(id, true);
        }
        
        // 如果API返回了准确的收藏数量，使用API返回的数量
        if (response && response.favorite_count !== undefined) {
          newPosts[index].favoriteCounts = response.favorite_count;
          this.setData({
            posts: newPosts
          });
        }
      } catch (apiError) {
        console.error('API调用失败:', apiError);
        // 如果API调用失败，恢复UI
        newPosts[index].isFavorited = isFavorited;
        newPosts[index].favoriteCounts = currentPost.favoriteCounts;
        this.setData({
          posts: newPosts
        });
        throw apiError;
      }
      
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    } finally {
      isFavoriting = false;
    }
  }
})
