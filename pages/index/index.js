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
    baseUrl: (app.globalData.config && app.globalData.config.services && app.globalData.config.services.app) 
      ? app.globalData.config.services.app.base_url 
      : 'https://nkuwiki.com',
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
    logger.debug('触发下拉刷新');
    
    this.setData({
      refreshing: true
    });

    // 重置数据并刷新
    this.loadPosts(true)
      .then(() => {
        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1000
        });
      })
      .catch((err) => {
        logger.error('下拉刷新失败:', err);
        wx.showToast({
          title: '刷新失败',
          icon: 'none',
          duration: 1000
        });
      })
      .finally(() => {
        wx.stopPullDownRefresh();
        this.setData({
          refreshing: false
        });
      });
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.loading) {
      return;
    }
    
    if (!this.data.hasMore) {
      wx.showToast({
        title: '没有更多内容了',
        icon: 'none',
        duration: 1000
      });
      return;
    }
    
    logger.debug('触发上拉加载更多');
    this.loadPosts(false);
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
      // 确保用户已登录
      if (!userManager.isLoggedIn()) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
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
      const newLikes = isLiked ? Math.max(0, currentPost.likes - 1) : currentPost.likes + 1;
      
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
          
        logger.debug('点赞/取消点赞响应:', JSON.stringify(res));
        
        // 获取服务器返回的最新点赞数
        let serverLikes = newLikes; // 默认使用本地计算的值
        
        // 处理新API标准响应格式
        if (res && res.code === 200 && res.data) {
          if (res.data.like_count !== undefined) {
            serverLikes = res.data.like_count;
          } else if (res.data.likes !== undefined) {
            serverLikes = res.data.likes;
          }
        } 
        // 兼容旧版响应格式
        else if (res && res.likes !== undefined) {
          serverLikes = res.likes;
        } else if (res && res.like_count !== undefined) {
          serverLikes = res.like_count;
        }
        
        // 更新UI显示服务器返回的准确数据
        newPosts[index].likes = serverLikes;
        this.setData({
          posts: newPosts
        });
      } catch (apiError) {
        logger.error('点赞API调用失败:', apiError);
        // 如果API调用失败，恢复UI
        newPosts[index].isLiked = isLiked;
        newPosts[index].likes = currentPost.likes;
        this.setData({
          posts: newPosts
        });
        throw apiError;
      }
      
    } catch (error) {
      logger.error('点赞操作失败:', error);
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
    
    const { id, index } = e.currentTarget.dataset;
    
    try {
      // 确保用户已登录
      if (!userManager.isLoggedIn()) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      const posts = this.data.posts;
      const currentPost = posts[index];
      const isFavorited = currentPost.isFavorited;
      
      // 更新本地UI
      const newPosts = [...posts];
      newPosts[index] = {
        ...newPosts[index],
        isFavorited: !isFavorited,
        favoriteCounts: isFavorited 
          ? Math.max(0, currentPost.favoriteCounts - 1) 
          : currentPost.favoriteCounts + 1
      };
      
      this.setData({
        posts: newPosts
      });
      
      // 调用API
      const res = await postAPI.favoritePost(id, !isFavorited);
      logger.debug('收藏/取消收藏响应:', JSON.stringify(res));
      
      // 处理返回结果
      let serverFavoriteCount = newPosts[index].favoriteCounts; // 默认使用本地计算的值
      
      // 处理新API标准响应格式
      if (res && res.code === 200 && res.data) {
        if (res.data.favorite_count !== undefined) {
          serverFavoriteCount = res.data.favorite_count;
        } else if (res.data.favorites !== undefined) {
          serverFavoriteCount = res.data.favorites;
        }
      } 
      // 兼容旧版响应格式
      else if (res && res.favorite_count !== undefined) {
        serverFavoriteCount = res.favorite_count;
      } else if (res && res.favorites !== undefined) {
        serverFavoriteCount = res.favorites;
      }
      
      // 更新UI显示服务器返回的准确数据
      newPosts[index].favoriteCounts = serverFavoriteCount;
      this.setData({
        posts: newPosts
      });
    } catch (error) {
      logger.error('收藏操作失败:', error);
      
      // 恢复UI状态
      const posts = this.data.posts;
      const currentPost = posts[index];
      
      const newPosts = [...posts];
      newPosts[index] = {
        ...newPosts[index],
        isFavorited: currentPost.isFavorited,
        favoriteCounts: currentPost.favoriteCounts
      };
      
      this.setData({
        posts: newPosts
      });
      
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    } finally {
      isFavoriting = false;
    }
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading && !refresh) return;
    
    this.setData({ loading: true });
    
    try {
      const params = {
        limit: this.data.pageSize,
        offset: refresh ? 0 : this.data.posts.length,
        sort_by: 'create_time'  // 首页按创建时间排序
      };
      
      logger.debug('首页加载帖子，参数：', params);
      
      const result = await postAPI.getPosts(params);
      logger.debug('首页帖子加载成功, 响应类型:', typeof result);
      
      let newPosts = [];
      let total = 0;
      
      // 处理返回数据，适配新API标准响应格式
      if (result && result.code === 200 && result.data) {
        // 新API标准响应格式
        if (Array.isArray(result.data.posts)) {
          newPosts = result.data.posts;
          total = result.data.total || newPosts.length;
        } else if (Array.isArray(result.data)) {
          newPosts = result.data;
          total = result.data.length;
        }
      } 
      // 兼容旧版格式
      else if (Array.isArray(result)) {
        newPosts = result;
        total = result.length;
      } else if (result && result.posts && Array.isArray(result.posts)) {
        newPosts = result.posts;
        total = result.total || newPosts.length;
      } else {
        logger.warn('无法解析帖子数据格式:', typeof result);
        newPosts = [];
        total = 0;
      }
      
      if (newPosts.length > 0) {
        logger.debug('首页加载到帖子数量:', newPosts.length);
      } else {
        logger.debug('首页未加载到帖子数据');
      }
      
      // 处理帖子数据，统一格式
      const processedPosts = newPosts.map(post => {
        // 从标准格式中提取实际的帖子数据
        const postData = post.post || post;
        
        // 确保帖子有ID字段
        const postId = postData.id || postData._id || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // 处理图片数组，确保每个URL都是有效的字符串
        let images = [];
        if (postData.images) {
          // 如果images是字符串，尝试解析JSON
          if (typeof postData.images === 'string') {
            try {
              const parsedImages = JSON.parse(postData.images);
              if (Array.isArray(parsedImages)) {
                images = parsedImages;
              } else {
                images = [];
              }
            } catch (e) {
              // 如果解析失败，假设它是单个URL
              images = [postData.images];
            }
          } 
          // 如果已经是数组，直接使用
          else if (Array.isArray(postData.images)) {
            images = postData.images;
          }
          
          // 过滤并验证每个图片URL
          images = images.filter(url => {
            // 必须是字符串
            if (typeof url !== 'string') {
              return false;
            }
            
            // 必须是有效URL格式（简单验证）
            if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('cloud://')) {
              return false;
            }
            
            return true;
          });
          
          // 处理微信云存储图片，获取临时访问链接
          const cloudImages = images.filter(url => url.startsWith('cloud://'));
          if (cloudImages.length > 0) {
            // 异步获取云存储临时链接（不阻塞UI渲染）
            this.getCloudFileUrls(cloudImages, postId, index);
          }
        }
        
        // 构建统一格式的帖子数据
        return {
          id: postId,
          title: postData.title || '',
          content: postData.content || '',
          images: images,
          author_name: postData.nick_name || postData.author_name || '南开大学用户',
          author_avatar: postData.avatar || postData.author_avatar || '/assets/icons/default-avatar.png',
          likes: postData.like_count || postData.likes || 0,
          comment_count: postData.comment_count || postData.comments || 0,
          favoriteCounts: postData.favorite_count || postData.favorites || 0,
          createTime: postData.create_time || postData.createTime || postData.create_at,
          updateTime: postData.update_time || postData.updateTime || postData.update_at,
          isLiked: postData.is_liked || postData.isLiked || false,
          isFavorited: postData.is_favorited || postData.isFavorited || false,
          tags: postData.tags || []
        };
      });
      
      // 判断是否有更多数据
      const hasMore = newPosts.length >= params.limit;
      
      // 更新数据
      this.setData({
        posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
        loading: false,
        hasMore: hasMore,
        page: refresh ? 2 : this.data.page + 1
      });
      
      return processedPosts;
    } catch (error) {
      logger.error('首页加载帖子失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      
      return Promise.reject(error);
    }
  },

  // 获取云存储文件的临时访问链接
  getCloudFileUrls(cloudFileIDs, postId, postIndex) {
    if (!cloudFileIDs || cloudFileIDs.length === 0) return;
    
    logger.debug('正在获取云存储文件的临时链接，文件数:', cloudFileIDs.length);
    
    // 确保wx.cloud已初始化
    if (!wx.cloud) {
      logger.error('wx.cloud未初始化，无法获取临时链接');
      return;
    }
    
    wx.cloud.getTempFileURL({
      fileList: cloudFileIDs,
      success: res => {
        logger.debug('获取临时链接成功');
        
        if (!res.fileList || res.fileList.length === 0) return;
        
        // 获取当前posts
        const posts = this.data.posts;
        if (!posts || !posts[postIndex]) return;
        
        // 创建图片URL映射
        const urlMap = {};
        res.fileList.forEach(file => {
          if (file.fileID && file.tempFileURL) {
            urlMap[file.fileID] = file.tempFileURL;
          }
        });
        
        // 更新图片URL
        const newImages = [...posts[postIndex].images];
        let hasUpdates = false;
        
        newImages.forEach((url, i) => {
          if (url.startsWith('cloud://') && urlMap[url]) {
            newImages[i] = urlMap[url];
            hasUpdates = true;
          }
        });
        
        // 只有当有更新时才调用setData
        if (hasUpdates) {
          const key = `posts[${postIndex}].images`;
          this.setData({
            [key]: newImages
          });
          logger.debug('已更新帖子云存储图片链接');
        }
      },
      fail: err => {
        logger.error('获取云存储临时链接失败:', err);
      }
    });
  },
})
