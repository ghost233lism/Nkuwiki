// pages/profile/profile.js
const app = getApp();
const userManager = require('../../utils/user_manager');
const { userAPI, postAPI, notificationAPI, feedbackAPI, aboutAPI, logger } = require('../../utils/api');

Page({
  data: {
    userInfo: null,
    loginType: '',
    totalLikes: 0,
    postsCount: 0,
    followedCount: 0,  // 关注数
    followerCount: 0,  // 粉丝数
    isLoggedIn: false,
    tokenCount: 0, // 用户token数量
    isLogin: false
  },

  onLoad(options) {
    // 使用userManager获取用户信息
    const userInfo = userManager.getCurrentUser();
    const isLoggedIn = userManager.isLoggedIn();
    
    this.setData({
      userInfo,
      loginType: userInfo?.loginType || '',
      isLoggedIn
    });

    // 检查登录状态
    if (userInfo && userInfo.id) {
      this.setData({
        isLogin: true,
        userInfo: userInfo
      });
      
      // 获取用户数据
      this.refreshUserData();
    } else {
      this.setData({
        isLogin: false
      });
    }
  },

  onShow() {
    this.refreshUserInfo();
  },

  // 刷新用户信息和统计数据
  async refreshUserInfo() {
    // 获取最新用户信息
    const userInfo = userManager.getCurrentUser();
    const isLoggedIn = userManager.isLoggedIn();
    
    this.setData({
      userInfo,
      loginType: userInfo?.loginType || '',
      isLoggedIn
    });

    if (isLoggedIn) {
      wx.showLoading({ title: '加载中' });
      
      try {
        // 并行获取各项统计数据
        await Promise.all([
          this.getUserPostsCount(),
          this.getUserTotalLikes(),
          this.getUserFollowCounts()
        ]);
      } catch (error) {
        console.error('获取用户数据失败:', error);
      } finally {
        wx.hideLoading();
      }
    }
  },

  // 获取用户发帖数量
  async getUserPostsCount() {
    try {
      if (!this.data.userInfo) return;
      
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      const res = await postAPI.getUserPosts(userId);
      
      if (res && !res.error) {
        this.setData({
          postsCount: res.length || 0
        });
      }
    } catch (error) {
      console.error('获取用户发帖数失败:', error);
    }
  },

  // 获取用户获赞总数
  async getUserTotalLikes() {
    try {
      if (!this.data.userInfo) return;
      
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      
      // 使用API获取用户的所有帖子
      const posts = await postAPI.getUserPosts(userId);
      
      // 确认posts是一个数组再使用reduce
      if (posts && Array.isArray(posts) && !posts.error) {
        // 计算所有帖子获得的点赞总数
        const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
        
        this.setData({
          totalLikes
        });
      } else {
        // 如果posts不是数组或有错误，设置默认值
        logger.debug('获取帖子列表格式不是数组:', posts);
        this.setData({
          totalLikes: 0
        });
      }
    } catch (error) {
      logger.error('获取用户获赞总数失败:', error);
      this.setData({
        totalLikes: 0
      });
    }
  },

  // 获取用户关注和粉丝数量
  async getUserFollowCounts() {
    try {
      if (!this.data.userInfo) return;
      
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      
      // 使用API获取用户关注和粉丝数据
      const res = await userAPI.getUserFollowStats(userId);
      
      // 日志记录获取到的数据
      logger.debug('获取用户关注统计:', res);
      
      if (res && !res.error) {
        // 设置数据，确保使用默认值避免显示NaN或undefined
        this.setData({
          followedCount: res.followedCount || 0,
          followerCount: res.followerCount || 0
        });
        
        logger.debug(`用户关注数据更新: 关注=${res.followedCount}, 粉丝=${res.followerCount}`);
      } else if (res && res.error) {
        logger.error('获取用户关注统计返回错误:', res.error);
        // 不更新数据，保持原有值
      }
    } catch (error) {
      logger.error('获取用户关注粉丝数据失败:', error);
      // 显示错误提示（可选）
      /*
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
      */
    }
  },

  // 查看用户发帖
  viewUserPosts() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/userPosts/userPosts?userId=' + (this.data.userInfo.id || this.data.userInfo._id),
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

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用userManager的登出方法
          userManager.logout();
          
          this.setData({
            userInfo: null,
            loginType: '',
            isLoggedIn: false,
            totalLikes: 0,
            postsCount: 0,
            followedCount: 0,
            followerCount: 0
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
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
  
  // 跳转到消息通知页面
  goToNotifications() {
    if (!this.checkLogin()) return;
    
    wx.navigateTo({
      url: '/pages/notifications/notifications',
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
  refreshUserData: function() {
    const userId = this.data.userInfo.id;
    
    // 获取用户信息
    this.getUserInfo();
    
    // 获取用户统计数据
    this.getUserStats(userId);
    
    // 获取用户关注数据
    this.getUserFollowCounts(userId);
    
    // 获取用户Token数量
    this.getUserTokenCount(userId);
  },

  /**
   * 获取用户Token数量
   */
  getUserTokenCount: function(userId) {
    if (!userId) return;
    
    userAPI.getUserToken(userId).then(res => {
      logger.debug('获取用户Token数量:', res);
      if (res && res.token !== undefined) {
        const tokenCount = res.token;
        this.setData({
          tokenCount: tokenCount
        });
      }
    }).catch(err => {
      logger.error('获取用户Token数量失败:', err);
    });
  },
});