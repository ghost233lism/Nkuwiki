// index.js
const app = getApp();
const defaultAvatarUrl = '/assets/icons/default-avatar.png'

// 防止重复点击的标志
let isLiking = false
let isFavoriting = false

// 在文件顶部引入工具函数和API模块
const util = require('../../utils/util');
const api = require('../../utils/api/index');
const { getOpenID } = util; // 显式导入getOpenID函数

// 常量定义
const PAGE_SIZE = 10;
const MAX_IMAGES = 9;
const MAX_COMMENT_PREVIEW = 3;

// 工具函数
const formatTimeDisplay = (dateStr) => {
  if (!dateStr) return ''

  try {
    let date;
    if (typeof dateStr === 'string') {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        dateStr = dateStr.replace(' ', 'T');
      }
      date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        console.error('无效的日期格式:', dateStr);
        return '';
      }
    } else {
      date = new Date(dateStr);
    }
    
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`
  } catch (e) {
    console.error('时间格式化错误：', e)
    return ''
  }
}

// 处理JSON字段
const parseJsonField = (field, defaultValue = []) => {
  try {
    if (typeof field === 'string') {
      return JSON.parse(field || '[]');
    }
    return Array.isArray(field) ? field : defaultValue;
  } catch (err) {
    console.error('解析JSON字段失败:', err);
    return defaultValue;
  }
}

// 处理评论内容
const processCommentContent = (content) => {
  if (!content) return '';
  return content.replace(/\[([^\]]*)\]/g, '「$1」');
}

// 验证图片URL
const isValidImageUrl = (url) => {
  if (typeof url !== 'string' || url.trim() === '') return false;
  return url.startsWith('cloud://') || url.startsWith('http://') || url.startsWith('https://');
}

// 过滤有效图片URL
const filterValidImageUrls = (urls) => {
  return Array.isArray(urls) ? urls.filter(isValidImageUrl) : [];
}

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
    currentPage: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    currentCommentPostId: null,
    currentCommentPostIndex: null,
    showCommentInput: false,
    commentText: '',
    commentImages: [],
    isRead: true,
    showExpandedEditor: false,
    searchValue: '',
    showSearchResult: false,
    searchResults: [],
    searchLoading: false,
    searchHasMore: true,
    searchPage: 1,
    searchPageSize: 10,
    baseUrl: app.globalData.config.services.app.base_url,
    searchHistory: [],
    maxHistoryItems: 10,
    openid: '',
    loadingMore: false,
    showInput: false,
    currentPostId: '',
    commentContent: '',
    selectedImages: [],
    isSubmittingComment: false,
    // 导航栏数据
    navItems: [
      { type: 'study', text: '学习交流', icon: '/assets/icons/nav/study.png' },
      { type: 'life', text: '校园生活', icon: '/assets/icons/nav/life.png' },
      { type: 'job', text: '就业创业', icon: '/assets/icons/nav/job.png' },
      { type: 'club', text: '社团活动', icon: '/assets/icons/nav/club.png' },
      { type: 'lost', text: '失物招领', icon: '/assets/icons/nav/lost.png' }
    ],
    currentType: '' // 当前选中的分类
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
  onLoad: async function(options) {
    try {
      // 获取用户openid
      const openid = await getOpenID()
      if (!openid) {
        throw new Error('获取用户信息失败')
      }

      // 设置初始数据
      this.setData({
        openid,
        currentPage: 1,
        pageSize: PAGE_SIZE,
        hasMore: true,
        loading: false,
        posts: [] // 确保清空帖子列表
      })

      // 加载帖子列表
      await this.loadPosts(true) // 传入true表示刷新模式
      
      // 获取通知状态
      await this.getIsRead()

      // 加载搜索历史
      this.loadSearchHistory();
    } catch (err) {
      console.error('页面加载失败:', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    }
  },

  async getIsRead() {
    try {
      // 使用API模块获取用户通知状态
      const result = await api.notification.getStatus();
      
      if (result && result.success) {
        this.setData({
          isRead: result.data.isRead
        });
        console.log("获取通知状态成功:", this.data.isRead);
      } else {
        console.error("获取通知状态失败:", result?.message);
      }
    } catch (err) {
      console.error("获取通知状态失败:", err);
    }
  },

  onShow: async function() {
    try {
      // 重置数据
      this.setData({
        posts: [],
        currentPage: 1,
        hasMore: true,
        loading: false
      })

      // 重新加载帖子列表
      await this.loadPosts(true)
      
      // 获取通知状态
      await this.getIsRead()
    } catch (err) {
      console.error('页面显示失败:', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    }
  },
  // 下拉刷新
  onPullDownRefresh: async function() {
    try {
      // 重置数据
      this.setData({
        posts: [],
        currentPage: 1,
        hasMore: true,
        loading: false
      })

      // 重新加载帖子列表
      await this.loadPosts(true)
      
      // 获取通知状态
      await this.getIsRead()
    } catch (err) {
      console.error('下拉刷新失败:', err)
      wx.showToast({
        title: err.message || '刷新失败',
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },
  // 加载帖子 - 返回Promise以便链式调用
  async loadPosts(refresh = false) {
    if (this.data.loading || (!refresh && !this.data.hasMore)) return Promise.resolve()

    try {
      this.setData({ loading: true })

      // 获取用户OPENID，用于确定点赞状态
      let OPENID = ''
      try {
        const loginResult = await api.user.login()
        OPENID = loginResult.data?.openid || ''
        console.log('首页获取到的OPENID:', OPENID)
      } catch (err) {
        console.error('获取用户OPENID失败：', err)
      }

      // 使用API模块获取帖子列表
      const result = await api.post.getPosts({
        page: refresh ? 1 : this.data.currentPage,
        pageSize: PAGE_SIZE,
        order_by: 'create_time DESC'
      })

      if (!result || !result.success) {
        throw new Error(result?.message || '获取帖子列表失败')
      }

      const posts = result.data || []
      console.log('获取到的帖子数量:', posts.length, '刷新模式:', refresh)

      // 处理帖子数据
      const processedPosts = posts.map(post => {
        // 解析JSON字段
        post.image = filterValidImageUrls(parseJsonField(post.image || post.images));
        post.tag = parseJsonField(post.tag || post.tags);
        post.liked_user = parseJsonField(post.liked_user || post.liked_users);
        post.favorite_user = parseJsonField(post.favorite_user || post.favorite_users);
        
        // 处理评论预览
        if (post.recent_comment && post.recent_comment.length > 0) {
          post.recent_comment = post.recent_comment.map(comment => ({
            ...comment,
            content: processCommentContent(comment.content),
            image: filterValidImageUrls(parseJsonField(comment.image || comment.images)),
            // 确保评论昵称字段统一
            nickname: comment.nickname || comment.nick_name || '匿名用户'
          }))
        }
        
        return {
          ...post,
          // 确保显示昵称，优先使用nickname
          nickname: post.nickname || post.nick_name || '匿名用户',
          create_time_formatted: formatTimeDisplay(post.create_time),
          isLiked: post.liked_user.includes(OPENID),
          isFavorited: post.favorite_user.includes(OPENID)
        }
      })

      // 添加详细日志以便调试
      console.log('处理后的第一个帖子:', processedPosts.length > 0 ? {
        id: processedPosts[0].id,
        nickname: processedPosts[0].nickname,
        nick_name: processedPosts[0].nick_name,
        like_count: processedPosts[0].like_count,
        isLiked: processedPosts[0].isLiked
      } : '无帖子')

      // 更新页面数据
      this.setData({
        posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
        currentPage: refresh ? 2 : this.data.currentPage + 1,
        hasMore: posts.length === PAGE_SIZE,
        loading: false
      })

      return Promise.resolve()
    } catch (err) {
      console.error('加载帖子失败：', err)
      this.setData({ loading: false })
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
      return Promise.reject(err)
    }
  },
  // 添加图片预览功能
  previewImage(e) {
    try {
      const { urls, current } = e.currentTarget.dataset
      
      if (!urls || !urls.length) {
        console.error('预览图片失败：无效的图片URL数组');
        return;
      }
      
      // 过滤掉无效URL，防止预览失败
      const validUrls = filterValidImageUrls(urls);
      
      if (validUrls.length === 0) {
        console.error('预览图片失败：所有URL都无效');
        return;
      }
      
      // 确保current是有效的URL
      let validCurrent = current;
      if (!validUrls.includes(current)) {
        validCurrent = validUrls[0];
        console.log('当前图片URL无效，使用第一张有效图片代替');
      }
      
      console.log(`预览图片: ${validCurrent}, 总共 ${validUrls.length} 张`);
      
      wx.previewImage({
        urls: validUrls,
        current: validCurrent,
        fail: err => {
          console.error('图片预览失败:', err);
          wx.showToast({
            title: '图片预览失败',
            icon: 'none'
          });
        }
      })
    } catch (err) {
      console.error('图片预览出错:', err);
      wx.showToast({
        title: '图片预览出错',
        icon: 'none'
      });
    }
  },
  // 跳转到发帖页面
  goToPost() {
    try {
      wx.navigateTo({
        url: '/pages/post/post',
        fail: (err) => {
          console.error('跳转发帖页失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } catch (err) {
      console.error('跳转发帖页出错:', err);
      wx.showToast({
        title: '跳转失败',
        icon: 'none'
      });
    }
  },
  // 跳转到帖子详情
  goToDetail(e) {
    const { postId } = e.currentTarget.dataset;
    if (!postId) {
      console.error('跳转详情页失败：未提供帖子ID');
      return;
    }

    try {
      wx.navigateTo({
        url: `/pages/post/detail/detail?id=${postId}`,
        fail: (err) => {
          console.error('跳转详情页失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } catch (err) {
      console.error('跳转详情页出错:', err);
      wx.showToast({
        title: '跳转失败',
        icon: 'none'
      });
    }
  },
  // 修改点赞处理函数
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset

    // 防止重复点击
    if (isLiking) return
    isLiking = true

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index]
      if (!currentPost) {
        throw new Error('帖子不存在')
      }

      // 立即更新UI状态，提供即时反馈
      const newIsLiked = !currentPost.isLiked
      const newLikes = currentPost.like_count + (newIsLiked ? 1 : -1)

      this.setData({
        [`posts[${index}].isLiked`]: newIsLiked,
        [`posts[${index}].like_count`]: newLikes
      })

      // 调用API模块并添加详细日志
      console.log('调用点赞API:', {
        postId: id,
        当前点赞状态: currentPost.isLiked,
        新点赞状态: newIsLiked,
        当前点赞数: currentPost.like_count,
        预计新点赞数: newLikes
      })

      // 使用API模块点赞
      const result = await api.post.likePost(id);
      console.log('点赞API返回结果:', result)

      if (result.success) {
        // 点赞成功的情况
        // 更新本地存储
        try {
          const likedPosts = wx.getStorageSync('likedPosts') || {}
          likedPosts[id] = true
          wx.setStorageSync('likedPosts', likedPosts)
          
          // 使用API返回的点赞数更新，如果有的话
          if (result.like_count !== undefined) {
            console.log(`更新帖子${id}的点赞数为:`, result.like_count)
            this.setData({
              [`posts[${index}].like_count`]: result.like_count
            })
          } else {
            console.log(`API未返回点赞数，使用预估点赞数:`, newLikes)
          }
          
          wx.showToast({
            title: '点赞成功',
            icon: 'none',
            duration: 1000
          })
        } catch (err) {
          console.error('保存点赞状态失败:', err)
        }
      } else if (result.message && result.message.includes('已经点赞')) {
        // 已经点赞过的情况
        console.log('已经点赞过了')
        this.setData({
          [`posts[${index}].isLiked`]: true,
          [`posts[${index}].like_count`]: currentPost.like_count // 恢复原来的点赞数
        })
        
        // 更新本地状态
        try {
          const likedPosts = wx.getStorageSync('likedPosts') || {}
          likedPosts[id] = true
          wx.setStorageSync('likedPosts', likedPosts)
        } catch (err) {
          console.error('保存点赞状态失败:', err)
        }
        
        wx.showToast({
          title: '已经点赞，请勿重复点赞',
          icon: 'none',
          duration: 1000
        })
      } else {
        // 其他失败情况，回滚UI
        console.log('点赞失败，回滚UI状态')
        this.setData({
          [`posts[${index}].isLiked`]: currentPost.isLiked,
          [`posts[${index}].like_count`]: currentPost.like_count
        })
        throw new Error(result?.message || '操作失败')
      }
    } catch (err) {
      console.error('点赞失败:', err)
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    } finally {
      // 无论成功失败，重置操作状态
      isLiking = false
    }
  },
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    
    // 为避免触发不必要的重新渲染，只更新需要的项
    if (index !== undefined) {
      console.debug(`头像加载失败，替换为默认头像，索引: ${index}`);
      // 更新帖子作者头像
      const postKey = `posts[${index}].avatar`;
      this.setData({
        [postKey]: defaultAvatarUrl
      });
    } else {
      console.debug('头像加载失败，无法确定具体位置');
    }
  },
  // 显示评论输入框
  showCommentInput(e) {
    const { id, index } = e.currentTarget.dataset;

    console.log("显示评论框，帖子ID:", id, "索引:", index);

    if (!id) {
      wx.showToast({
        title: '无法识别帖子',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showCommentInput: true,
      currentPostId: id,  // 确保这里正确存储了帖子ID
      currentPostIndex: index,
      commentText: '',
      commentImages: []
    });
  },
  // 隐藏评论框
  hideCommentInput() {
    this.setData({
      showCommentInput: false,
      currentPostId: '',  // 重置帖子ID
      currentPostIndex: -1,
      commentText: '',
      commentImages: []
    });
  },
  // 评论输入监听
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },
  // 选择评论图片
  chooseCommentImage() {
    const that = this;
    wx.chooseImage({
      count: MAX_IMAGES - (this.data.commentImages?.length || 0),
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths;
        const tempFiles = res.tempFiles;

        const currentImages = that.data.commentImages || [];
        const newImages = tempFilePaths.map((path, index) => ({
          tempUrl: path,
          size: tempFiles[index].size
        }));

        // 确保总数不超过9张
        const totalImages = [...currentImages, ...newImages].slice(0, MAX_IMAGES);

        that.setData({
          commentImages: totalImages
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
  // 提交评论
  async submitComment() {
    const postId = this.data.currentPostId;
    console.log("准备提交评论，帖子ID:", postId);

    if (!postId) {
      wx.showToast({
        title: '未找到帖子ID',
        icon: 'none'
      });
      return;
    }

    const content = this.data.commentText.trim();
    const hasImages = this.data.commentImages && this.data.commentImages.length > 0;

    if (!content && !hasImages) {
      wx.showToast({ title: '评论内容不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中...' });

    try {
      // 准备评论数据
      const commentData = {
        post_id: postId,
        content: content
      };
      
      // 处理图片上传
      if (hasImages) {
        const imageUrls = [];
        
        for (const image of this.data.commentImages) {
          try {
            const uploadResult = await this.uploadImage(image.tempUrl);
            if (uploadResult.success && uploadResult.fileID) {
              imageUrls.push(uploadResult.fileID);
            }
          } catch (err) {
            console.error('图片上传失败:', err);
          }
        }
        
        if (imageUrls.length > 0) {
          commentData.image = imageUrls;
        }
      }
      
      // 获取用户信息并添加到评论数据
      const userInfo = wx.getStorageSync('userInfo') || {};
      commentData.nickname = userInfo.nickName || userInfo.nickname;
      commentData.avatar = userInfo.avatarUrl || userInfo.avatar;
      
      // 提交评论
      const result = await api.post.createComment(commentData);
      
      if (result.success) {
        // 隐藏加载提示
        wx.hideLoading();
        
        // 显示成功提示
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        });
        
        // 重置输入框
        this.setData({
          commentText: '',
          commentImages: [],
          showCommentInput: false
        });
        
        // 刷新帖子列表
        await this.loadPosts(true);
      } else {
        throw new Error(result.message || '评论失败');
      }
    } catch (err) {
      console.error('提交评论失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '评论失败',
        icon: 'none'
      });
    }
  },
  /**
   * 上传图片到云存储
   * @param {string} tempFilePath - 临时文件路径
   * @returns {Promise<Object>} - 上传结果
   */
  async uploadImage(tempFilePath) {
    return new Promise((resolve, reject) => {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        return reject(new Error('用户未登录'));
      }
      
      // 生成云路径
      const timestamp = new Date().getTime();
      const cloudPath = `comment/${openid}/${timestamp}_${Math.random().toString(36).substr(2, 10)}.${tempFilePath.match(/\.(\w+)$/)[1]}`;
      
      console.log(`开始上传图片: ${tempFilePath} -> ${cloudPath}`);
      
      // 上传图片
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath,
        success: res => {
          console.log('图片上传成功:', res);
          resolve({
            success: true,
            fileID: res.fileID
          });
        },
        fail: err => {
          console.error('图片上传失败:', err);
          reject(new Error('图片上传失败: ' + err.errMsg));
        }
      });
    });
  },
  // 获取用户信息
  async getUserInfo() {
    try {
      // 从本地存储获取
      const userInfo = wx.getStorageSync('userInfo');

      // 如果有缓存数据，返回缓存的用户信息
      if (userInfo && userInfo._id) {
        console.log("从缓存获取到用户信息:", userInfo.nickName);
        return userInfo;
      }

      console.log("缓存中无用户信息，尝试登录");

      // 使用API模块登录获取用户信息
      const loginResult = await api.user.login();
      
      if (loginResult.success && loginResult.data) {
        console.log("登录获取到用户信息:", loginResult.data.nickName);
        return loginResult.data;
      }

      console.log("未查询到用户信息");
      return {};
    } catch (err) {
      console.error('获取用户信息失败:', err);
      return {};
    }
  },
  // 添加查看全部评论跳转功能
  viewPostDetail(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`
    });
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
    // 隐藏扩展编辑区并提交评论
    this.setData({
      showExpandedEditor: false
    });
    this.submitComment();
  },

  // 添加收藏处理函数
  async handleFavorite(e) {
    const { id, index } = e.currentTarget.dataset

    // 防止重复点击
    if (this.data.isFavoriting) return
    this.setData({ isFavoriting: true })

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index]
      if (!currentPost) {
        throw new Error('帖子不存在')
      }

      // 立即更新UI状态
      const newIsFavorited = !currentPost.isFavorited
      const newFavoriteCount = currentPost.favorite_count + (newIsFavorited ? 1 : -1);

      this.setData({
        [`posts[${index}].isFavorited`]: newIsFavorited,
        [`posts[${index}].favorite_count`]: newFavoriteCount
      });

      // 使用API模块收藏/取消收藏
      console.log('调用收藏API:', {
        postId: id,
        当前收藏状态: currentPost.isFavorited,
        新收藏状态: newIsFavorited,
        当前收藏数: currentPost.favorite_count,
        预计新收藏数: newFavoriteCount
      });

      // 根据操作类型调用不同的API
      const result = newIsFavorited 
        ? await api.post.favoritePost(id)
        : await api.post.unfavoritePost(id);

      console.log('收藏API返回结果:', result)

      if (result && result.success) {
        // 成功时将状态保存到本地
        const favoritePosts = wx.getStorageSync('favoritePosts') || {}

        if (newIsFavorited) {
          favoritePosts[id] = true
        } else {
          delete favoritePosts[id]
        }
        wx.setStorageSync('favoritePosts', favoritePosts)
        
        // 使用API返回的收藏数更新UI，如果有的话
        if (result.favorite_count !== undefined) {
          console.log(`更新帖子${id}的收藏数为:`, result.favorite_count)
          this.setData({
            [`posts[${index}].favorite_count`]: result.favorite_count
          })
        } else {
          console.log(`API未返回收藏数，使用预估收藏数:`, newFavoriteCount)
        }

        // 轻量级提示
        wx.showToast({
          title: result.message || (newIsFavorited ? '已收藏' : '已取消收藏'),
          icon: 'none',
          duration: 1000
        })
      } else if (result && !result.success && result.favorited) {
        // 已经收藏过的情况 - 检查favorited状态标识
        console.log('已经收藏过了')
        this.setData({
          [`posts[${index}].isFavorited`]: true,
          [`posts[${index}].favorite_count`]: currentPost.favorite_count // 恢复原来的收藏数
        })
        
        // 更新本地状态
        const favoritePosts = wx.getStorageSync('favoritePosts') || {}
        favoritePosts[id] = true
        wx.setStorageSync('favoritePosts', favoritePosts)
        
        wx.showToast({
          title: result.message || '已经收藏，请勿重复收藏',
          icon: 'none',
          duration: 1000
        })
      } else {
        // 其他失败情况，回滚UI状态
        console.log('收藏操作失败，回滚UI状态')
        this.setData({
          [`posts[${index}].isFavorited`]: currentPost.isFavorited,
          [`posts[${index}].favorite_count`]: currentPost.favorite_count
        })
        throw new Error(result?.message || '操作失败')
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    } finally {
      // 解除标志
      this.setData({ isFavoriting: false })
    }
  },
  // 处理帖子图片加载错误
  onPostImageError(e) {
    try {
      const postIndex = e.currentTarget.dataset.postIndex;
      const imageIndex = e.currentTarget.dataset.imageIndex;
      
      if (postIndex === undefined || imageIndex === undefined) {
        console.error('图片加载失败，但未提供完整索引信息');
        return;
      }
      
      // 获取当前帖子和图片信息
      const post = this.data.posts[postIndex];
      if (!post || !post.images) {
        console.error('找不到帖子或图片数组');
        return;
      }
      
      // 记录错误日志
      const imageUrl = post.images[imageIndex] || '未知';
      console.error(`帖子图片加载失败 - 帖子索引: ${postIndex}, 图片索引: ${imageIndex}, URL: ${imageUrl}`);
      
      // 检查图片URL是否有效
      if (!isValidImageUrl(imageUrl)) {
        console.error('检测到无效的图片URL，移除:', imageUrl);
      } else {
        console.error('有效URL但加载失败，移除:', imageUrl);
      }
      
      // 从图片数组中移除错误的图片
      const newImages = [...post.images];
      newImages.splice(imageIndex, 1);
      
      this.setData({
        [`posts[${postIndex}].images`]: newImages
      });
      
      console.log(`已移除错误的图片`);
    } catch (err) {
      console.error('处理帖子图片错误时发生异常:', err);
    }
  },
  // 处理评论图片加载错误
  onCommentImageError(e) {
    try {
      const postIndex = e.currentTarget.dataset.postIndex;
      const commentIndex = e.currentTarget.dataset.commentIndex;
      const imageIndex = e.currentTarget.dataset.imageIndex;
      
      if (postIndex === undefined || commentIndex === undefined || imageIndex === undefined) {
        console.error('评论图片加载失败，但未提供完整索引信息');
        return;
      }
      
      // 获取当前帖子、评论和图片信息
      const post = this.data.posts[postIndex];
      if (!post) {
        console.error('找不到帖子');
        return;
      }
      
      // 找到对应的评论
      const recentComments = post.recent_comments || [];
      if (!recentComments || !recentComments[commentIndex]) {
        console.error('找不到评论');
        return;
      }
      
      const comment = recentComments[commentIndex];
      if (!comment.images || !comment.images[imageIndex]) {
        console.error('找不到评论图片');
        return;
      }
      
      // 记录错误日志
      const imageUrl = comment.images[imageIndex] || '未知';
      console.error(`评论图片加载失败 - 帖子索引: ${postIndex}, 评论索引: ${commentIndex}, 图片索引: ${imageIndex}, URL: ${imageUrl}`);
      
      // 检查图片URL是否有效
      if (!isValidImageUrl(imageUrl)) {
        console.error('检测到无效的图片URL，移除:', imageUrl);
      } else {
        console.error('有效URL但加载失败，移除:', imageUrl);
      }
      
      // 从图片数组中移除错误的图片
      const newImages = [...comment.images];
      newImages.splice(imageIndex, 1);
      
      // 更新图片数组
      this.setData({
        [`posts[${postIndex}].recent_comments[${commentIndex}].images`]: newImages
      });
      
      console.log(`已移除错误的评论图片`);
    } catch (err) {
      console.error('处理评论图片错误时发生异常:', err);
    }
  },
  // 跳转到通知页面
  goToNotification() {
    try {
      wx.navigateTo({
        url: '/pages/notification/notification',
        success: () => {
          // 更新通知状态为已读
          this.setData({
            isRead: true
          });
        },
        fail: (err) => {
          console.error('跳转通知页失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } catch (err) {
      console.error('跳转通知页出错:', err);
      wx.showToast({
        title: '跳转失败',
        icon: 'none'
      });
    }
  },
  
  // 跳转到智能助手页面
  goToAgent: function() {
    wx.navigateTo({
      url: '/pages/agent/index'
    });
  },
  // 加载更多
  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    
    await this.loadPosts()
  },
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },
  onShareAppMessage: function() {
    return {
      title: '南开大学校园知识共享平台',
      path: '/pages/index/index',
      imageUrl: '/images/share.png',
      success: function() {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: function() {
        wx.showToast({
          title: '分享失败',
          icon: 'none'
        });
      }
    }
  },
  onShareTimeline: function() {
    return {
      title: '南开大学校园知识共享平台',
      query: '',
      imageUrl: '/images/share.png',
      success: function() {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: function() {
        wx.showToast({
          title: '分享失败',
          icon: 'none'
        });
      }
    }
  },
  onTabItemTap: async function() {
    try {
      // 重置数据
      this.setData({
        posts: [],
        currentPage: 1,
        hasMore: true,
        loading: false,
        showSearchResult: false,
        searchText: '',
        searchResults: []
      })

      // 重新加载帖子列表
      await this.loadPosts(true)
    } catch (err) {
      console.error('Tab点击刷新失败:', err)
      wx.showToast({
        title: err.message || '刷新失败',
        icon: 'none'
      })
    }
  },
  onHide: function() {
    // 页面隐藏时不需要特殊处理
  },
  onUnload: function() {
    // 页面卸载时不需要特殊处理
  },
  onReady: function() {
    // 页面首次渲染完成时不需要特殊处理
  },
  onResize: function() {
    // 页面尺寸变化时不需要特殊处理
  },
  onPageScroll: function() {
    // 页面滚动时不需要特殊处理
  },
  // 搜索框输入
  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      searchValue: '',
      showSearchResult: false,
      searchResults: [],
      searchPage: 1,
      searchHasMore: true
    });
  },

  // 执行搜索
  async handleSearch() {
    const keyword = this.data.searchValue.trim();
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    // 保存搜索历史
    this.saveSearchHistory(keyword);

    try {
      this.setData({ 
        searchLoading: true,
        searchPage: 1,
        showSearchResult: true 
      });

      // 获取用户openid用于判断点赞状态
      const openid = await getOpenID();
      if (!openid) {
        throw new Error('获取用户信息失败');
      }

      // 调用搜索API
      const result = await api.search.searchPosts({
        keyword,
        page: 1,
        pageSize: this.data.searchPageSize,
        openid
      });

      if (!result || !result.success) {
        throw new Error(result?.message || '搜索失败');
      }

      // 处理搜索结果
      const searchResults = result.data.map(post => {
        // 解析JSON字段
        post.images = filterValidImageUrls(parseJsonField(post.images));
        post.tags = parseJsonField(post.tags);
        post.liked_users = parseJsonField(post.liked_users);
        post.favorite_users = parseJsonField(post.favorite_users);
        
        // 处理评论预览
        if (post.recent_comments && post.recent_comments.length > 0) {
          post.recent_comments = post.recent_comments.map(comment => ({
            ...comment,
            content: processCommentContent(comment.content),
            images: filterValidImageUrls(parseJsonField(comment.images))
          }));
        }
        
        return {
          ...post,
          create_time_formatted: formatTimeDisplay(post.create_time),
          isLiked: post.liked_users.includes(openid),
          isFavorited: post.favorite_users.includes(openid)
        };
      });

      this.setData({
        searchResults,
        searchHasMore: searchResults.length === this.data.searchPageSize,
        searchLoading: false
      });

    } catch (err) {
      console.error('搜索失败:', err);
      this.setData({ searchLoading: false });
      wx.showToast({
        title: err.message || '搜索失败',
        icon: 'none'
      });
    }
  },

  // 加载更多搜索结果
  async loadMoreSearchResults() {
    if (this.data.searchLoading || !this.data.searchHasMore) return;

    try {
      this.setData({ searchLoading: true });
      const nextPage = this.data.searchPage + 1;

      // 获取用户openid用于判断点赞状态
      const openid = await getOpenID();
      if (!openid) {
        throw new Error('获取用户信息失败');
      }

      // 调用搜索API
      const result = await api.search.searchPosts({
        keyword: this.data.searchValue.trim(),
        page: nextPage,
        pageSize: this.data.searchPageSize,
        openid
      });

      if (!result || !result.success) {
        throw new Error(result?.message || '加载更多失败');
      }

      // 处理搜索结果
      const newResults = result.data.map(post => {
        // 解析JSON字段
        post.images = filterValidImageUrls(parseJsonField(post.images));
        post.tags = parseJsonField(post.tags);
        post.liked_users = parseJsonField(post.liked_users);
        post.favorite_users = parseJsonField(post.favorite_users);
        
        // 处理评论预览
        if (post.recent_comments && post.recent_comments.length > 0) {
          post.recent_comments = post.recent_comments.map(comment => ({
            ...comment,
            content: processCommentContent(comment.content),
            images: filterValidImageUrls(parseJsonField(comment.images))
          }));
        }
        
        return {
          ...post,
          create_time_formatted: formatTimeDisplay(post.create_time),
          isLiked: post.liked_users.includes(openid),
          isFavorited: post.favorite_users.includes(openid)
        };
      });

      this.setData({
        searchResults: [...this.data.searchResults, ...newResults],
        searchPage: nextPage,
        searchHasMore: newResults.length === this.data.searchPageSize,
        searchLoading: false
      });

    } catch (err) {
      console.error('加载更多搜索结果失败:', err);
      this.setData({ searchLoading: false });
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || [];
      this.setData({ searchHistory: history });
    } catch (err) {
      console.error('加载搜索历史失败:', err);
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    try {
      let history = this.data.searchHistory;
      // 移除重复项
      history = history.filter(item => item !== keyword);
      // 添加到开头
      history.unshift(keyword);
      // 限制数量
      if (history.length > this.data.maxHistoryItems) {
        history = history.slice(0, this.data.maxHistoryItems);
      }
      // 保存到本地和状态
      wx.setStorageSync('searchHistory', history);
      this.setData({ searchHistory: history });
    } catch (err) {
      console.error('保存搜索历史失败:', err);
    }
  },

  // 清空搜索历史
  clearSearchHistory() {
    try {
      wx.removeStorageSync('searchHistory');
      this.setData({ searchHistory: [] });
      wx.showToast({
        title: '已清空搜索历史',
        icon: 'success'
      });
    } catch (err) {
      console.error('清空搜索历史失败:', err);
    }
  },

  // 点击历史记录项
  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword }, () => {
      this.handleSearch();
    });
  },

  // 导航栏点击事件
  onNavItemTap(e) {
    const type = e.currentTarget.dataset.type;
    console.debug('点击了导航项：', type);
    
    // 可以根据类型跳转到不同的页面或者筛选内容
    switch(type) {
      case 'study':
        // 学习交流相关操作
        this.filterPostsByType('study');
        break;
      case 'life':
        // 校园生活相关操作
        this.filterPostsByType('life');
        break;
      case 'job':
        // 就业创业相关操作
        this.filterPostsByType('job');
        break;
      case 'club':
        // 社团活动相关操作
        this.filterPostsByType('club');
        break;
      case 'lost':
        // 失物招领相关操作
        this.filterPostsByType('lost');
        break;
      default:
        break;
    }
  },

  // 根据类型筛选帖子
  filterPostsByType(type) {
    wx.showToast({
      title: `正在筛选${type}类型的帖子`,
      icon: 'none'
    });
    
    // 清空现有帖子并重置分页
    this.setData({
      posts: [],
      currentPage: 1,
      hasMore: true,
      loading: true
    });
    
    // 加载指定类型的帖子
    this.loadPosts(type);
  },
})
