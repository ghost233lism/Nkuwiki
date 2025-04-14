const behaviors = require('../../../behaviors/index');

Page({
  behaviors: [
    behaviors.baseBehavior,
    behaviors.authBehavior, 
    behaviors.userBehavior,
    behaviors.postBehavior
  ],

  data: {
    statusBarHeight: 0,
    isPostLoading: true,
    loadError: '',
    postDetail: null,
    postId: '',
    commentId: '',
  
    // 顶部提示
    toptips: {
      show: false,
      msg: '',
      type: 'error'
    },
    
    // 对话框
    dialog: {
      show: false,
      title: '',
      buttons: []
    }
  },

  onLoad(options) {
    // 从页面参数中获取帖子ID
    const postId = options.id;
    const commentId = options.comment_id; // 获取评论ID参数
    
    // 获取状态栏高度 - 使用新API替代已废弃的getSystemInfoSync
    try {
      const windowInfo = wx.getWindowInfo();
      this.setData({
        statusBarHeight: windowInfo.statusBarHeight,
        postId: postId,
        commentId: commentId // 保存评论ID
      });
    } catch (err) {
      console.debug('获取窗口信息失败:', err);
      this.setData({
        statusBarHeight: 20, // 默认状态栏高度
        postId: postId,
        commentId: commentId // 保存评论ID
      });
    }
    
    // 加载帖子详情
    this.loadPostDetail();
  },
  
  onReady() {
    // 如果有评论ID参数，等待页面准备好后定位到指定评论
    const { commentId } = this.data;
    if (commentId) {
      // 给评论列表一些时间加载数据
      setTimeout(() => {
        this.scrollToComment(commentId);
      }, 1000);
    }
  },
  
  onShow() {

  },

  // 加载帖子详情
  loadPostDetail() {
    const { postId } = this.data;
    if (!postId) {
      this.setData({
        isPostLoading: false,
        loadError: '帖子ID为空'
      });
      return;
    }
    // 显示加载状态
    this.setData({ 
      postDetail: {
        id: postId
      },
      isPostLoading: true,
      loadError: ''
    });
  },
  
  
  // 显示顶部提示
  showToptips(msg, type = 'error') {
    this.setData({
      'toptips.show': true,
      'toptips.msg': msg,
      'toptips.type': type
    });
    
    setTimeout(() => {
      this.setData({ 'toptips.show': false });
    }, 3000);
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    // 重新加载帖子详情
    this.loadPostDetail();
    
    // 获取评论列表组件实例，刷新评论列表
    const commentList = this.selectComponent('#commentList');
    if (commentList) {
      commentList.refresh();
    }
    
    // 停止下拉刷新
    wx.stopPullDownRefresh();
  },
  
  // 帖子删除回调
  onPostDeleted() {
    // 显示成功提示
    this.showToptips('帖子已删除', 'success');
    
    // 延迟返回
    setTimeout(() => {
      this.navigateBack();
    }, 1500);
  },
  
  // 获取页面状态组件实例
  getPageStatus() {
    return this.selectComponent('#pageStatus');
  },
  
  // 显示全屏加载
  showFullscreenLoading(text = '加载中...') {
    const pageStatus = this.getPageStatus();
    if (pageStatus) {
      pageStatus.showLoading({
        text,
        type: 'fullscreen',
        mask: true
      });
    }
  },
  
  // 隐藏全屏加载
  hideFullscreenLoading() {
    const pageStatus = this.getPageStatus();
    if (pageStatus) {
      pageStatus.hideLoading();
    }
  },
  
  // 显示错误状态
  showError(message) {
    const pageStatus = this.getPageStatus();
    if (pageStatus) {
      pageStatus.showError(message);
    }
  },

  // 滚动到指定评论的方法
  scrollToComment(commentId) {
    // 获取评论列表组件实例
    const commentList = this.selectComponent('#commentList');
    if (commentList) {
      // 调用评论列表组件的方法，定位到指定评论
      commentList.locateComment(commentId);
    }
  },

}); 