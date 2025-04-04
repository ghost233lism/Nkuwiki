const { ui, ToastType } = require('../../../utils/util');
const baseBehavior = require('../../../behaviors/baseBehavior');
const postBehavior = require('../../../behaviors/post-behavior');
const userBehavior = require('../../../behaviors/user-behavior');
const authBehavior = require('../../../behaviors/auth-behavior');

Page({
  behaviors: [baseBehavior, postBehavior, userBehavior, authBehavior],

  data: {
    id: '',
    loading: false,
    error: null,
    errorText: '',
    postDetail: null,
    userInfo: null,
    
    // 评论相关
    comments: [],
    commentError: null,
    hasMore: false,
    
    // 加载状态
    loadingComment: false,
    
    // 其他
    isEditMode: false,
    // WEUI组件默认值
    toptips: {
      msg: '',
      type: 'info',
      show: false
    },
    dialog: {
      title: '',
      content: '',
      show: false,
      buttons: []
    },
    actionSheet: {
      show: false,
      actions: []
    }
  },

  onLoad(options) {
    if (!options.id) {
      ui.showToast('缺少帖子ID', { type: ToastType.ERROR });
      return;
    }

    this.setData({
      id: options.id,
      isEditMode: options.edit === '1'
    });
    
    this.loadInitialData();
  },

  onPullDownRefresh() {
    this.loadInitialData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const { postDetail, id } = this.data;
    return {
      title: postDetail?.title || '分享帖子',
      path: `/pages/post/detail/detail?id=${id}`
    };
  },

  async loadInitialData() {
    if (this.data.loading) return;
    
    this.setData({ 
      loading: true,
      error: null,
      errorText: ''
    });
    
    try {
      // 先获取用户信息和帖子详情
      const [post, userInfo] = await Promise.all([
        this.loadPostDetail(this.data.id),
        this.getCurrentUserInfo()
      ]);

      if (!post) {
        throw new Error('帖子不存在或已删除');
      }

      // 更新帖子和用户信息
      this.setData({
        postDetail: post,
        userInfo: userInfo || null,
        loading: false
      });

      // 延迟加载评论
      wx.nextTick(() => {
        this.loadComment();
      });
    } catch (err) {
      this.setData({
        loading: false,
        error: true,
        errorText: err.message || '加载失败，请下拉刷新重试'
      });
      this.handleError(err, '加载失败');
    }
  },

  async onPostEdit(e) {
    try {
      const { title, content, image } = e.detail;
      const updatedPost = await this.updatePost(this.data.id, title, content, image);
      this.setData({
        postDetail: updatedPost,
        isEditMode: false
      });
      ui.showToast('更新成功', { type: ToastType.SUCCESS });
    } catch (err) {
      this.handleError(err, '更新失败');
    }
  },

  async onPostDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇帖子吗？删除后将无法恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            await this.deletePost(this.data.id);
            ui.showToast('删除成功', { type: ToastType.SUCCESS });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) {
            this.handleError(err, '删除失败');
          }
        }
      }
    });
  },

  // 评论相关方法
  async loadComment() {
    if (!this.data.id) return;
    
    this.setData({
      loadingComment: true,
      commentError: null
    });
    
    try {
      await this.refreshComment(this.data.id);
      
      const commentData = this.data.comment || [];
      const commentPagination = this.data.commentPagination || { hasMore: false };
      
      this.setData({
        loadingComment: false,
        comments: commentData,
        hasMore: !!commentPagination.hasMore,
        commentError: null
      });
    } catch (err) {
      this.setData({
        loadingComment: false,
        commentError: true,
        hasMore: false
      });
      this.handleError(err, '加载评论失败');
    }
  },

  async loadMoreComment() {
    if (!this.data.id || this.data.loading || !this.data.hasMore) return;
    
    this.setData({ loadingComment: true });
    
    try {
      await this.loadComment(this.data.id);
      
      const commentData = this.data.comment || [];
      const commentPagination = this.data.commentPagination || { hasMore: false };
      
      this.setData({
        loadingComment: false,
        comments: commentData,
        hasMore: !!commentPagination.hasMore
      });
    } catch (err) {
      this.setData({
        loadingComment: false,
        hasMore: false
      });
      this.handleError(err, '加载更多评论失败');
    }
  },

  onUserTap(e) {
    const userId = e.currentTarget.dataset.userId;
    if (userId) {
      wx.navigateTo({
        url: `/pages/user/profile/profile?id=${userId}`
      });
    }
  },

  // 处理点赞
  handleLike(e) {
    // 获取事件中的post和index数据
    const { post, index, postId } = e.detail;
    
    // 构建事件对象传给toggleLike
    let event;
    
    if (postId) {
      // 新的格式：使用postId
      event = {
        detail: {
          postId,
          index
        }
      };
    } else if (post) {
      // 旧的格式：使用post对象
      event = {
        currentTarget: {
          dataset: {
            post: post,
            index: index
          }
        }
      };
    } else {
      console.debug('点赞失败: 找不到帖子数据');
      return;
    }
    
    this.toggleLike(event);
  },

  // 处理收藏
  handleFavorite(e) {
    // 获取事件中的post和index数据
    const { post, index, postId } = e.detail;
    
    // 构建事件对象传给toggleFavorite
    let event;
    
    if (postId) {
      // 新的格式：使用postId
      event = {
        detail: {
          postId,
          index
        }
      };
    } else if (post) {
      // 旧的格式：使用post对象
      event = {
        currentTarget: {
          dataset: {
            post: post,
            index: index
          }
        }
      };
    } else {
      console.debug('收藏失败: 找不到帖子数据');
      return;
    }
    
    this.toggleFavorite(event);
  }
}); 