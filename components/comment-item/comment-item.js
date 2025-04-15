const { formatTime, formatRelativeTime, storage } = require('../../utils/util');
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
      
      // 使用formatRelativeTime处理日期，这个函数对ISO日期格式更友好
      let formattedTime = '';
      if (comment.create_time) {
        try {
          formattedTime = formatRelativeTime(comment.create_time);
        } catch (err) {
          console.error('日期格式化错误:', err);
          formattedTime = '未知时间';
        }
      } else {
        formattedTime = '刚刚';
      }
      
      // 处理图片字段，可能是JSON字符串
      let imageArray = [];
      if (comment.image) {
        try {
          // 如果是字符串，尝试解析JSON
          if (typeof comment.image === 'string') {
            const parsed = JSON.parse(comment.image);
            imageArray = Array.isArray(parsed) ? parsed : [];
          }
          // 如果已经是数组，直接使用
          else if (Array.isArray(comment.image)) {
            imageArray = comment.image;
          }
          
          // 过滤掉空字符串或无效URL
          imageArray = imageArray.filter(url => url && typeof url === 'string' && url.trim() !== '');
        } catch (err) {
          console.debug('图片解析错误:', err);
          imageArray = [];
        }
      }
      
      return {
        ...comment,
        create_time_formatted: formattedTime,
        image: imageArray, // 用解析后的数组替换原始字段
        isLiked: Array.isArray(comment.liked_users) && comment.liked_users.includes(openid),
        isOwner: comment.openid === openid
      };
    },
    
    // 点击头像或用户名
    onTapUser() {
      const { openid } = this.data.formattedComment;
      if (!openid) return;
      
      // 触发用户点击事件，让父组件处理导航
      this.triggerEvent('user', { userId: openid });
    },
    
    // 点赞评论
    async onTapLike() {
      const { id } = this.data.formattedComment;
      if (!id) return;
      
      // 防止重复点击
      if (this.data._isLiking) return;
      this.data._isLiking = true;
      
      try {
        // 触发点赞事件，由父组件处理API调用
        this.triggerEvent('like', { id });
      } catch (err) {
        console.error('点赞评论失败:', err);
      } finally {
        setTimeout(() => {
          this.data._isLiking = false;
        }, 500);
      }
    },
    
    // 回复评论
    onTapReply() {
      const { id, nickname } = this.data.formattedComment;
      
      // 触发回复事件
      this.triggerEvent('reply', { 
        commentId: id, 
        nickname: nickname
      });
    },
    
    // 删除评论
    onTapDelete() {
      const { id } = this.data.formattedComment;
      if (!id) return;
      
      // 触发删除事件
      this.triggerEvent('delete', { id });
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