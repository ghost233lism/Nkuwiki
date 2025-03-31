// index.js
const app = getApp();
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

let isLiking = false  // 添加在 Page 外部
let isFavoriting = false;  // 防止重复点击收藏按钮

// 在文件顶部引入工具函数和API模块
const util = require('../../utils/util');
const api = require('../../utils/api/index');

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
    isRead: true,
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
    this.getIsRead();
    this.loadPosts()
    this.setData({
      currentPostId: '',  // 初始化为空字符串
      currentPostIndex: -1
    })
  },

  async getIsRead(){

    try{
      const res = await wx.cloud.callFunction({
        name: "getOpenID"
      });

      var userId = res.result.openid;

      console.log("获取用户id", userId);
    }catch(err){
      console.log("获取用户id失败");
    }

    wx.cloud.database().collection("notification").doc(userId).get()
        .then(async res => {
          this.setData({
            isRead: res.data.isRead
          })
          console.log(this.data.isRead);
        })
        .catch(err => {
          console.log("获取isRead失败");
        });
  },

  onShow() {
    console.log('页面显示')
    
    // 检查是否需要刷新首页
    if (app.globalData && app.globalData.needRefreshHomePage) {
      console.log('检测到发布新帖，刷新首页')
      // 重置刷新标志
      app.globalData.needRefreshHomePage = false;
      // 刷新帖子列表
      this.loadPosts(true);
    }
  },
  // 下拉刷新
  onPullDownRefresh() {
    console.log('触发下拉刷新')

    this.getIsRead();

    // 维持页面位置，只刷新数据
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },
  // 加载帖子 - 返回Promise以便链式调用
  async loadPosts(refresh = false) {
    if (this.data.loading || (!refresh && !this.data.hasMore)) return Promise.resolve()

    try {
      this.setData({ loading: true })

      // 获取用户OPENID，用于确定点赞状态
      let OPENID = ''
      try {
        // 使用API模块获取用户信息
        const loginResult = await api.user.login()
        OPENID = loginResult.openid || ''
        console.log('首页获取到的OPENID:', OPENID)
      } catch (err) {
        console.error('获取用户OPENID失败：', err)
      }

      // 使用API模块获取帖子列表
      const result = await api.post.getPosts({
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        order_by: 'create_time DESC'
      })

      if (!result || !result.success) {
        throw new Error('获取帖子列表失败')
      }

      const posts = result.posts || []
      console.log('获取到的帖子数量:', posts.length, '刷新模式:', refresh)

      // 添加更多日志来查看问题
      if (posts.length === 0) {
        console.log('没有获取到帖子，检查是否有数据')
      } else {
        console.log('第一条帖子的ID:', posts[0].id)
      }

      // 处理帖子数据，仅进行必要的状态计算和时间格式化
      const processedPosts = posts.map(post => {
        // 解析字符串格式的JSON字段
        try {
          // 解析images字段
          if (typeof post.images === 'string') {
            post.images = JSON.parse(post.images || '[]');
          } else if (!Array.isArray(post.images)) {
            post.images = [];
          }
          
          // 过滤掉无效的图片URL，只保留有效的URL
          if (Array.isArray(post.images)) {
            post.images = post.images.filter(url => {
              if (typeof url !== 'string' || url.trim() === '') {
                return false;
              }
              // 只保留有效格式的URL
              return url.startsWith('cloud://') || url.startsWith('http://') || url.startsWith('https://');
            });
          }
          
          // 解析tags字段
          if (typeof post.tags === 'string') {
            post.tags = JSON.parse(post.tags || '[]');
          } else if (!Array.isArray(post.tags)) {
            post.tags = [];
          }
          
          // 解析liked_users字段
          if (typeof post.liked_users === 'string') {
            post.liked_users = JSON.parse(post.liked_users || '[]');
          } else if (!Array.isArray(post.liked_users)) {
            post.liked_users = [];
          }
          
          // 解析favorite_users字段
          if (typeof post.favorite_users === 'string') {
            post.favorite_users = JSON.parse(post.favorite_users || '[]');
          } else if (!Array.isArray(post.favorite_users)) {
            post.favorite_users = [];
          }
        } catch (err) {
          console.error('解析帖子JSON字段失败:', err, post);
          // 保证字段为数组类型，避免渲染错误
          post.images = Array.isArray(post.images) ? post.images : [];
          post.tags = Array.isArray(post.tags) ? post.tags : [];
          post.liked_users = Array.isArray(post.liked_users) ? post.liked_users : [];
          post.favorite_users = Array.isArray(post.favorite_users) ? post.favorite_users : [];
        }
        
        // 处理评论预览中的 [] 内容，防止被识别为图片标记
        if (post.recent_comments && post.recent_comments.length > 0) {
          post.recent_comments = post.recent_comments.map(comment => {
            // 安全处理评论内容，防止方括号被错误解析为图片
            if (comment.content && comment.content.includes('[')) {
              // 替换可能导致问题的方括号文本
              comment.content = comment.content.replace(/\[([^\]]*)\]/g, '「$1」');
            }
            return comment;
          });
        }
        
        // 只添加必要的计算字段，尽量保留原始字段名
        return {
          ...post,
          // 格式化创建时间用于显示
          create_time_formatted: this.formatTimeDisplay(post.create_time),
          // 计算点赞和收藏状态
          isLiked: OPENID ? post.liked_users?.includes(OPENID) : false,
          isFavorited: OPENID ? post.favorite_users?.includes(OPENID) : false,
        };
      });

      // 更新页面数据
      this.setData({
        posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
        page: refresh ? 2 : this.data.page + 1,
        hasMore: posts.length === this.data.pageSize,
        loading: false
      })

      return Promise.resolve()
    } catch (err) {
      console.error('加载帖子失败：', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
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
      const validUrls = urls.filter(url => url && typeof url === 'string' && url.trim() !== '');
      
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
  // 格式化时间显示
  formatTimeDisplay(dateStr) {
    if (!dateStr) return ''

    try {
      // 兼容iOS的日期格式处理
      let date;
      if (typeof dateStr === 'string') {
        // 检测格式是否为 "yyyy-MM-dd HH:mm:ss"
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          // 将空格替换为T，使之符合iOS支持的格式 "yyyy-MM-ddTHH:mm:ss"
          dateStr = dateStr.replace(' ', 'T');
        }
        
        // 尝试解析日期
        date = new Date(dateStr);
        
        // 检查日期是否有效
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

      // 格式化日期输出，确保月份和日期是两位数
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`
    } catch (e) {
      console.error('时间格式化错误：', e)
      return ''
    }
  },
  // 跳转到发帖页面
  goToPost() {
    wx.navigateTo({
      url: '/pages/post/post'
    })
  },
  // 跳转到帖子详情
  goToDetail(e) {
    const { postId } = e.currentTarget.dataset;

    if (!postId) {
      console.error('未找到帖子ID');
      return;
    }

    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
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
        新点赞状态: newIsLiked
      })

      // 使用API模块点赞
      const result = await api.post.likePost(id);

      console.log('点赞API返回结果:', result)

      if (!result || !result.success) {
        // 如果失败，回滚UI状态
        this.setData({
          [`posts[${index}].isLiked`]: currentPost.isLiked,
          [`posts[${index}].like_count`]: currentPost.like_count
        })
        throw new Error(result?.message || '操作失败')
      }

      // 成功时将openid保存到本地，确保刷新后状态一致
      try {
        // 在本地存储中记录点赞状态
        const likedPosts = wx.getStorageSync('likedPosts') || {}
        if (newIsLiked) {
          likedPosts[id] = true
        } else {
          delete likedPosts[id]
        }
        wx.setStorageSync('likedPosts', likedPosts)
      } catch (err) {
        console.error('保存点赞状态失败:', err)
      }

      // 轻量级提示
      wx.showToast({
        title: newIsLiked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1000
      })

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
    try {
      const index = e.currentTarget.dataset.index;
      if (index === undefined) {
        console.error('头像加载失败，但未提供索引');
        return;
      }
      
      // 获取当前帖子信息并记录日志
      const post = this.data.posts[index];
      console.error(`头像加载失败 - 索引: ${index}, 原始URL: ${post ? post.avatar : '未知'}`);
      
      // 设置本地默认头像
      const defaultAvatarPath = '/assets/icons/default-avatar.png';
      console.log(`替换为默认头像: ${defaultAvatarPath}`);
      
      this.setData({
        [`posts[${index}].avatar`]: defaultAvatarPath
      });
    } catch (err) {
      console.error('处理头像错误时发生异常:', err);
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
      count: 9,
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
        const totalImages = [...currentImages, ...newImages].slice(0, 9);

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
      // 先上传图片(如果有)
      let imageUrls = [];
      if (hasImages) {
        console.log("开始上传评论图片...");
        const uploadTasks = this.data.commentImages.map(img => this.uploadImage(img.tempUrl));
        imageUrls = await Promise.all(uploadTasks);
        console.log("图片上传成功:", imageUrls);
      }

      // 使用API模块添加评论
      console.log("调用API添加评论...");
      const result = await api.comment.createComment({
        post_id: postId,
        content: content,
        images: imageUrls,
        // 用户信息通过API自动处理
      });

      console.log("评论API返回结果:", result);

      if (result && result.success) {
        console.log("新添加的评论:", result.comment);

        // 更新本地数据
        let posts = this.data.posts;
        const currentPost = posts[this.data.currentPostIndex];
        
        // 确保recent_comments数组存在
        if (!currentPost.recent_comments) {
          currentPost.recent_comments = [];
        }

        // 添加新评论到评论预览（保持最新3条）
        // 处理评论内容中的方括号
        const newComment = {...result.comment};
        if (newComment.content && newComment.content.includes('[')) {
          newComment.content = newComment.content.replace(/\[([^\]]*)\]/g, '「$1」');
        }
        
        currentPost.recent_comments.unshift(newComment);
        if (currentPost.recent_comments.length > 3) {
          currentPost.recent_comments = currentPost.recent_comments.slice(0, 3);
        }

        // 更新评论计数
        currentPost.comment_count = (currentPost.comment_count || 0) + 1;

        this.setData({
          posts: posts,
          commentText: '',
          commentImages: [],
          showCommentInput: false
        });

        console.log("评论已添加到本地数据，帖子现在的评论数:", currentPost.comment_count);

        wx.hideLoading();
        wx.showToast({ title: '评论成功', icon: 'success' });
      } else {
        throw new Error(result?.message || '评论提交失败');
      }
    } catch (err) {
      console.error("评论提交出错:", err);
      wx.hideLoading();
      wx.showToast({
        title: '评论失败: ' + (err.message || '未知错误'),
        icon: 'none',
        duration: 2000
      });
    }
  },
  // 上传图片到云存储
  async uploadImage(tempFilePath) {
    try {
      // 使用API模块上传图片
      const result = await api.upload.uploadImage(tempFilePath);
      return result.fileID;
    } catch (err) {
      console.error('上传图片失败:', err);
      throw err;
    }
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
      
      if (loginResult.code === 0 && loginResult.data) {
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
        当前收藏状态: currentPost.isFavorited
      });

      // 根据操作类型调用不同的API
      const result = newIsFavorited 
        ? await api.post.favoritePost(id)
        : await api.post.unfavoritePost(id);

      console.log('收藏API返回结果:', result)

      if (!result || !result.success) {
        // 如果失败，回滚UI状态
        this.setData({
          [`posts[${index}].isFavorited`]: currentPost.isFavorited,
          [`posts[${index}].favorite_count`]: currentPost.favorite_count
        })
        throw new Error(result?.message || '操作失败')
      }

      // 成功时将状态保存到本地
      const favoritePosts = wx.getStorageSync('favoritePosts') || {}

      if (newIsFavorited) {
        favoritePosts[id] = true
      } else {
        delete favoritePosts[id]
      }
      wx.setStorageSync('favoritePosts', favoritePosts)

      // 轻量级提示
      wx.showToast({
        title: newIsFavorited ? '已收藏' : '已取消收藏',
        icon: 'none',
        duration: 1000
      })

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
      
      // 检查图片URL是否是有效的URL格式
      let isValidUrl = false;
      try {
        if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          // 检查是否是cloud://开头的云存储URL或http/https URL
          if (imageUrl.startsWith('cloud://') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            isValidUrl = true;
          }
        }
      } catch (err) {
        console.error('检查图片URL有效性出错:', err);
      }
      
      // 如果是无效URL，直接从数组中移除
      if (!isValidUrl) {
        console.error('检测到无效的图片URL，移除:', imageUrl);
        const newImages = [...post.images];
        newImages.splice(imageIndex, 1);
        
        this.setData({
          [`posts[${postIndex}].images`]: newImages
        });
        
        console.log(`已移除无效格式的图片URL`);
      } else {
        // 有效URL但加载失败，从数组中移除
        const newImages = [...post.images];
        newImages.splice(imageIndex, 1);
        
        this.setData({
          [`posts[${postIndex}].images`]: newImages
        });
        
        console.log(`已移除加载失败的图片`);
      }
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
  goToNotification: function() {
    wx.navigateTo({
      url: '/pages/notification/notification'
    });
  },
  
  // 跳转到智能助手页面
  goToAgent: function() {
    wx.navigateTo({
      url: '/pages/agent/index'
    });
  },
})
