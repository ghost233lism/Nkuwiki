const behaviors = require('../../behaviors/index');

Component({
  /**
   * 组件的属性列表
   */
  behaviors: [
    behaviors.baseBehavior,
    behaviors.commentBehavior,
    behaviors.authBehavior
  ],
  
  properties: {
    // 帖子ID
    postId: {
      type: String,
      value: '',
      observer: function(newVal) {
        if (newVal) {
          this.loadComments();
        }
      }
    },
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
    },
    page: 1,
    limit: 10,
    // 评论输入相关
    commentText: '',
    commentFocus: false,
    replyTo: null,
    isSubmitting: false
  },

  lifetimes: {
    attached() {
      console.debug('评论列表组件已挂载');
      
      // 自动获取当前用户openid
      if (!this.properties.currentOpenid) {
        const openid = this.getStorage('openid');
        if (openid) {
          this.setData({ currentOpenid: openid });
        }
      }
    },
    ready() {
      console.debug('评论列表组件已准备好，评论数:', this.properties.comments.length);
      // 更新调试信息
      this.setData({
        'debug.commentsLength': this.properties.comments.length
      });
      
      // 如果提供了postId，自动加载评论
      if (this.properties.postId) {
        this.loadComments();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 加载评论
    loadComments() {
      const { postId } = this.properties;
      const { page, limit } = this.data;
      
      if (!postId) {
        console.debug('未提供帖子ID，不加载评论');
        return Promise.reject(new Error('未提供帖子ID'));
      }
      
      this.setData({ loading: true, error: false, errorMsg: '' });
      
      return this._getCommentList(postId, { page, limit })
        .then(result => {
          if (result) {
            const { list: comments, total } = result;
            
            // 格式化评论数据
            const formattedComments = comments && comments.length ? comments.map(comment => this._formatCommentData(comment)) : [];
            
            // 更新评论列表和分页信息
            this.setData({
              comments: this.data.page === 1 ? formattedComments : [...this.properties.comments, ...formattedComments],
              hasMore: (this.data.page * this.data.limit) < total,
              total: total || 0
            });
          } else {
            throw new Error('获取评论失败');
          }
        })
        .catch(error => {
          this.setData({ error: true, errorMsg: error.message || '加载评论失败' });
          return Promise.reject(error);
        })
        .finally(() => {
          this.setData({ loading: false });
        });
    },
    
    // 刷新评论列表
    refresh() {
      this.setData({ page: 1, comments: [] }, () => {
        this.loadComments();
      });
    },
    
    // 重试加载评论
    retry() {
      console.debug('重试加载评论');
      this.loadComments();
      this.triggerEvent('retry');
    },

    // 加载更多评论
    loadMore() {
      console.debug('加载更多评论');
      if (this.properties.loading || !this.properties.hasMore) return;
      
      this.setData({ page: this.data.page + 1 }, () => {
        this.loadComments();
      });
      
      this.triggerEvent('loadmore');
    },
    
    // 点赞评论
    handleLike(e) {
      const { id, index } = e.currentTarget.dataset;
      const comment = this.properties.comments[index];
      
      if (!comment) return;
      
      const isLiked = comment.isLiked;
      
      // 调用评论行为中的点赞/取消点赞方法
      this._toggleCommentLike(id)
        .then(result => {
          if (!result) throw new Error('操作失败');
          
          // 更新评论点赞状态
          const comments = [...this.properties.comments];
          comments[index] = {
            ...comment,
            isLiked: result.status === 'liked',
            like_count: result.like_count || comment.like_count || 0
          };
          
          this.setData({ comments });
          this.showToast(result.status === 'liked' ? '已点赞' : '已取消点赞', 'success');
        })
        .catch(error => {
          this.showToast('操作失败: ' + (error.message || '未知错误'), 'error');
        });
    },
    
    // 格式化评论数据
    _formatCommentData(comment) {
      if (!comment) return null;
      
      // 格式化时间
      const createTime = comment.create_time ? new Date(comment.create_time) : new Date();
      const now = new Date();
      
      // 计算相对时间
      const diffMinutes = Math.floor((now - createTime) / (1000 * 60));
      let relativeTime = '';
      
      if (diffMinutes < 1) {
        relativeTime = '刚刚';
      } else if (diffMinutes < 60) {
        relativeTime = `${diffMinutes}分钟前`;
      } else if (diffMinutes < 24 * 60) {
        relativeTime = `${Math.floor(diffMinutes / 60)}小时前`;
      } else if (diffMinutes < 30 * 24 * 60) {
        relativeTime = `${Math.floor(diffMinutes / (24 * 60))}天前`;
      } else {
        // 超过30天显示具体日期
        const year = createTime.getFullYear();
        const month = createTime.getMonth() + 1;
        const day = createTime.getDate();
        relativeTime = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
      }
      
      return {
        ...comment,
        relativeTime,
        // 检查是否是当前用户的评论
        isOwner: this.properties.currentOpenid && comment.openid === this.properties.currentOpenid
      };
    },
    
    // 回复评论
    handleReply(e) {
      // 先检查登录状态
      if (!this._checkLogin()) return;
      
      const { id, index } = e.currentTarget.dataset;
      // 获取完整的评论对象
      const comment = this.properties.comments[index];
      if (!comment) return;
      
      const replyPrefix = comment.nickname ? `回复 @${comment.nickname}: ` : '';
      
      // 设置回复状态
      this.setData({
        commentText: replyPrefix,
        commentFocus: true,
        replyTo: {
          commentId: id,
          nickname: comment.nickname
        }
      });
    },
    
    // 删除评论
    deleteComment(e) {
      const { id, index } = e.currentTarget.dataset;
      
      this.showModal({
        title: '确认删除',
        content: '确定要删除这条评论吗？',
        success: res => {
          if (res.confirm) {
            // 调用评论行为中的删除评论方法
            this._deleteComment(id)
              .then(success => {
                if (!success) throw new Error('删除失败');
                
                // 更新评论列表
                const comments = [...this.properties.comments];
                comments.splice(index, 1);
                
                this.setData({ 
                  comments,
                  total: Math.max(0, this.properties.total - 1)
                });
                
                this.showToast('删除成功', 'success');
                
                // 通知父组件更新评论计数
                this.triggerEvent('delete', { 
                  id, 
                  index,
                  postId: this.properties.postId
                });
              })
              .catch(error => {
                this.showToast('删除失败: ' + (error.message || '未知错误'), 'error');
              });
          }
        }
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
      console.error('评论图片加载出错:', e);
      // 可以在这里设置默认图片
    },
    
    // 阻止冒泡
    stopPropagation() {
      // 阻止事件冒泡
    },
    
    // 评论输入事件
    onCommentInput(e) {
      this.setData({
        commentText: e.detail.value
      });
    },
    
    // 评论获取焦点
    onCommentFocus() {
      // 检查用户登录
      this._checkLogin();
    },
    
    // 清除评论内容
    clearComment() {
      this.setData({
        commentText: '',
        replyTo: null
      });
    },
    
    // 取消回复
    cancelReply() {
      this.setData({
        commentText: '',
        replyTo: null,
        commentFocus: false
      });
    },
    
    // 提交评论
    submitComment() {
      const { commentText, replyTo } = this.data;
      const { postId } = this.properties;
      
      // 验证评论内容
      if (!commentText.trim()) {
        this.showToast('评论内容不能为空', 'error');
        return;
      }
      
      // 检查用户登录状态
      if (!this._checkLogin()) return;
      
      // 检查是否已提供帖子ID
      if (!postId) {
        this.showToast('缺少帖子ID', 'error');
        return;
      }
      
      // 设置提交中状态
      this.setData({ isSubmitting: true });
      
      // 处理回复情况，提取实际内容
      let content = commentText;
      let parentId = null;
      
      if (replyTo) {
        // 移除回复前缀
        const replyPrefix = `回复 @${replyTo.nickname}: `;
        content = content.replace(replyPrefix, '');
        parentId = replyTo.commentId;
      }
      
      // 提交评论
      this._createComment(postId, content, parentId)
        .then(result => {
          if (!result) throw new Error('评论失败');
          
          // 成功提示
          this.showToast('评论成功', 'success');
          
          // 清空输入框
          this.setData({
            commentText: '',
            replyTo: null,
            commentFocus: false
          });
          
          // 刷新评论列表
          this.refresh();
          
          // 通知父组件更新评论计数
          this.triggerEvent('commentAdded', {
            postId: this.properties.postId,
            comment: result
          });
        })
        .catch(error => {
          this.showToast('评论失败: ' + (error.message || '未知错误'), 'error');
        })
        .finally(() => {
          this.setData({ isSubmitting: false });
        });
    }
  }
})