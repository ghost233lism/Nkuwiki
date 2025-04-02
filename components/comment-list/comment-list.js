Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 评论数据数组
    comments: {
      type: Array,
      value: [],
      observer: function(newVal) {
        console.debug(`评论列表组件接收到新的评论数据: ${newVal ? newVal.length : 0}条`);
      }
    },
    // 评论总数
    total: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        console.debug(`评论列表组件接收到新的评论总数: ${newVal}`);
      }
    },
    // 是否正在加载
    loading: {
      type: Boolean,
      value: false
    },
    // 是否加载出错
    error: {
      type: Boolean,
      value: false
    },
    // 错误信息
    errorMsg: {
      type: String,
      value: '加载失败'
    },
    // 是否有更多评论
    hasMore: {
      type: Boolean,
      value: false
    },
    // 当前用户ID
    currentOpenid: {
      type: String,
      value: ''
    },
    // 是否允许回复
    allowReply: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    debug: {
      commentsLength: 0
    }
  },

  lifetimes: {
    attached() {
      console.debug('评论列表组件已挂载');
    },
    ready() {
      console.debug('评论列表组件已准备好，评论数:', this.properties.comments.length);
      // 更新调试信息
      this.setData({
        'debug.commentsLength': this.properties.comments.length
      });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 重试加载评论
    retry() {
      console.debug('重试加载评论');
      this.triggerEvent('retry');
    },

    // 加载更多评论
    loadMore() {
      console.debug('加载更多评论');
      this.triggerEvent('loadmore');
    },
    
    // 点赞评论
    handleLike(e) {
      const { id, index } = e.currentTarget.dataset;
      this.triggerEvent('like', { id, index });
    },
    
    // 回复评论
    handleReply(e) {
      const { id, index } = e.currentTarget.dataset;
      // 获取完整的评论对象
      const comment = this.data.comments[index];
      if (!comment) return;
      
      this.triggerEvent('reply', { 
        id,
        index,
        comment
      });
    },
    
    // 查看更多回复
    viewMoreReplies(e) {
      const { commentId } = e.currentTarget.dataset;
      this.triggerEvent('viewreplies', { commentId });
    },
    
    // 跳转到用户主页
    goToUserProfile(e) {
      const { userId } = e.currentTarget.dataset;
      this.triggerEvent('usertap', { userId });
    },
    
    // 预览评论图片
    previewCommentImage(e) {
      const { urls, current } = e.currentTarget.dataset;
      wx.previewImage({
        urls,
        current
      });
    },
    
    // 图片加载出错处理
    handleImageError(e) {
      console.debug('评论图片加载出错:', e);
      // 可以在这里设置默认图片
    },
    
    // 删除评论
    deleteComment(e) {
      const { id, index } = e.currentTarget.dataset;
      this.triggerEvent('delete', { id, index });
    },
    
    // 阻止冒泡
    stopPropagation() {
      // 阻止事件冒泡
    }
  }
}) 