const { formatTime } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const commentBehavior = require('../../behaviors/commentBehavior');

Component({
  behaviors: [baseBehavior, commentBehavior],

  properties: {
    comment: {
      type: Object,
      value: {}
    },
    openid: {
      type: String,
      value: ''
    },
    postId: {
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
    formattedComment: null,
    isProcessing: {
      like: false,
      delete: false
    }
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
        this.navigateTo({
          url: `/pages/profile/profile?id=${openid}`
        });
      }
    },
    
    // 点赞评论
    onTapLike() {
      if (this.data.isProcessing.like) return;
      
      const { id, isLiked } = this.data.formattedComment;
      
      // 设置处理中状态
      this.setData({
        'isProcessing.like': true
      });
      
      // 更新UI状态（乐观更新）
      this.updateLikeStatus(!isLiked);
      
      // 使用commentBehavior的_toggleCommentLike方法
      this._toggleCommentLike(id)
        .then(res => {
          // 服务器返回的实际状态
          const serverIsLiked = res.data?.is_liked || false;
          const likeCount = res.data?.like_count || this.data.formattedComment.like_count || 0;
          
          // 以服务器返回为准更新状态
          this.updateLikeStatus(serverIsLiked, likeCount);
          
          // 触发事件通知父组件
          this.triggerEvent('like', { 
            id: id, 
            isLiked: serverIsLiked,
            likeCount: likeCount
          });
        })
        .catch(err => {
          console.error('评论点赞失败:', err);
          
          // 恢复原状态
          this.updateLikeStatus(isLiked);
          
          // 显示错误提示
          this.showToast('操作失败，请稍后重试', 'error');
        })
        .finally(() => {
          this.setData({
            'isProcessing.like': false
          });
        });
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
    onTapDelete() {
      if (this.data.isProcessing.delete) return;
      
      const { id, isOwner } = this.data.formattedComment;
      if (!isOwner) return;
      
      // 显示确认对话框
      this.showModal({
        title: '提示',
        content: '确定删除这条评论吗？',
        success: (res) => {
          if (res.confirm) {
            this.deleteComment(id);
          }
        }
      });
    },
    
    // 删除评论
    deleteComment(commentId) {
      // 设置处理中状态
      this.setData({
        'isProcessing.delete': true
      });
      
      // 使用commentBehavior的_deleteComment方法
      this._deleteComment(commentId)
        .then(res => {
          // 显示成功提示
          this.showToast('删除成功', 'success');
          
          // 触发事件通知父组件
          this.triggerEvent('delete', { 
            id: commentId,
            postId: this.data.postId
          });
        })
        .catch(err => {
          console.error('删除评论失败:', err);
          
          // 显示错误提示
          this.showToast('删除失败，请稍后重试', 'error');
        })
        .finally(() => {
          this.setData({
            'isProcessing.delete': false
          });
        });
    },
    
    // 更新点赞状态
    updateLikeStatus(isLiked, likeCount) {
      const formattedComment = { ...this.data.formattedComment };
      formattedComment.isLiked = isLiked;
      
      // 如果提供了点赞数则使用，否则根据当前状态计算
      if (likeCount !== undefined) {
        formattedComment.like_count = likeCount;
      } else if (formattedComment.like_count !== undefined) {
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
      formattedComment.avatar = '/icons/avatar1.png';
      this.setData({ formattedComment });
    },
    
    // 图片加载失败
    onImageError(e) {
      console.error('图片加载失败', e);
    }
  }
}); 