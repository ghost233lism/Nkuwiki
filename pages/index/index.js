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
  },
  onShow() {
    console.log('页面显示')
    // 检查是否需要刷新数据
    if (app.globalData.needRefreshIndexPosts) {
      this.loadPosts(true) // 参数true表示强制刷新
      app.globalData.needRefreshIndexPosts = false // 重置标志
    }
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
    postAPI.getPosts(params)
      .then(res => {
        logger.debug('帖子加载成功:', res);
        
        let newPosts = [];
        // 处理返回数据，兼容多种格式
        if (Array.isArray(res)) {
          newPosts = res;
        } else if (res && Array.isArray(res.data)) {
          newPosts = res.data;
        } else if (res && res.posts && Array.isArray(res.posts)) {
          newPosts = res.posts;
        } else {
          logger.warn('无法解析帖子数据格式:', res);
          newPosts = [];
        }
        
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
          // 获取处理后的头像URL
          let avatarUrl = post.user_avatar || post.author_avatar || (post.author ? post.author.avatar_url : null);
          if (avatarUrl) {
            avatarUrl = await processAvatarUrl(avatarUrl);
          }

          // 格式化显示内容
          const displayContent = post.content 
            ? (post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content) 
            : '';
          
          // 转换为WXML期望的格式
          return {
            _id: post.id || post._id,
            title: post.title || '',
            content: post.content || '',
            displayContent: displayContent,
            hasMore: post.content && post.content.length > 100,
            authorName: post.user_name || post.author_name || (post.author ? post.author.name : '南开大学用户'),
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
          return {
            _id: post.id || post._id || `temp_${Date.now()}`,
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
    if (!id) {
      console.error('帖子ID不存在:', e.currentTarget.dataset);
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

    try {
      const { id, index } = e.currentTarget.dataset;
      const currentPost = this.data.posts[index];
      const isLiked = currentPost.isLiked;
      
      // 获取当前用户信息
      const userInfo = userManager.getCurrentUser();
      
      // 检查是否登录
      if (!userManager.isLoggedIn()) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        isLiking = false;
        return;
      }
      
      // 乐观更新UI
      const newPosts = [...this.data.posts];
      newPosts[index].isLiked = !isLiked;
      newPosts[index].likes = isLiked ? Math.max(0, currentPost.likes - 1) : currentPost.likes + 1;
      
      this.setData({
        posts: newPosts
      });
      
      // 调用后端API
      try {
        if (isLiked) {
          await postAPI.likePost(id, false);
        } else {
          await postAPI.likePost(id, true);
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
          const cloudPath = `comments/${userInfo.id}/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${imagePath.split('.').pop()}`;
          const res = await wx.cloud.uploadFile({
            cloudPath,
            filePath: imagePath
          });
          imageUrls.push(res.fileID);
        }
      }
      
      // 准备评论数据
      const commentData = {
        wxapp_id: `comment_${Date.now()}`,
        post_id: this.data.currentCommentPostId,
        user_id: userInfo.id,
        author_name: userInfo.nickname,
        author_avatar: userInfo.avatar_url,
        content: this.data.commentText.trim(),
        images: imageUrls
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
