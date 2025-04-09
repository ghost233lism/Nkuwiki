// 我的内容页面 - 整合了我的帖子、点赞、收藏和评论功能
const app = getApp();
const behaviors = require('../../../behaviors/index');

Page({
  behaviors: [
    behaviors.baseBehavior,
    behaviors.authBehavior
  ],

  data: {
    tabIndex: 0,
    tabTitles: ['帖子', '获赞', '收藏', '关注', '粉丝', '评论'],
    navButtons: [{
      type: 'back',
      text: '返回'
    }],
    // 筛选条件
    postFilter: {}, // 帖子筛选条件
    likeFilter: {}, // 获赞筛选条件
    favoriteFilter: {}, // 收藏筛选条件
    followingFilter: {}, // 关注筛选条件
    followerFilter: {}, // 粉丝筛选条件
    commentFilter: {}, // 评论筛选条件
    // API参数 - 可以删除，不再需要
    postApiParams: {
      openid: '',
      page: 1,
      limit: 10
    },
    likeApiParams: {
      openid: '',
      offset: 0,
      limit: 10
    },
    favoriteApiParams: {
      openid: '',
      offset: 0,
      limit: 10
    },
    commentApiParams: {
      openid: '',
      offset: 0,
      limit: 10
    }
  },

  async onLoad(options) {
    // 获取登录信息
    const userInfo = await this._getUserInfo();
    if (!userInfo?.openid) {
      this.showToast('请先登录', 'error');
      return;
    }

    // 解析tab参数
    let tabIndex = 0; // 默认为0（我的帖子）
    if (options && options.tab) {
      tabIndex = parseInt(options.tab);
      // 确保有效范围
      if (isNaN(tabIndex) || tabIndex < 0 || tabIndex >= this.data.tabTitles.length) {
        tabIndex = 0;
      }
    }

    // 设置API参数
    const apiParams = {
      postApiParams: { openid: userInfo.openid, page: 1, limit: 10 },
      likeApiParams: { openid: userInfo.openid, offset: 0, limit: 10 },
      favoriteApiParams: { openid: userInfo.openid, offset: 0, limit: 10 },
      commentApiParams: { openid: userInfo.openid, offset: 0, limit: 10 }
    };

    // 设置所有的filter
    const filters = {
      postFilter: { openid: userInfo.openid }, // 我的帖子 - 显示当前用户发布的帖子
      likeFilter: { type: 'liked', openid: userInfo.openid }, // 我的获赞 - 显示当前用户获得点赞的帖子
      favoriteFilter: { favorite: 1, openid: userInfo.openid }, // 我的收藏 - 显示当前用户收藏的帖子
      followingFilter: { openid: userInfo.openid }, // 我的关注
      followerFilter: { openid: userInfo.openid }, // 我的粉丝
      commentFilter: { openid: userInfo.openid } // 我的评论
    };

    this.setData({
      tabIndex,
      ...apiParams,
      ...filters
    });
  },

  // 切换标签
  switchTab(e) {
    const tabIndex = e.detail.index;
    if (tabIndex === this.data.tabIndex) return;
    
    this.setData({ tabIndex });
  },

  // 帖子点击
  onPostTap(e) {
    const { id } = e.detail;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${id}`
    });
  },
  
  // 评论点击
  onCommentTap(e) {
    const { postId } = e.detail;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`
    });
  },
  
  // 新建帖子
  onNewPost() {
    wx.navigateTo({
      url: '/pages/post/edit/edit'
    });
  }
}); 