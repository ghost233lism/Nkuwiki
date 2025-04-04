const { storage } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const postBehavior = require('../../behaviors/post-behavior');
const authBehavior = require('../../behaviors/auth-behavior');

Page({
  behaviors: [baseBehavior, postBehavior, authBehavior],
  
  data: {
    category: 'discover' // 探索分类
  },

  onLoad: async function() {
    // 确保用户已登录
    const isLoggedIn = await this.ensureLogin();
    if (!isLoggedIn) return;

    // 加载发现页数据
    await this.loadDiscoverPosts();
  },

  async loadDiscoverPosts() {
    this.showLoading('加载中...');
    
    try {
      await this.refreshPost({
        category: this.data.category
      });
    } catch (err) {
      this.handleError(err, '加载数据失败');
    } finally {
      this.hideLoading();
    }
  },

  async onPullDownRefresh() {
    try {
      await this.refreshPost({
        category: this.data.category
      });
    } catch (err) {
      this.handleError(err, '刷新数据失败');
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  onReachBottom: function() {
    this.loadMorePost({
      category: this.data.category
    });
  }
});