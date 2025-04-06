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
    tabTitles: ['我的帖子', '我的点赞', '我的收藏', '我的评论'],
    navButtons: [{
      type: 'back',
      text: '返回'
    }],
    // API参数
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

    this.setData({
      tabIndex,
      ...apiParams
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