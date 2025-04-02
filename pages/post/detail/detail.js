const { ui, error, ToastType, storage } = require('../../../utils/util');
const baseBehavior = require('../../../behaviors/base-behavior');
const postBehavior = require('../../../behaviors/post-behavior');
const commentBehavior = require('../../../behaviors/comment-behavior');
const userBehavior = require('../../../behaviors/user-behavior');

Page({
  behaviors: [baseBehavior, postBehavior, commentBehavior, userBehavior],

  data: {
    id: '',
    post: null,
    replyTo: null,
    commentText: '',
    isEditMode: false,
    focusComment: false,
    loading: {
      post: false,
      comment: false
    }
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

    await this.loadPostDetail();
  },

  onPullDownRefresh() {
    this.loadPostDetail().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const { post, id } = this.data;
    return {
      title: post?.title || '分享帖子',
      path: `/pages/post/detail/detail?id=${id}`
    };
  },

  async loadPostDetail() {
    this.showLoading('加载中...');
    
    try {
      const post = await this.loadPostDetail(this.data.id);
      this.setData({ post });
      this.loadComments(this.data.id);
    } catch (err) {
      this.handleError(err, '加载帖子失败');
    } finally {
      this.hideLoading();
    }
  },

  // 帖子交互
  async onPostLike() {
    if (!this.checkLogin()) return;

    try {
      const result = await this.likePost(this.data.id);
      this.setData({
        'post.liked': result.is_liked,
        'post.like_count': result.like_count
      });
    } catch (err) {
      this.handleError(err, '点赞失败');
    }
  },

  async onPostFavorite() {
    if (!this.checkLogin()) return;

    try {
      const result = await this.favoritePost(this.data.id);
      this.setData({
        'post.favorited': result.is_favorited,
        'post.favorite_count': result.favorite_count
      });
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
        post: updatedPost,
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

  onCommentTap() {
    if (!this.checkLogin()) return;
    this.setData({ focusComment: true });
  },

  onCommentClose() {
    this.setData({
      focusComment: false,
      replyTo: null,
      commentText: ''
    });
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
      await this.submitComment(post_id, content, parentId);
      
      this.setData({
        commentText: '',
        replyTo: null,
        focusComment: false,
        'post.comment_count': (this.data.post?.comment_count || 0) + 1
      });

      this.showToast('评论成功', 'success');
      this.loadComments(this.data.id);
    } catch (err) {
      this.handleError(err, '评论失败');
    } finally {
      this.setData({ 'loading.comment': false });
      this.hideLoading();
    }
  },

  onCommentReply(e) {
    if (!this.checkLogin()) return;
    
    this.setData({
      replyTo: e.detail.comment,
      focusComment: true
    });
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
              'post.comment_count': Math.max(0, (that.data.post?.comment_count || 1) - 1)
            });

            that.showToast('删除成功', 'success');
            that.loadComments(that.data.id);
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
    const { urls, current } = e.detail;
    wx.previewImage({ urls, current });
  }
}); 