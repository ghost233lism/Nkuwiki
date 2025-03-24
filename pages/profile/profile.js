// pages/profile/profile.js
const app = getApp();
const userManager = require('../../utils/user_manager');
const { userAPI, postAPI, notificationAPI, feedbackAPI, aboutAPI, logger } = require('../../utils/api/index');

Page({
  data: {
    userInfo: null,
    loginType: '',
    likeCount: 0,     // 修改为likeCount以匹配WXML
    postCount: 0,     // 修改为postCount以匹配WXML
    followedCount: 0,  // 关注数
    followerCount: 0,  // 粉丝数
    isLoggedIn: false,
    tokenCount: 0, // 用户token数量
    isLogin: false,
    forceRefresh: false,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    loading: true,
    stats: {
      posts: 0,
      comments: 0,
      likes: 0,
      favorites: 0,
      follows: 0,
      followers: 0
    },
    updatedUserInfo: null // Added for updatedUserInfo handling
  },

  onLoad(options) {
    this.setData({
      canIUseGetUserProfile: typeof wx.getUserProfile === 'function'
    });
    
    // 检查登录状态
    const isLoggedIn = userManager.isLoggedIn();
    const userInfo = userManager.getCurrentUser();
    
    logger.debug('个人页面加载，登录状态:', isLoggedIn);
    
    if (isLoggedIn && userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
        isLogin: true,
        isLoggedIn: true,
        loading: false
      });
      
      // 获取用户统计数据
      this.getUserStats(userInfo._id || userInfo.id || userInfo.openid);
    } else {
      this.setData({
        isLoggedIn: false,
        loading: false
      });
    }
  },

  onShow() {
    // 每次显示页面时重新检查登录状态和刷新用户信息
    try {
      logger.debug('个人页面显示，检查是否需要刷新');
      
      // 初始默认需要刷新统计数据，即使用户信息没变
      let needRefresh = true;
      let needRefreshStats = true;
      
      // 检查是否有forceRefresh标记
      if (this.data.forceRefresh) {
        logger.debug('检测到forceRefresh标记，将刷新用户数据');
        needRefresh = true;
        this.setData({ forceRefresh: false });
      }
      
      // 检查存储中的刷新标记
      try {
        const storageNeedRefresh = wx.getStorageSync('needRefreshUserInfo');
        if (storageNeedRefresh) {
          logger.debug('检测到存储刷新标记，将刷新用户数据');
          needRefresh = true;
          wx.setStorageSync('needRefreshUserInfo', false);
        }
      } catch (e) {
        logger.error('检查存储刷新标记失败:', e);
      }
      
      // 如果有updatedUserInfo数据，直接使用它
      if (this.data.updatedUserInfo) {
        logger.debug('检测到updatedUserInfo数据，直接使用');
        const userInfo = this.data.updatedUserInfo;
        this.setData({ 
          userInfo: userInfo,
          hasUserInfo: true,
          isLogin: true,
          isLoggedIn: true,
          updatedUserInfo: null // 清除更新数据
        });
        
        // 更新用户统计数据
        this.refreshUserData(); // 使用完整刷新方法替代getUserStats
        return;
      }
      
      // 检查登录状态
      const isLoggedIn = userManager.isLoggedIn();
      const userInfo = userManager.getCurrentUser();
      
      logger.debug('个人页面显示，登录状态:', isLoggedIn);
      
      if (isLoggedIn && userInfo) {
        // 用户已登录，更新信息
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true,
          isLogin: true,
          isLoggedIn: true
        });
        
        // 如果需要刷新用户信息
        if (needRefresh) {
          logger.debug('需要刷新，调用fetchUserInfo');
          // 强制刷新用户信息和统计数据
          this.fetchUserInfo();
        } 
        // 即使不需要刷新用户信息，也尝试刷新统计数据
        else if (needRefreshStats) {
          logger.debug('只刷新统计数据');
          this.refreshUserData();
        }
      } else if (!isLoggedIn && this.data.isLoggedIn) {
        // 用户已登出，更新状态
        this.setData({
          userInfo: null,
          hasUserInfo: false,
          isLogin: false,
          isLoggedIn: false
        });
      }
    } catch (error) {
      logger.error('onShow执行出错:', error);
    }
  },

  // 获取用户统计数据
  getUserStats(userId) {
    if (!userId) {
      logger.error('获取用户统计数据失败：缺少用户ID');
      return;
    }
    
    // 调用API获取用户统计信息
    userAPI.getUserStats(userId)
      .then(res => {
        logger.debug('获取到用户统计信息:', res);
        
        // 更新数据，兼容不同API返回格式
        this.setData({
          postCount: res.posts_count || 0,
          likeCount: res.likes_received || 0,
          followedCount: res.following_count || 0,
          followerCount: res.followers_count || 0,
          
          // 同时更新stats对象以兼容旧代码
          stats: {
            posts: res.posts_count || 0,
            comments: res.comments_count || 0,
            likes: res.likes_received || 0,
            favorites: res.favorites_count || 0,
            follows: res.following_count || 0,
            followers: res.followers_count || 0
          }
        });
      })
      .catch(err => {
        logger.error('获取用户统计失败:', err);
        
        // 出错时设置默认值，避免显示NaN
        this.setData({
          postCount: 0,
          likeCount: 0,
          followedCount: 0,
          followerCount: 0
        });
      });
  },

  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          loading: true
        });
        
        userManager.login(res.userInfo)
          .then(userInfo => {
            this.setData({
              userInfo: userInfo,
              hasUserInfo: true,
              isLogin: true,
              loading: false
            });
            
            // 获取用户统计数据
            this.getUserStats(userInfo._id || userInfo.id || userInfo.openid);
          })
          .catch(err => {
            logger.error('用户登录失败:', err);
            this.setData({
              loading: false
            });
            
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            });
          });
      },
      fail: (err) => {
        logger.error('获取用户信息失败:', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 常规登录（不使用getUserProfile）
  getUserInfo(e) {
    if (e.detail.userInfo) {
      this.setData({
        loading: true
      });
      
      userManager.login(e.detail.userInfo)
        .then(userInfo => {
          this.setData({
            userInfo: userInfo,
            hasUserInfo: true,
            isLogin: true,
            loading: false
          });
          
          // 获取用户统计数据
          this.getUserStats(userInfo._id || userInfo.id || userInfo.openid);
        })
        .catch(err => {
          logger.error('用户登录失败:', err);
          this.setData({
            loading: false
          });
          
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        });
    }
  },

  // 跳转到我的发布
  navigateToMyPosts() {
    if (!this.data.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/myPosts/myPosts'
    });
  },

  // 跳转到我的评论
  navigateToMyComments() {
    if (!this.data.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/myComments/myComments'
    });
  },

  // 跳转到我的收藏
  navigateToMyFavorites() {
    if (!this.data.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/myFavorites/myFavorites'
    });
  },

  // 跳转到通知页面
  navigateToNotifications() {
    if (!this.data.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/notifications/notifications'
    });
  },

  // 跳转到设置页面
  navigateToSettings() {
    if (!this.data.isLogin) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 登出
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          userManager.logout();
          this.setData({
            userInfo: null,
            hasUserInfo: false,
            isLogin: false,
            stats: {
              posts: 0,
              comments: 0,
              likes: 0,
              favorites: 0,
              follows: 0,
              followers: 0
            }
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 获取用户发帖数量
  async getUserPostsCount() {
    try {
      if (!this.data.userInfo) {
        console.debug('获取用户发帖数失败: 用户信息不存在');
        return Promise.resolve(0);
      }
      
      // 修正：使用openid而不是数字id
      const openid = this.data.userInfo.openid || this.data.userInfo._openid;
      if (!openid) {
        console.debug('获取用户发帖数失败: 用户openid不存在');
        return Promise.resolve(0);
      }
      
      console.debug('获取用户发帖数量，用户openid:', openid);
      
      // 使用API获取用户的所有帖子
      const posts = await postAPI.getUserPosts(openid);
      
      // 标准响应会直接返回帖子数组
      console.debug(`成功获取用户帖子列表，帖子数量: ${posts.length}`);
      
      this.setData({
        postCount: posts.length || 0
      });
      
      return Promise.resolve(posts.length || 0);
    } catch (error) {
      console.error('获取用户发帖数失败:', error);
      this.setData({
        postCount: 0
      });
      
      return Promise.resolve(0);
    }
  },

  // 获取用户获赞总数
  async getUserTotalLikes() {
    try {
      if (!this.data.userInfo) {
        console.debug('获取用户获赞总数失败: 用户信息不存在');
        return Promise.resolve(0);
      }
      
      // 修正：使用openid而不是数字id
      const openid = this.data.userInfo.openid || this.data.userInfo._openid;
      if (!openid) {
        console.debug('获取用户获赞总数失败: 用户openid不存在');
        return Promise.resolve(0);
      }
      
      console.debug('获取用户获赞总数，用户openid:', openid);
      
      // 使用API获取用户的所有帖子
      const posts = await postAPI.getUserPosts(openid);
      
      // 日志记录获取到的数据
      console.debug('获取到的帖子原始数据:', typeof posts, posts ? (Array.isArray(posts) ? `数组(${posts.length}项)` : '非数组') : '空');
      
      // 确认posts是一个数组再使用reduce
      if (posts && Array.isArray(posts)) {
        console.debug('成功获取用户帖子:', posts.length, '篇');
        
        // 计算所有帖子获得的点赞总数，检查多种可能的字段名
        let totalLikes = 0;
        
        for (const post of posts) {
          // 记录日志帮助调试
          const postId = post.id || post._id;
          const likeCount = parseInt(post.like_count || post.likes || 0);
          
          console.debug(`帖子ID:${postId}, 点赞数:${likeCount}`);
          totalLikes += likeCount;
        }
        
        console.debug('计算得到用户获赞总数:', totalLikes);
        
        this.setData({
          likeCount: totalLikes
        });
        
        return Promise.resolve(totalLikes);
      } else if (posts && typeof posts === 'object' && posts.total_likes !== undefined) {
        // 处理直接返回总赞数的情况
        const totalLikes = parseInt(posts.total_likes || 0);
        
        console.debug('API直接返回用户获赞总数:', totalLikes);
        
        this.setData({
          likeCount: totalLikes
        });
        
        return Promise.resolve(totalLikes);
      } else {
        // 如果posts不是数组或有错误，设置默认值
        console.debug('获取帖子列表失败或格式不是预期的:', posts);
        this.setData({
          likeCount: 0
        });
        
        return Promise.resolve(0);
      }
    } catch (error) {
      console.error('获取用户获赞总数失败:', error);
      this.setData({
        likeCount: 0
      });
      
      return Promise.reject(error);
    }
  },

  // 获取用户关注和粉丝数量
  async getUserFollowCounts() {
    try {
      if (!this.data.userInfo) {
        console.debug('获取用户关注统计失败: 用户信息不存在');
        return Promise.resolve({ followedCount: 0, followerCount: 0 });
      }
      
      // 修正：使用openid而不是数字id
      const openid = this.data.userInfo.openid || this.data.userInfo._openid;
      if (!openid) {
        console.debug('获取用户关注统计失败: 用户openid不存在');
        return Promise.resolve({ followedCount: 0, followerCount: 0 });
      }
      
      console.debug('获取用户关注统计，用户openid:', openid);
      
      // 使用API获取关注和粉丝数量，传入openid而非userId
      const result = await userAPI.getUserFollowStats(openid);
      console.debug('获取用户关注统计响应:', result);
      
      // 后端标准响应，关注和粉丝数应该直接可用
      const followedCount = result.followedCount || 0;
      const followerCount = result.followerCount || 0;
      
      this.setData({
        followedCount,
        followerCount
      });
      
      return Promise.resolve({ followedCount, followerCount });
    } catch (error) {
      console.error('获取用户关注统计失败:', error);
      
      // 设置默认值
      this.setData({
        followedCount: 0,
        followerCount: 0
      });
      
      return Promise.reject(error);
    }
  },

  // 查看用户发帖
  viewPosts() {  // 方法名修改为viewPosts以匹配WXML
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/profile/myPosts/myPosts?userId=' + (this.data.userInfo.id || this.data.userInfo._id),
    });
  },

  // 查看用户收藏
  viewCollections() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/collections/collections',
    });
  },

  // 查看浏览历史
  viewHistory() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/history/history',
    });
  },

  // 查看评论
  viewComments() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/comments/comments',
    });
  },

  // 查看草稿
  viewDrafts() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/drafts/drafts',
    });
  },

  // 查看关注列表
  viewFollowed() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/followList/followList?type=followed',
    });
  },

  // 查看粉丝列表
  viewFollowers() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/followList/followList?type=followers',
    });
  },

  // 编辑个人资料
  editProfile() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/profile/edit/edit',
    });
  },

  // 进入设置页
  goToSettings() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/settings/settings',
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除缓存吗？这将删除浏览历史等本地数据',
      success: (res) => {
        if (res.confirm) {
          // 保留重要数据，只清除缓存数据
          const userInfo = wx.getStorageSync('userInfo');
          const token = wx.getStorageSync('token');
          
          wx.clearStorageSync();
          
          // 恢复重要数据
          if (userInfo) wx.setStorageSync('userInfo', userInfo);
          if (token) wx.setStorageSync('token', token);
          
          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 检查用户是否登录，如未登录则提示
  checkLogin() {
    if (!userManager.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login',
            });
          }
        }
      });
      return false;
    }
    return true;
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  // 查看用户点赞内容
  viewLiked() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/myLike_fav_comment/myLike_fav_comment?type=like',
    });
  },
  
  // 跳转到意见反馈页面
  goToFeedback() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/profile/feedback/feedback',
    });
  },
  
  // 跳转到关于我们页面
  goToAboutUs() {
    wx.navigateTo({
      url: '/pages/profile/about/about',
    });
  },

  /**
   * 刷新用户数据
   */
  async refreshUserData() {
    try {
      // 首先进行用户ID调试
      const idDebugInfo = userManager.debugUserId();
      console.debug('用户ID调试信息:', idDebugInfo);
      
      // 再次确认用户信息
      const currentUserInfo = userManager.getCurrentUser();
      console.debug('当前用户信息:', currentUserInfo);
      
      // 检查是否有有效的用户openid
      const openid = currentUserInfo?.openid || currentUserInfo?._openid || '';
      if (!openid) {
        console.error('刷新用户数据失败: 无法获取有效的用户openid');
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
        return;
      }
      
      // 设置加载状态
      wx.showLoading({
        title: '加载中...'
      });
      
      // 强制先显示基本资料（可能在API请求前）
      this.setData({
        userInfo: currentUserInfo
      });
      
      // 并行获取用户的各项数据
      try {
        const [postsCount, likesCount, followStats, tokenCount] = await Promise.all([
          this.getUserPostsCount(),         // 获取发帖数
          this.getUserTotalLikes(),         // 获取获赞数
          this.getUserFollowCounts(),       // 获取关注/粉丝数
          this.getUserTokenCount()          // 获取Token数量
        ]);
        
        console.debug('用户数据刷新成功', {
          postsCount, 
          likesCount, 
          followStats, 
          tokenCount
        });
        
        // 在Promise.all完成后，再次确认数据已正确设置
        this.setData({
          postCount: postsCount || 0,
          likeCount: likesCount || 0,
          followedCount: followStats?.followedCount || 0,
          followerCount: followStats?.followerCount || 0,
          tokenCount: tokenCount || 0
        });
      } catch (apiError) {
        console.error('API请求失败:', apiError);
        // 显示错误但继续运行
        wx.showToast({
          title: '部分数据加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('刷新用户数据时发生错误:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 获取用户Token数量
   */
  async getUserTokenCount() {
    try {
      if (!this.data.userInfo) {
        console.debug('获取用户Token数失败: 用户信息不存在');
        return Promise.resolve(0);
      }
      
      // 修正：使用openid而不是数字id
      const openid = this.data.userInfo.openid || this.data.userInfo._openid;
      if (!openid) {
        console.debug('获取用户Token数失败: 用户openid不存在');
        return Promise.resolve(0);
      }
      
      console.debug('获取用户Token数量，用户openid:', openid);
      
      const result = await userAPI.getUserToken(openid);
      console.debug('获取用户Token响应:', JSON.stringify(result));
      
      // 后端标准化响应，result.token应该直接可用
      const tokenCount = result.token || 0;
      
      this.setData({
        tokenCount: tokenCount
      });
      
      return Promise.resolve(tokenCount);
    } catch (error) {
      console.error('获取用户Token失败:', error);
      this.setData({
        tokenCount: 0
      });
      
      return Promise.resolve(0);
    }
  },

  // 获取用户信息
  fetchUserInfo() {
    try {
      // 设置加载指示器
      wx.showLoading({
        title: '刷新数据...',
        mask: true
      });
      
      // 检查是否需要强制刷新
      const needRefresh = wx.getStorageSync('needRefreshUserInfo');
      if (needRefresh) {
        wx.removeStorageSync('_cached_user_info');
        wx.setStorageSync('needRefreshUserInfo', false);
      }
      
      // 从userManager获取最新用户信息
      const user = userManager.getCurrentUser();
      if (!user || !user.openid) {
        this.setData({ isLogin: false, userInfo: null });
        wx.hideLoading();
        return;
      }
      
      // 提取用户ID（优先使用openid）
      const userId = user.openid || user._id || user.id;
      if (!userId) {
        logger.error('获取用户信息失败: 无法确定用户ID');
        this.setData({ isLogin: false, userInfo: null });
        wx.hideLoading();
        return;
      }
      
      // 尝试通过API刷新用户信息
      userManager.refreshUserInfo()
        .then(refreshedUser => {
          logger.debug('API刷新用户信息成功:', refreshedUser);
          
          // 更新页面数据
          this.setData({
            isLogin: true,
            isLoggedIn: true,
            userInfo: refreshedUser || user,
            hasUserInfo: true
          });
          
          // 确保使用正确的用户ID更新统计信息
          const finalUserId = refreshedUser?.openid || user.openid || refreshedUser?._id || user._id || refreshedUser?.id || user.id;
          
          // 更新用户统计信息
          return this.refreshUserData();
        })
        .catch(error => {
          logger.error('API刷新用户信息失败:', error);
          
          // 即使API刷新失败，仍然使用本地用户信息
          this.setData({
            isLogin: true,
            isLoggedIn: true,
            userInfo: user,
            hasUserInfo: true
          });
          
          // 尝试更新统计信息
          return this.refreshUserData();
        })
        .finally(() => {
          wx.hideLoading();
        });
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      this.setData({ isLogin: false, userInfo: null });
      wx.hideLoading();
    }
  }
});