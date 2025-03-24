const app = getApp();
const userManager = require('../../utils/user_manager');
const { postAPI, logger } = require('../../utils/api/index');

Page({
  data: {
    posts: [],
    loading: false,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.loadPosts()
  },

  // 页面显示时刷新帖子
  onShow: function() {
    this.loadPosts()
    
    // 检查是否有全局数据更新
    this.checkGlobalUpdates();
  },
  
  // 检查全局数据更新
  checkGlobalUpdates() {
    const app = getApp();
    const lastUpdateTime = this.lastUpdateTime || 0;
    
    // 如果全局数据已更新且本页面数据较旧，则更新本页面数据
    if (app.globalData.postUpdateTimestamp > lastUpdateTime) {
      console.debug('检测到全局数据更新，同步到发现页面');
      
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
      const postId = post.id;
      
      // 检查是否有此帖子的更新数据
      if (postId && updates[postId]) {
        // 合并更新数据
        const update = updates[postId];
        
        // 创建新的帖子对象，避免直接修改原对象
        const updatedPost = { ...post };
        
        // 更新点赞状态和数量
        if (update.hasOwnProperty('isLiked')) {
          updatedPost.userInteraction = updatedPost.userInteraction || {};
          updatedPost.userInteraction.isLiked = update.isLiked;
        }
        if (update.hasOwnProperty('likes')) {
          updatedPost.stats = updatedPost.stats || {};
          updatedPost.stats.likes = update.likes;
        }
        
        // 更新收藏状态和数量
        if (update.hasOwnProperty('isFavorited')) {
          updatedPost.userInteraction = updatedPost.userInteraction || {};
          updatedPost.userInteraction.isFavorited = update.isFavorited;
        }
        if (update.hasOwnProperty('favorite_count')) {
          updatedPost.stats = updatedPost.stats || {};
          updatedPost.stats.favoriteCount = update.favorite_count;
        }
        
        // 更新评论数量
        if (update.hasOwnProperty('comment_count')) {
          updatedPost.stats = updatedPost.stats || {};
          updatedPost.stats.comments = update.comment_count;
        }
        
        hasUpdates = true;
        return updatedPost;
      }
      
      // 如果没有更新，返回原帖子对象
      return post;
    });
    
    // 如果有更新，则更新页面数据
    if (hasUpdates) {
      console.debug('更新发现页帖子列表数据');
      this.setData({ posts: updatedPosts });
    }
  },
  
  // 接收全局数据更新通知
  onPostsDataUpdate(updates) {
    console.debug('发现页收到全局数据更新通知');
    this.updatePostsWithLatestData(updates);
  },

  // 处理下拉刷新
  onPullDownRefresh() {
    logger.debug('发现页触发下拉刷新');
    
    this.setData({
      refreshing: true
    });
    
    // 重置为第一页并刷新数据
    this.loadPosts(true)
      .then(() => {
        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1000
        });
      })
      .catch((err) => {
        logger.error('发现页下拉刷新失败:', err);
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

  // 处理上拉加载更多
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
    
    logger.debug('发现页触发上拉加载更多');
    this.loadPosts(false);
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading && !refresh) return;
    
    this.setData({ loading: true });
    
    try {
      const params = {
        limit: this.data.pageSize,
        offset: refresh ? 0 : this.data.posts.length,
        sort_by: 'update_time'  // 按更新时间排序
      };
      
      logger.debug('发现页加载帖子，参数：', params);
      
      const result = await postAPI.getPosts(params);
      logger.debug('发现页帖子加载成功, 响应类型:', typeof result);
      
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
        logger.debug('发现页加载到帖子数量:', newPosts.length);
      } else {
        logger.debug('发现页未加载到帖子数据');
      }
      
      // 处理帖子数据，统一格式化为前端展示所需的格式
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
          author: {
            id: postData.openid || postData.author_id,
            name: postData.nick_name || postData.author_name || '南开大学用户',
            avatar: postData.avatar || postData.author_avatar || '/assets/icons/default-avatar.png'
          },
          stats: {
            views: postData.view_count || 0,
            likes: postData.like_count || postData.likes || 0,
            comments: postData.comment_count || postData.comments || 0,
            favoriteCount: postData.favorite_count || postData.favorites || 0
          },
          createTime: postData.create_time || postData.createTime || postData.create_at,
          updateTime: postData.update_time || postData.updateTime || postData.update_at,
          userInteraction: {
            isLiked: postData.is_liked || postData.isLiked || false,
            isFavorited: postData.is_favorited || postData.isFavorited || false
          },
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
      logger.error('发现页加载帖子失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      
      return Promise.reject(error);
    }
  },

  // 跳转到发帖页面
  goToPost(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/post/post?id=${id}`
    })
  },

  // 点赞
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset
    try {
      // 安全获取当前用户
      const currentUser = userManager.getCurrentUser();
      if (!currentUser || !currentUser.openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      // 获取当前点赞状态
      const isCurrentlyLiked = this.data.posts[index].userInteraction.isLiked;
      
      // 立即更新UI，给用户即时反馈
      const key = `posts[${index}].stats.likes`;
      const keyLiked = `posts[${index}].userInteraction.isLiked`;
      const delta = isCurrentlyLiked ? -1 : 1;
      
      this.setData({
        [key]: this.data.posts[index].stats.likes + delta,
        [keyLiked]: !isCurrentlyLiked
      });
      
      // 使用新的接口格式，直接传递布尔值表示点赞/取消点赞
      const res = await postAPI.likePost(id, !isCurrentlyLiked);
      
      if (!res || res.error) {
        // 如果失败，回滚UI状态
        this.setData({
          [key]: this.data.posts[index].stats.likes - delta,
          [keyLiked]: isCurrentlyLiked
        });
        throw new Error(res?.error || '操作失败');
      }
      
      // 如果服务器返回最新点赞数，使用服务器数据更新UI
      if (res && res.likes !== undefined) {
        this.setData({
          [key]: res.likes
        });
      }
      
      wx.showToast({
        title: !isCurrentlyLiked ? '点赞成功' : '已取消点赞',
        icon: 'success',
        duration: 1000
      });
    } catch (err) {
      console.error('点赞失败：', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 点击帖子跳转到详情页
  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}`
    })
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