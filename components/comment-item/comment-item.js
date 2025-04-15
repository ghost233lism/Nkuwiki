const { formatTime, storage } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const commentBehavior = require('../../behaviors/commentBehavior');

Component({
  behaviors: [baseBehavior, commentBehavior],

  properties: {
    comment: {
      type: Object,
      value: null
    },
    showActions: {
      type: Boolean,
      value: true
    }
  },

  observers: {
    'comment': function(comment) {
      if (!comment || !comment.id) return;
      
      this.setData({
        formattedComment: this.formatComment(comment)
      });
    }
  },

  data: {
    formattedComment: null,
    isProcessing: {
      like: false,
      delete: false
    },
    _isLiking: false
  },

  methods: {
    // 格式化评论数据
    formatComment(comment) {
      if (!comment) return null;
      
      const openid = storage.get('openid');
      return {
        ...comment,
        create_time_formatted: formatTime(comment.create_time),
        isLiked: Array.isArray(comment.liked_users) && comment.liked_users.includes(openid),
        isOwner: comment.openid === openid
      };
    },
    
    // 点击头像或用户名
    onUserTap() {
      const { openid } = this.data.formattedComment;
      if (!openid) return;
      
      wx.navigateTo({
        url: `/pages/profile/profile?id=${openid}`,
        fail: () => {
          storage.set('temp_profile_openid', openid);
          wx.redirectTo({
            url: `/pages/profile/profile?id=${openid}`
          });
        }
      });
    },
    
    // 点赞评论
    async onLikeTap() {
      const { id } = this.data.formattedComment;
      if (!id) return;
      
      const openid = storage.get('openid');
      if (!openid) {
        this.showToast('请先登录', 'error');
        return;
      }
      
      try {
        await this._toggleCommentLike(id);
      } catch (err) {
        console.error('点赞评论失败:', err);
        this.showToast('点赞失败', 'error');
      }
    },
    
    // 回复评论
    onTapReply() {
      const { id, nickname } = this.data.formattedComment;
      // 生成回复前缀
      const replyPrefix = `回复 @${nickname}: `;
      
      this.triggerEvent('reply', { 
        commentId: id, 
        replyPrefix: replyPrefix,
        nickname: nickname
      });
    },
    
    // 删除评论
    async onDeleteTap() {
      const { id } = this.data.formattedComment;
      if (!id) return;
      
      const openid = storage.get('openid');
      if (!openid) {
        this.showToast('请先登录', 'error');
        return;
      }
      
      try {
        const confirmed = await this.showModal({
          title: '确认删除',
          content: '确定要删除这条评论吗？',
          confirmText: '删除'
        });
        
        if (confirmed) {
          await this._deleteComment(id);
          this.triggerEvent('delete', { id });
        }
      } catch (err) {
        console.error('删除评论失败:', err);
        this.showToast('删除失败', 'error');
      }
    },
    
    // 预览图片
    onPreviewImage(e) {
      const { current } = e.currentTarget.dataset;
      const { image } = this.data.formattedComment;
      
      if (image && image.length > 0) {
        wx.previewImage({
          current,
          urls: image
        });
      }
    },
    
    // 头像加载失败
    onAvatarError() {
      const formattedComment = { ...this.data.formattedComment };
      formattedComment.avatar = '/icons/avatar1.png';
      this.setData({ formattedComment });
    },
    
    // 图片加载失败
    onImageError(e) {
      console.error('图片加载失败', e);
    }
  }
}); 