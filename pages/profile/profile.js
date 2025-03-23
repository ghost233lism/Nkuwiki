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
    forceRefresh: false
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
      
      // 添加这一行：尝试手动获取用户信息
      this.fetchUserInfo();
    } else {
      this.setData({
        isLogin: false
      });
    }
  },

  onShow() {
    // 添加用户ID调试信息
    const idDebugInfo = userManager.debugUserId();
    console.debug('用户ID调试信息:', idDebugInfo);
    
    // 检查是否需要强制刷新
    const needRefresh = this.data.forceRefresh || wx.getStorageSync('needRefreshUserInfo');
    if (needRefresh) {
      console.info('检测到强制刷新标记，清除缓存并刷新用户数据');
      // 清除刷新标记
      this.setData({ forceRefresh: false });
      wx.removeStorageSync('needRefreshUserInfo');
      // 清除所有用户数据缓存
      wx.removeStorageSync('_cached_user_info');
      
      // 立即重新获取用户信息 
      this.fetchUserInfo();
    }
    
    // 每次页面显示时都强制从storage获取最新用户信息
    // 注意：不要使用缓存，确保每次都获取最新数据
    wx.removeStorageSync('_cached_user_info');
    
    // 从存储获取最新用户信息
    const userInfo = userManager.getCurrentUser();
    const isLoggedIn = userManager.isLoggedIn();
    
    console.debug('当前用户信息:', userInfo);
    console.debug('登录状态:', isLoggedIn);
    
    // 检查用户信息是否有更新
    const hasUserInfoChanged = JSON.stringify(userInfo) !== JSON.stringify(this.data.userInfo);
    if (hasUserInfoChanged) {
      console.info('用户信息已更新，刷新界面');
    }
    
    this.setData({
      userInfo,
      loginType: userInfo?.loginType || '',
      isLoggedIn
    });
    
    // 检查登录状态是否变化
    if (isLoggedIn && (!this.data.isLogin || !this.data.isLoggedIn || hasUserInfoChanged || needRefresh)) {
      // 登录状态变化或用户信息变化，更新登录状态并刷新数据
      console.debug('登录状态或用户信息发生变化，刷新数据');
      this.setData({
        isLogin: true
      });
      
      // 立即执行数据获取
      this.refreshUserData();
      
      // 异步获取完整用户信息
      wx.nextTick(() => {
        this.fetchUserInfo();
      });
    } else if (!isLoggedIn && (this.data.isLogin || this.data.isLoggedIn)) {
      // 退出登录
      console.debug('登录状态发生变化：从已登录变为未登录');
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
      console.debug('已处于登录状态，刷新用户数据');
      this.refreshUserData();
    }
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
  async goToNotifications() {
    if (!this.checkLogin()) return;
    
    try {
      // 先尝试刷新用户信息
      await this.fetchUserInfo();
      
      // 获取最新用户信息
      const userInfo = userManager.getCurrentUser();
      const userId = userInfo?.id || userInfo?._id;
      
      // 检查用户ID是否存在
      if (!userId) {
        console.warn('无法跳转到通知页面：用户ID不存在');
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
        return;
      }
      
      console.debug('跳转到通知页面，用户ID:', userId);
      wx.navigateTo({
        url: '/pages/notifications/notifications',
        fail: (err) => {
          console.error('跳转到通知页面失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('准备跳转到通知页面时发生错误:', error);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    }
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
      // 检查是否需要强制刷新
      const needRefresh = wx.getStorageSync('needRefreshUserInfo');
      
      // 如果需要强制刷新，则清理缓存
      if (needRefresh) {
        logger.info('检测到需要刷新用户信息，清理缓存');
        wx.removeStorageSync('_cached_user_info');
        wx.setStorageSync('needRefreshUserInfo', false);
      }
      
      // 从userManager获取最新用户信息
      const user = userManager.getCurrentUser();
      
      // 检查用户信息是否存在且有效
      if (!user || !user.openid) {
        logger.error('获取用户信息失败或用户未登录');
        this.setData({ isLogin: false, userInfo: null });
        return;
      }
      
      // 标准化用户信息，确保必要字段存在
      const userInfo = {
        ...user,
        nickname: user.nickname || user.nickName || user.nick_name || '南开大学用户',
        nickName: user.nickname || user.nickName || user.nick_name || '南开大学用户',
        nick_name: user.nickname || user.nickName || user.nick_name || '南开大学用户',
        bio: user.bio || user.signature || '这个人很懒，什么都没留下',
        avatar: user.avatar || user.avatarUrl || user.avatar_url || 'https://nkuwiki.com/static/avatar/default.png'
      };
      
      // 更新页面数据
      this.setData({
        isLogin: true,
        userInfo: userInfo
      });
      
      // 更新用户统计信息
      this.refreshUserData();
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      this.setData({ isLogin: false, userInfo: null });
    }
  }
});