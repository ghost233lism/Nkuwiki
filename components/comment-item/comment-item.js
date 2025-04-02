const { formatTime, createApiClient } = require('../../utils/util');

// 创建评论API客户端
const commentApi = {
  likeComment: createApiClient('/api/wxapp/comment', {}).like,
  deleteComment: createApiClient('/api/wxapp/comment', {}).delete
};

Component({
  properties: {
    comment: {
      type: Object,
      value: {}
    },
    openid: {
      type: String,
      value: ''
    }
  },

  observers: {
    'comment, openid': function(comment, openid) {
      if (comment && comment.id && openid) {
        this.setData({
          formattedComment: this.formatComment(comment, openid)
        });
      }
    }
  },

  data: {
    formattedComment: null
  },

  methods: {
    // 格式化评论数据
    formatComment(comment, currentOpenid) {
      if (!comment) return null;
      
      return {
        ...comment,
        create_time_formatted: formatTime(comment.create_time),
        isLiked: Array.isArray(comment.liked_users) && comment.liked_users.includes(currentOpenid),
        isOwner: comment.openid === currentOpenid
      };
    },
    
    // 用户头像点击
    onTapUser() {
      const { openid } = this.data.formattedComment;
      if (openid) {
        wx.navigateTo({
          url: `/pages/profile/profile?id=${openid}`
        });
      }
    },
    
    // 点赞评论
    onTapLike() {
      const { id, isLiked } = this.data.formattedComment;
      
      if (isLiked) {
        this.unlikeComment(id);
      } else {
        this.likeComment(id);
      }
    },
    
    // 回复评论
    onTapReply() {
      const { id, nickname } = this.data.formattedComment;
      this.triggerEvent('reply', { id, nickname });
    },
    
    // 删除评论
    onTapDelete() {
      const { id, isOwner } = this.data.formattedComment;
      if (!isOwner) return;
      
      wx.showModal({
        title: '提示',
        content: '确定删除这条评论吗？',
        success: (res) => {
          if (res.confirm) {
            this.deleteComment(id);
          }
        }
      });
    },
    
    // 点赞评论
    likeComment(commentId) {
      commentApi.likeComment({
        comment_id: commentId,
        openid: this.data.openid
      })
        .then(res => {
          if (res.code === 0) {
            this.updateLikeStatus(true);
            this.triggerEvent('like', { id: commentId });
          } else {
            wx.showToast({
              title: res.message || '点赞失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          console.debug('点赞评论失败:', err);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        });
    },
    
    // 取消点赞评论
    unlikeComment(commentId) {
      commentApi.likeComment({
        comment_id: commentId,
        openid: this.data.openid
      })
        .then(res => {
          if (res.code === 0) {
            this.updateLikeStatus(false);
            this.triggerEvent('like', { id: commentId });
          } else {
            wx.showToast({
              title: res.message || '取消点赞失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          console.debug('取消点赞评论失败:', err);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        });
    },
    
    // 删除评论
    deleteComment(commentId) {
      commentApi.deleteComment(commentId)
        .then(res => {
          if (res.code === 0) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.triggerEvent('delete', { id: commentId });
          } else {
            wx.showToast({
              title: res.message || '删除失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          console.debug('删除评论失败:', err);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        });
    },
    
    // 更新点赞状态
    updateLikeStatus(isLiked) {
      const formattedComment = { ...this.data.formattedComment };
      formattedComment.isLiked = isLiked;
      
      // 更新点赞计数
      if (formattedComment.like_count !== undefined) {
        formattedComment.like_count = isLiked 
          ? formattedComment.like_count + 1 
          : Math.max(0, formattedComment.like_count - 1);
      }
      
      this.setData({ formattedComment });
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
      formattedComment.avatar = '/assets/icons/default-avatar.png';
      this.setData({ formattedComment });
    },
    
    // 图片加载失败
    onImageError(e) {
      console.debug('图片加载失败', e);
    }
  }
}); 