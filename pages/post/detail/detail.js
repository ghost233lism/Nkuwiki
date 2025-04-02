const { ui, error, ToastType, storage, formatRelativeTime, get } = require('../../../utils/util');
const baseBehavior = require('../../../behaviors/base-behavior');
const postBehavior = require('../../../behaviors/post-behavior');
const userBehavior = require('../../../behaviors/user-behavior');
const authBehavior = require('../../../behaviors/auth-behavior');

Page({
  behaviors: [baseBehavior, postBehavior, userBehavior, authBehavior],

  data: {
    id: '',
    replyTo: null,
    commentText: '',
    isEditMode: false,
    focusComment: false,
    loading: {
      post: false,
      comment: false,
      moreComment: false
    },
    comments: [], // 初始化评论数组
    commentError: null,
    hasMore: false,
    isCurrentUserPost: false,
    postActions: [],
    
    // WEUI组件相关属性
    toptipsMsg: '',
    toptipsType: 'info',
    toptipsShow: false,
    dialogTitle: '',
    dialogContent: '',
    dialogShow: false,
    dialogButtons: [],
    actionSheetShow: false,
    actionSheetGroups: []
  },

  onLoad: async function(options) {
    if (!options.id) {
      this.handleError(new Error('缺少帖子ID'), '缺少帖子ID');
      return;
    }

    this.setData({
      id: options.id,
      isEditMode: options.edit === '1',
      focusComment: options.focus === 'comment'
    });

    // 初始化WEUI组件
    this.initWeuiComponents();
  },

  // 页面初次渲染完成时
  onReady: function() {
    // 确保DOM渲染完成后再加载数据
    this.fetchPostData();
  },

  // 初始化WEUI组件，避免类型错误
  initWeuiComponents() {
    this.setData({
      toptipsShow: false,
      toptipsMsg: '',
      toptipsType: 'error',
      dialogShow: false, 
      dialogTitle: '',
      dialogContent: '',
      dialogButtons: [{ text: '取消' }, { text: '确定' }],
      actionSheetShow: false,
      actionSheetGroups: []
    });
  },

  onPullDownRefresh() {
    this.fetchPostData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const { postDetail, id } = this.data;
    return {
      title: postDetail?.title || '分享帖子',
      path: `/pages/post/detail/detail?id=${id}`
    };
  },

  async fetchPostData() {
    this.setData({
      'loading.post': true,
      error: null
    });
    
    try {
      await this.loadPostDetail(this.data.id);
      
      // 判断是否为当前用户的帖子
      const userInfo = await this.getCurrentUserInfo();
      const isCurrentUserPost = userInfo && this.data.postDetail && 
                              userInfo.openid === this.data.postDetail.user_id;
      
      // 更新交互栏按钮
      this.updatePostActions();
      
      this.setData({ 
        isCurrentUserPost 
      });

      // 帖子详情加载完成后再加载评论
      this.fetchCommentData(this.data.id);
    } catch (err) {
      this.handleError(err, '加载帖子失败');
    } finally {
      this.setData({ 'loading.post': false });
    }
  },

  // 更新交互栏按钮
  updatePostActions() {
    if (!this.data.postDetail) return;
    
    const { liked, like_count, comment_count, favorited, favorite_count } = this.data.postDetail;
    
    const actions = [
      {
        id: 'like',
        icon: 'like',
        activeIcon: 'like-fill',
        text: '点赞',
        count: like_count || 0,
        active: liked
      },
      {
        id: 'comment',
        icon: 'comment',
        text: '评论',
        count: comment_count || 0
      },
      {
        id: 'favorite',
        icon: 'star',
        activeIcon: 'star-fill',
        text: '收藏',
        count: favorite_count || 0,
        active: favorited
      },
      {
        id: 'share',
        icon: 'share',
        text: '分享'
      }
    ];
    
    this.setData({ postActions: actions });
  },

  // 交互栏点击事件
  onActionBarClick(e) {
    const { index } = e.detail;
    const action = this.data.postActions[index];
    
    if (!action) return;
    
    switch(action.id) {
      case 'like':
        this.onPostLike();
        break;
      case 'comment':
        this.onCommentTap();
        break;
      case 'favorite':
        this.onPostFavorite();
        break;
      case 'share':
        this.onPostShare();
        break;
    }
  },

  // 显示操作菜单
  showActionSheet() {
    if (!this.data.isCurrentUserPost) return;
    
    const actions = [
      { text: '编辑', value: 'edit' },
      { text: '删除', type: 'warn', value: 'delete' }
    ];
    
    this.setData({
      actionSheetShow: true,
      actionSheetGroups: actions
    });
  },

  // 操作菜单点击事件
  actionSheetClick(e) {
    const { value } = e.detail;
    
    if (value === 'edit') {
      this.setData({ isEditMode: true });
    } else if (value === 'delete') {
      this.onPostDelete();
    }
  },

  // 帖子交互
  async onPostLike() {
    if (!this.checkLogin()) return;

    try {
      const result = await this.likePost(this.data.id);
      this.setData({
        'postDetail.liked': result.is_liked,
        'postDetail.like_count': result.like_count
      });
      this.updatePostActions();
    } catch (err) {
      this.handleError(err, '点赞失败');
    }
  },

  async onPostFavorite() {
    if (!this.checkLogin()) return;

    try {
      const result = await this.favoritePost(this.data.id);
      this.setData({
        'postDetail.favorited': result.is_favorited,
        'postDetail.favorite_count': result.favorite_count
      });
      this.updatePostActions();
    } catch (err) {
      this.handleError(err, '收藏失败');
    }
  },

  onPostShare() {
    // 分享功能保持不变
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  async onPostEdit(e) {
    const { title, content, image } = e.detail;
    
    try {
      const updatedPost = await this.updatePost(this.data.id, title, content, image);
      this.setData({
        postDetail: updatedPost,
        isEditMode: false
      });
      this.showToast('更新成功', 'success');
    } catch (err) {
      this.handleError(err, '更新失败');
    }
  },

  async onPostDelete() {
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇帖子吗？删除后将无法恢复',
      success: async (res) => {
        if (res.confirm) {
          that.showLoading('删除中...');
          try {
            await that.deletePost(that.data.id);
            that.showToast('删除成功', 'success');
            
            // 延迟返回，让用户看到提示
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (err) {
            that.handleError(err, '删除失败');
          } finally {
            that.hideLoading();
          }
        }
      }
    });
  },

  // 评论相关
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  // 强制显示评论输入框
  forceShowCommentInput() {
    console.debug('强制显示评论输入框');
    
    // 首先确保状态正确
    this.setData({ focusComment: true });
    
    // 然后尝试直接操作组件
    setTimeout(() => {
      const commentInput = this.selectComponent('#commentInput');
      if (commentInput) {
        console.debug('找到评论输入组件，设置显示状态');
        commentInput.setData({ 
          show: true,
          focus: true
        });
      } else {
        console.debug('未找到评论输入组件');
      }
    }, 200);
  },

  onCommentTap() {
    console.debug('点击评论按钮');
    
    // 直接调用强制显示方法
    this.forceShowCommentInput();
    
    // 登录检查
    try {
      if (typeof this.checkLogin === 'function') {
        if (!this.checkLogin(false)) {
          console.debug('用户未登录');
        }
      }
    } catch (err) {
      console.error('登录检查出错:', err);
    }
  },

  onCommentClose() {
    this.setData({
      focusComment: false,
      replyTo: null,
      commentText: ''
    });
  },

  // 评论重试按钮点击事件
  onCommentRetry() {
    const postId = this.data.postDetail.id;
    if (postId) {
      this.fetchCommentData(postId);
    }
  },

  // 加载更多评论
  onLoadMore() {
    const postId = this.data.postDetail.id;
    if (postId) {
      this.fetchMoreComments(postId);
    }
  },

  async onCommentSubmit() {
    if (!this.checkLogin()) return;

    const { commentText, id: post_id, replyTo } = this.data;
    const content = commentText.trim();
    
    if (!content) {
      this.showToast('请输入评论内容', 'error');
      return;
    }

    this.setData({ 'loading.comment': true });
    this.showLoading('发送中...');

    try {
      const parentId = replyTo ? replyTo.id : null;
      // 使用behaviors/comment-behavior.js中的submitComment方法
      const result = await this.submitComment(post_id, content, parentId);
      
      if (result) {
        this.setData({
          commentText: '',
          replyTo: null,
          focusComment: false,
          'postDetail.comment_count': (this.data.postDetail?.comment_count || 0) + 1
        });
  
        this.updatePostActions();
        this.showToast('评论成功', 'success');
        // 刷新评论列表
        this.fetchCommentData(this.data.id);
      }
    } catch (err) {
      this.handleError(err, '评论失败');
    } finally {
      this.setData({ 'loading.comment': false });
      this.hideLoading();
    }
  },

  onCommentReply(e) {
    if (!this.checkLogin()) return;
    
    console.debug('评论回复事件:', e.detail);
    
    // 从事件中获取完整的评论对象
    const comment = e.detail.comment;
    if (!comment) return;
    
    this.setData({
      replyTo: comment,
      focusComment: true
    });
    
    // 强制显示评论输入框
    this.forceShowCommentInput();
  },

  async onCommentDelete(e) {
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          that.showLoading('删除中...');
          try {
            await that.deleteComment(e.detail.commentId);
            
            that.setData({
              'postDetail.comment_count': Math.max(0, (that.data.postDetail?.comment_count || 1) - 1)
            });

            that.updatePostActions();
            that.showToast('删除成功', 'success');
            that.fetchCommentData(that.data.id);
          } catch (err) {
            that.handleError(err, '删除失败');
          } finally {
            that.hideLoading();
          }
        }
      }
    });
  },

  onImagePreview(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    
    // 获取所有图片URL
    const urls = this.data.postDetail && this.data.postDetail.image || [];
    
    wx.previewImage({
      current: url,  // 当前显示图片的http链接
      urls: urls.length > 0 ? urls : [url] // 需要预览的图片http链接列表
    });
  },

  // post-item组件事件处理
  onPostItemLike(e) {
    this.onPostLike();
  },

  onPostItemFavorite(e) {
    this.onPostFavorite();
  },

  onPostItemComment(e) {
    this.onCommentTap();
  },

  // 获取评论列表数据
  async fetchCommentData(postId) {
    if (!postId) return;

    // 设置页面的加载状态
    this.setData({
      'loading.comment': true,
      commentError: null,
      comments: [] // 清空原有数据，避免闪烁
    });
    
    try {
      // 获取当前用户openid
      const openid = storage.get('openid');
      
      console.debug('开始加载评论数据，帖子ID:', postId);
      
      // 直接使用util.js中的get方法
      const res = await get(`/api/comment/list/${postId}`);
      
      if (res.code !== 200) {
        throw error.create(res.message || '加载评论失败');
      }
      
      // 确保comment是数组
      let comment = res.data || [];
      if (!Array.isArray(comment)) comment = [];
      
      console.debug('评论数据加载成功，原始数据:', comment);
      console.debug('评论数据总数量:', comment.length);
      
      // 格式化评论数据
      const formattedComment = this.formatCommentData(comment, openid);
      console.debug('格式化后的评论数据:', formattedComment);
      
      // 更新帖子详情中的评论数量
      if (this.data.postDetail) {
        const commentCount = comment.length;
        if (this.data.postDetail.comment_count !== commentCount) {
          this.setData({
            'postDetail.comment_count': commentCount
          });
          this.updatePostActions();
        }
      }

      // 直接更新页面的data，而不是组件的data
      this.setData({
        comments: formattedComment,
        'loading.comment': false,
        commentError: null,
        hasMore: formattedComment.length < (this.data.postDetail.comment_count || 0)
      });
      
      console.debug('评论列表已更新:', {
        comments: formattedComment.length,
        total: this.data.postDetail.comment_count || 0
      });
    } catch (err) {
      console.error('加载评论失败:', err);
      this.setData({
        'loading.comment': false,
        commentError: true
      });
    }
  },

  // 获取更多评论数据
  async fetchMoreComments(postId) {
    if (this.data.loading.moreComment || !this.data.hasMore) return;

    this.setData({ 'loading.moreComment': true });

    try {
      const page = Math.ceil(this.data.comments.length / 10) + 1;
      const params = { page, limit: 10 };
      const openid = storage.get('openid');
      
      // 直接使用util.js中的get方法
      const res = await get(`/api/comment/list/${postId}`, params);
      
      if (res.code !== 200) {
        throw error.create(res.message || '加载更多评论失败');
      }
      
      const moreComment = res.data || [];
      
      if (!moreComment || moreComment.length === 0) {
        // 没有更多评论了
        this.setData({
          'loading.moreComment': false,
          hasMore: false
        });
        return;
      }
      
      // 格式化评论数据
      const formattedComment = this.formatCommentData(moreComment, openid);
      
      // 更新评论列表
      const updatedComment = [...this.data.comments, ...formattedComment];
      
      this.setData({
        comments: updatedComment,
        'loading.moreComment': false,
        hasMore: formattedComment.length === params.limit && 
                updatedComment.length < (this.data.postDetail.comment_count || 0)
      });
    } catch (err) {
      console.error('加载更多评论失败:', err);
      this.setData({
        'loading.moreComment': false
      });
    }
  },
  
  // 格式化评论数据
  formatCommentData(comment, openid) {
    return comment.map(comment => {
      // 提取user_info中的数据
      const userInfo = comment.user_info || {};
      
      return {
        ...comment,
        // 确保这些字段存在
        id: comment.id,
        content: comment.content,
        openid: comment.openid || comment.user_id,
        
        // 处理头像和用户名 - 优先使用nickname和avatar字段，其次是user_info中的数据
        avatar: comment.avatar || userInfo.avatar || '/icons/avatar1.png',
        nickname: comment.nickname || userInfo.nickname || comment.user_name || '匿名用户',
        
        // 检查是否是当前用户和点赞状态
        isOwner: (comment.openid === openid) || (comment.user_id === openid),
        isLiked: Array.isArray(comment.liked_users) && openid ? comment.liked_users.includes(openid) : comment.liked || false,
        
        // 时间格式化
        relativeTime: comment.formattedTime || formatRelativeTime(comment.create_time) || '刚刚',
        
        // 确保这些字段有默认值
        like_count: comment.like_count || 0,
        reply_count: comment.reply_count || 0,
        reply_preview: comment.reply_preview || []
      };
    });
  },
  
  // 更新评论列表组件
  updateCommentList(commentList, comment, openid) {
    if (!commentList) return;
    
    const formattedComment = this.formatCommentData(comment, openid);
    
    // 确保加载状态结束
    commentList.setData({
      comments: formattedComment,
      total: this.data.postDetail.comment_count || 0,
      loading: false, // 确保加载状态关闭
      error: false,
      hasMore: formattedComment.length < (this.data.postDetail.comment_count || 0),
      currentOpenid: openid || ''
    });
  },

  // 显示消息提示
  showToast(message, type = 'none', duration = 2000) {
    // 首先尝试使用base-behavior的showToast方法
    if (typeof this.showToptips === 'function') {
      // 如果有weui-behavior中的showToptips方法，优先使用
      this.showToptips(message, type === 'success' ? 'success' : type === 'error' ? 'error' : 'info', duration);
    } else {
      // 退回到设置toptips数据的方式
      this.setData({
        toptipsShow: true,
        toptipsMsg: message || '',
        toptipsType: type === 'success' ? 'success' : type === 'error' ? 'error' : 'info'
      });
      
      setTimeout(() => {
        this.setData({ toptipsShow: false });
      }, duration);
    }
  },

  // 回复评论
  onReplyTap(e) {
    if (!this.checkLogin()) return;
    
    console.debug('点击回复按钮:', e.currentTarget.dataset);
    
    const { id, index, comment } = e.currentTarget.dataset;
    const commentData = comment || this.data.comments[index];
    
    if (!commentData) {
      console.debug('未找到评论数据');
      return;
    }
    
    this.setData({
      replyTo: commentData,
      focusComment: true
    });
    
    // 强制显示评论输入框
    this.forceShowCommentInput();
  },
  
  // 跳转到用户主页
  goToUserProfile(e) {
    const { userId } = e.detail || e.currentTarget.dataset;
    if (!userId) return;
    
    console.debug('跳转到用户主页:', userId);
    
    // 调用 nav.navigateTo 导航到用户主页
    this.navigateTo('/pages/user/profile/profile', { id: userId });
  },

  // 预览评论图片
  previewCommentImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    if (!urls || !current) return;
    
    wx.previewImage({
      urls,
      current
    });
  },
  
  // 点击评论
  onCommentLike(e) {
    if (!this.checkLogin()) return;
    
    const { id, index } = e.currentTarget.dataset;
    console.debug('点赞评论:', id, index);
    
    // TODO: 调用接口实现评论点赞
    ui.showToast('评论点赞功能暂未实现', { type: ToastType.INFO });
  },
  
  // 处理图片加载错误
  handleImageError(e) {
    console.debug('图片加载出错:', e);
    // 可以在这里设置默认图片
  },

  // 添加缺失但必要的方法
  viewMoreReplies(e) {
    const { commentId } = e.currentTarget.dataset;
    console.debug('查看更多回复:', commentId);
    // TODO: 实现查看更多回复功能
    ui.showToast('查看回复功能暂未实现', { type: ToastType.INFO });
  },
}); 