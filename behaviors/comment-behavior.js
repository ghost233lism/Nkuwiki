/**
 * 评论行为 - 处理评论相关操作
 */
const { formatRelativeTime, storage, ui, error, ToastType, createApiClient } = require('../utils/util');
const baseBehavior = require('./base-behavior');

// 创建评论API客户端
const commentApi = createApiClient('/api/wxapp/comment', {
  list: {
    method: 'GET',
    path: '/list',
    params: {
      openid: true,
      post_id: true,
      parent_id: false,
      limit: false,
      offset: false
    }
  },
  detail: {
    method: 'GET',
    path: '/detail',
    params: {
      openid: true,
      comment_id: true
    }
  },
  create: {
    method: 'POST',
    path: '',
    params: {
      openid: true,
      post_id: true,
      content: true,
      parent_id: false,
      image: false
    }
  },
  delete: {
    method: 'POST',
    path: '/delete',
    params: {
      openid: true,
      comment_id: true
    }
  },
  like: {
    method: 'POST',
    path: '/like',
    params: {
      openid: true,
      comment_id: true
    }
  }
});

module.exports = Behavior({
  behaviors: [baseBehavior],
  
  data: {
    // 评论列表
    comments: [],
    commentsLoading: false,
    commentsError: false,
    
    // 评论编辑
    commentContent: '',
    commenting: false,
    
    // 评论回复
    showReplyInput: false,
    replyToComment: null,
    replyContent: '',
    replying: false
  },
  
  methods: {
    // 加载评论列表
    async loadComments(postId, params = {}) {
      if (!postId) return;
      
      this.setData({ commentsLoading: true });
      
      try {
        const res = await commentApi.list({ 
          post_id: postId,
          openid: storage.get('openid'),
          ...params
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '获取评论失败');
        }
        
        // 格式化评论，添加相对时间
        const formattedComments = (res.data || []).map(comment => ({
          ...comment,
          formattedTime: formatRelativeTime(comment.create_time || comment.createTime)
        }));
        
        this.setData({ 
          comments: formattedComments,
          commentsLoading: false
        });
        
        return formattedComments;
      } catch (err) {
        console.debug('加载评论失败:', err);
        this.setData({ commentsLoading: false, commentsError: true });
        return [];
      }
    },
    
    // 获取评论详情
    async getCommentDetail(commentId) {
      try {
        const res = await commentApi.detail({ comment_id: commentId });
        
        if (res.code !== 200) {
          throw error.create(res.message || '获取评论详情失败');
        }
        
        return {
          ...res.data,
          formattedTime: formatRelativeTime(res.data.create_time || res.data.createTime)
        };
      } catch (err) {
        console.debug('获取评论详情失败:', err);
        return null;
      }
    },
    
    // 提交评论
    async submitComment(postId, content, parentId = null) {
      const commentText = content || this.data.commentContent;
      
      if (!commentText.trim()) {
        ui.showToast('请输入评论内容', { type: ToastType.ERROR });
        return null;
      }
      
      if (this.data.commenting) return null;
      
      this.setData({ commenting: true });
      
      try {
        const res = await commentApi.create({
          post_id: postId,
          content: commentText,
          parent_id: parentId,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '评论失败');
        }
        
        // 清空评论内容
        if (!content) {
          this.setData({ commentContent: '' });
        }
        
        ui.showToast('评论成功', { type: ToastType.SUCCESS });
        return res.data;
      } catch (err) {
        console.debug('提交评论失败:', err);
        ui.showToast(err.message || '评论失败', { type: ToastType.ERROR });
        return null;
      } finally {
        this.setData({ commenting: false });
      }
    },
    
    // 删除评论
    async deleteComment(commentId) {
      try {
        const res = await commentApi.delete({
          comment_id: commentId,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '删除评论失败');
        }
        
        ui.showToast('删除成功', { type: ToastType.SUCCESS });
        return true;
      } catch (err) {
        console.debug('删除评论失败:', err);
        ui.showToast(err.message || '删除失败', { type: ToastType.ERROR });
        return false;
      }
    },
    
    // 回复评论（显示回复框）
    showReply(e) {
      const { comment } = e.currentTarget.dataset;
      this.setData({
        showReplyInput: true,
        replyToComment: comment,
        replyContent: ''
      });
    },
    
    // 隐藏回复框
    hideReply() {
      this.setData({
        showReplyInput: false,
        replyToComment: null,
        replyContent: ''
      });
    },
    
    // 提交回复
    async submitReply() {
      if (!this.data.replyToComment || !this.data.replyToComment.id) {
        this.hideReply();
        return;
      }
      
      const postId = this.data.replyToComment.post_id;
      const parentId = this.data.replyToComment.id;
      
      if (this.data.replying) return;
      
      this.setData({ replying: true });
      
      const result = await this.submitComment(postId, this.data.replyContent, parentId);
      
      if (result) {
        this.hideReply();
        // 刷新评论列表
        this.loadComments(postId);
      }
      
      this.setData({ replying: false });
    },
    
    // 评论内容变化
    onCommentInput(e) {
      this.setData({
        commentContent: e.detail.value
      });
    },
    
    // 回复内容变化
    onReplyInput(e) {
      this.setData({
        replyContent: e.detail.value
      });
    }
  }
}); 