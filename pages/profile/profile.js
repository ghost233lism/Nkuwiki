// pages/profile/profile.js
const app = getApp();
const userManager = require('../../utils/user_manager');
const { userAPI, postAPI, notificationAPI, feedbackAPI, aboutAPI, logger } = require('../../utils/api');

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
    // 每次页面显示时刷新用户信息
    const userInfo = userManager.getCurrentUser();
    const isLoggedIn = userManager.isLoggedIn();
    
    this.setData({
      userInfo,
      loginType: userInfo?.loginType || '',
      isLoggedIn
    });
    
    // 检查登录状态是否变化
    if (isLoggedIn && (!this.data.isLogin || !this.data.isLoggedIn)) {
      // 登录状态变化，更新登录状态并刷新数据
      this.setData({
        isLogin: true
      });
      this.refreshUserData();
    } else if (!isLoggedIn && (this.data.isLogin || this.data.isLoggedIn)) {
      // 退出登录
      this.setData({
        isLogin: false,
        likeCount: 0,
        postCount: 0,
        followedCount: 0,
        followerCount: 0,
        tokenCount: 0
      });
    } else if (isLoggedIn) {
      // 已登录，强制刷新用户统计数据
      this.refreshUserData();
    }
  },

  // 获取用户发帖数量
  async getUserPostsCount() {
    try {
      if (!this.data.userInfo) {
        logger.warn('获取用户发帖数失败: 用户信息不存在');
        return Promise.resolve(0);
      }
      
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      if (!userId) {
        logger.warn('获取用户发帖数失败: 用户ID不存在');
        return Promise.resolve(0);
      }
      
      logger.debug('获取用户发帖数量，用户ID:', userId);
      
      // 使用API获取用户的所有帖子
      const posts = await postAPI.getUserPosts(userId);
      
      // 确认返回数据结构
      logger.debug('获取到的帖子原始数据:', typeof posts, posts ? (Array.isArray(posts) ? `数组(${posts.length}项)` : '非数组') : '空');
      
      // 确认posts是一个数组
      if (posts && Array.isArray(posts)) {
        logger.debug(`成功获取用户帖子列表，帖子数量: ${posts.length}`);
        
        this.setData({
          postCount: posts.length || 0
        });
        
        logger.debug(`更新用户发帖数: ${posts.length}`);
        return Promise.resolve(posts.length);
      } else if (posts && typeof posts === 'object' && posts.total !== undefined) {
        // 处理返回总数而不是帖子列表的情况
        const count = posts.total || 0;
        logger.debug(`获取到帖子总数: ${count}`);
        
        this.setData({
          postCount: count
        });
        
        return Promise.resolve(count);
      } else {
        // 如果posts不是数组或有错误，设置默认值
        logger.debug('获取帖子列表失败或格式不是预期的:', posts);
        this.setData({
          postCount: 0
        });
        
        return Promise.resolve(0);
      }
    } catch (error) {
      logger.error('获取用户发帖数失败:', error);
      this.setData({
        postCount: 0
      });
      
      return Promise.reject(error);
    }
  },

  // 获取用户获赞总数
  async getUserTotalLikes() {
    try {
      if (!this.data.userInfo) {
        logger.warn('获取用户获赞总数失败: 用户信息不存在');
        return Promise.resolve(0);
      }
      
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      if (!userId) {
        logger.warn('获取用户获赞总数失败: 用户ID不存在');
        return Promise.resolve(0);
      }
      
      logger.debug('获取用户获赞总数，用户ID:', userId);
      
      // 使用API获取用户的所有帖子
      const posts = await postAPI.getUserPosts(userId);
      
      // 日志记录获取到的数据
      logger.debug('获取到的帖子原始数据:', typeof posts, posts ? (Array.isArray(posts) ? `数组(${posts.length}项)` : '非数组') : '空');
      
      // 确认posts是一个数组再使用reduce
      if (posts && Array.isArray(posts)) {
        logger.debug('成功获取用户帖子:', posts.length, '篇');
        
        // 计算所有帖子获得的点赞总数，检查多种可能的字段名
        let totalLikes = 0;
        
        for (const post of posts) {
          // 记录日志帮助调试
          const postId = post.id || post._id;
          const likeCount = parseInt(post.like_count || post.likes || 0);
          
          logger.debug(`帖子ID:${postId}, 点赞数:${likeCount}`);
          totalLikes += likeCount;
        }
        
        logger.debug('计算得到用户获赞总数:', totalLikes);
        
        this.setData({
          likeCount: totalLikes
        });
        
        return Promise.resolve(totalLikes);
      } else if (posts && typeof posts === 'object' && posts.total_likes !== undefined) {
        // 处理直接返回总赞数的情况
        const totalLikes = parseInt(posts.total_likes || 0);
        
        logger.debug('API直接返回用户获赞总数:', totalLikes);
        
        this.setData({
          likeCount: totalLikes
        });
        
        return Promise.resolve(totalLikes);
      } else {
        // 如果posts不是数组或有错误，设置默认值
        logger.debug('获取帖子列表失败或格式不是预期的:', posts);
        this.setData({
          likeCount: 0
        });
        
        return Promise.resolve(0);
      }
    } catch (error) {
      logger.error('获取用户获赞总数失败:', error);
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
        logger.warn('获取用户关注与粉丝数失败: 用户信息不存在');
        return Promise.resolve({followed: 0, follower: 0});
      }
      
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      if (!userId) {
        logger.warn('获取用户关注与粉丝数失败: 用户ID不存在');
        return Promise.resolve({followed: 0, follower: 0});
      }
      
      logger.debug('获取用户关注和粉丝数据，用户ID:', userId);
      
      // 使用API获取用户关注和粉丝数据
      const res = await userAPI.getUserFollowStats(userId);
      
      // 日志记录获取到的数据
      logger.debug('获取用户关注统计原始返回:', JSON.stringify(res));
      
      // 处理API响应
      if (res) {
        // 尝试不同可能的数据结构
        let followedCount = 0;
        let followerCount = 0;
        
        // 多种可能的字段名
        if (res.followedCount !== undefined) {
          followedCount = parseInt(res.followedCount) || 0;
        } else if (res.followed_count !== undefined) {
          followedCount = parseInt(res.followed_count) || 0;
        } else if (res.followed !== undefined) {
          followedCount = parseInt(res.followed) || 0;
        } else if (res.data && res.data.followedCount !== undefined) {
          followedCount = parseInt(res.data.followedCount) || 0;
        }
        
        if (res.followerCount !== undefined) {
          followerCount = parseInt(res.followerCount) || 0;
        } else if (res.follower_count !== undefined) {
          followerCount = parseInt(res.follower_count) || 0;
        } else if (res.followers !== undefined) {
          followerCount = parseInt(res.followers) || 0;
        } else if (res.data && res.data.followerCount !== undefined) {
          followerCount = parseInt(res.data.followerCount) || 0;
        }
        
        // 更新数据
        this.setData({
          followedCount: followedCount,
          followerCount: followerCount
        });
        
        logger.debug(`用户关注数据更新成功: 关注=${followedCount}, 粉丝=${followerCount}`);
        return Promise.resolve({followed: followedCount, follower: followerCount});
      } else {
        logger.warn('获取用户关注统计返回为空');
        // 设置默认值
        this.setData({
          followedCount: 0,
          followerCount: 0
        });
        
        return Promise.resolve({followed: 0, follower: 0});
      }
    } catch (error) {
      logger.error('获取用户关注粉丝数据失败:', error);
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
            likeCount: 0,
            postCount: 0,
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
    
    // 检查用户ID是否存在
    if (!this.data.userInfo || !(this.data.userInfo.id || this.data.userInfo._id)) {
      logger.warn('无法跳转到通知页面：用户ID不存在');
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
      return;
    }
    
    logger.debug('跳转到通知页面');
    wx.navigateTo({
      url: '/pages/notifications/notifications',
      fail: (err) => {
        logger.error('跳转到通知页面失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
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
  refreshUserData: async function() {
    if (!this.data.userInfo || !this.data.userInfo.id) {
      logger.warn('无法刷新用户数据：用户未登录或用户ID不存在');
      return;
    }
    
    const userId = this.data.userInfo.id;
    logger.debug('开始刷新用户数据，用户ID:', userId);
    
    wx.showLoading({
      title: '加载中',
      mask: true
    });
    
    try {
      // 记录开始时间，用于性能分析
      const startTime = Date.now();
      logger.debug('开始获取用户统计数据');
      
      // 并行获取用户统计数据
      const results = await Promise.allSettled([
        this.getUserPostsCount(),
        this.getUserTotalLikes(),
        this.getUserFollowCounts(),
        this.getUserTokenCount()
      ]);
      
      // 计算耗时
      const timeElapsed = Date.now() - startTime;
      logger.debug(`所有用户统计数据请求完成，耗时: ${timeElapsed}ms`);
      
      // 检查每个请求的结果，记录失败的请求
      const apiNames = ['帖子数', '获赞数', '关注/粉丝数', 'Token数'];
      let successCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
          logger.debug(`获取${apiNames[index]}成功: ${result.value}`);
        } else if (result.status === 'rejected') {
          logger.error(`获取${apiNames[index]}失败:`, result.reason);
        }
      });
      
      // 记录成功率
      logger.debug(`用户数据刷新完成，成功率: ${successCount}/${results.length}`);
      
      // 记录最终数据
      const finalData = {
        postCount: this.data.postCount,
        likeCount: this.data.likeCount,
        followedCount: this.data.followedCount,
        followerCount: this.data.followerCount,
        tokenCount: this.data.tokenCount
      };
      
      logger.debug('用户数据刷新结果:', JSON.stringify(finalData));
      
      // 判断是否需要重试失败的请求（当前简化处理，不进行重试）
      if (successCount < results.length) {
        logger.warn(`部分数据获取失败(${results.length - successCount}/${results.length})，不进行重试`);
      }
    } catch (err) {
      logger.error('刷新用户数据失败:', err);
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
        logger.warn('获取用户Token数失败: 用户信息不存在');
        return Promise.resolve(0);
      }
      
      const userId = this.data.userInfo.id || this.data.userInfo._id;
      if (!userId) {
        logger.warn('获取用户Token数失败: 用户ID不存在');
        return Promise.resolve(0);
      }
      
      logger.debug('获取用户Token数量，用户ID:', userId);
      
      const res = await userAPI.getUserToken(userId);
      logger.debug('获取用户Token响应:', JSON.stringify(res));
      
      if (res) {
        // 尝试从不同可能的数据结构中提取token值
        let tokenCount = 0;
        
        if (res.token !== undefined) {
          tokenCount = parseInt(res.token) || 0;
        } else if (res.tokens !== undefined) {
          tokenCount = parseInt(res.tokens) || 0;
        } else if (res.token_count !== undefined) {
          tokenCount = parseInt(res.token_count) || 0;
        } else if (res.data && res.data.token !== undefined) {
          tokenCount = parseInt(res.data.token) || 0;
        } else if (res.data && res.data.tokens !== undefined) {
          tokenCount = parseInt(res.data.tokens) || 0;
        } else if (typeof res === 'number') {
          // 如果直接返回数字
          tokenCount = res;
        } else if (typeof res === 'string' && !isNaN(parseInt(res))) {
          // 如果直接返回数字字符串
          tokenCount = parseInt(res);
        }
        
        logger.debug('用户Token数量解析结果:', tokenCount);
        
        this.setData({
          tokenCount: tokenCount
        });
        
        return Promise.resolve(tokenCount);
      } else {
        logger.warn('获取用户Token响应为空');
        this.setData({
          tokenCount: 0
        });
        return Promise.resolve(0);
      }
    } catch (err) {
      logger.error('获取用户Token数量失败:', err);
      this.setData({
        tokenCount: 0
      });
      return Promise.resolve(0);
    }
  }
});