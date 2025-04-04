/**
 * 评论行为 - 处理评论列表加载、发布、删除、回复等
 */
const { storage, createApiClient } = require('../utils/util');
const baseBehavior = require('./baseBehavior');

// 创建评论API客户端
const commentApi = createApiClient('/api/wxapp/comment', {
  list:   { method: 'GET',  path: '/list',   params: { openid: true, post_id: true } }, // Required: post_id
  detail: { method: 'GET',  path: '/detail', params: { openid: true, comment_id: true } },
  create: { method: 'POST', path: '',        params: { openid: true, post_id: true, content: true } }, // Required: post_id, content
  delete: { method: 'POST', path: '/delete', params: { openid: true, comment_id: true } },
  like:   { method: 'POST', path: '/like',   params: { openid: true, comment_id: true } }
});

module.exports = Behavior({
  behaviors: [baseBehavior],
  
  data: {
    // 评论列表 (使用 baseBehavior 默认的 listData)
    listData: [],
    // 列表参数，主要存储 postId 和可能的 parentId
    listParam: {
      postId: null,
      parentId: null // 用于加载特定评论的回复列表
    },
    
    // 评论编辑/发布状态
    commentContent: '', // 用于顶级评论输入框
    commenting: false,  // 提交中状态
    
    // 回复相关状态
    showReplyInput: false,
    replyToComment: null, // 存储被回复的评论对象
    replyContent: '',     // 回复输入框内容
    replying: false,      // 回复提交中状态
  },
  
  methods: {
    // ==== 数据获取与分页 ====

    /**
     * 获取一页评论数据 (供 baseBehavior 的 getInitial/getMore 调用)
     * @param {number} page
     * @param {number} pageSize
     */
    async _getComment(page, pageSize) {
      const { postId, parentId } = this.data.listParam;
      if (!postId) throw new Error('缺少必要的帖子ID (postId)');
      console.debug(`commentBehavior _getComment: Fetching page ${page} for postId ${postId}` + (parentId ? ` parentId ${parentId}` : ''));

      const openid = storage.get('openid');
      const params = { post_id: postId, parent_id: parentId, page, limit: pageSize, openid };

      try {
        const res = await commentApi.list(params);
        if (res.code !== 200) throw new Error(res.message || '获取评论列表失败');
        const apiData = res.data || [];
        const total = res.pagination?.total || 0;
        return { list: apiData, total };
      } catch (err) {
         console.error('commentBehavior _getComment failed:', err);
         throw err;
      }
    },

    /**
     * 加载初始评论列表
     * @param {string} postId - 必需，帖子ID
     * @param {object} [params={}] - 其他列表参数，如 parent_id
     */
    async getInitialComment(postId, params = {}) {
      if (!postId) { console.error('getInitialComment: postId is required.'); return; }
      this.updateState({ listParam: { ...params, postId } });
      return this.getInitial(); // 使用 baseBehavior 默认 listData
    },

    /**
     * 加载更多评论/回复
     */
    async getMoreComment() {
      return this.getMore(); // 使用 baseBehavior 默认 listData
    },

    // ==== 评论操作 ====

    /**
     * 处理顶级评论输入框内容变化 (bindinput)
     */
    commentInput(e) {
      this.updateState({ commentContent: e.detail.value });
    },

    /**
     * 提交顶级评论 (通常由页面的提交按钮调用)
     */
    async submitTopComment() {
        const postId = this.data.listParam.postId;
        if (!postId) {
             console.error('submitTopComment: postId not found in listParam.');
             this.showToast('无法评论，缺少帖子信息', 'error');
             return;
        }
        // 调用内部创建方法，parentId 为 null
        await this._createComment(postId, this.data.commentContent, null);
    },

    /**
     * 创建新评论或回复 (内部方法)
     * @param {string} postId
     * @param {string} content
     * @param {string|null} [parentId=null]
     */
    async _createComment(postId, content, parentId = null) {
      if (!content?.trim()) {
        this.showToast('请输入内容', 'none');
        return null;
      }
      if (this.data.commenting || this.data.replying) return null;

      // 假设 _checkLogin 可用
      const isLoggedIn = await this._checkLogin();
      if (!isLoggedIn) return null;

      const openid = storage.get('openid');
      const isReply = !!parentId;
      const submittingState = isReply ? { replying: true } : { commenting: true };
      this.updateState(submittingState);
      this.showLoading(isReply ? '提交回复...' : '提交评论...');

      try {
        const res = await commentApi.create({ post_id: postId, content: content.trim(), parent_id: parentId, openid });
        if (res.code !== 200 || !res.data) throw new Error(res.message || (isReply ? '回复失败' : '评论失败'));

        this.showToast(isReply ? '回复成功' : '评论成功', 'success');
        if (isReply) { this.hideReplyInput(); } else { this.updateState({ commentContent: '' }); }

        // 刷新评论列表 (重新加载第一页)
        // 注意: 刷新时需要知道是刷新顶级列表还是回复列表
        const refreshParentId = isReply ? this.data.listParam.parentId : null;
        this.getInitialComment(postId, { parentId: refreshParentId });

        return res.data;
      } catch (err) {
        this.handleError(err, err.message || (isReply ? '回复失败' : '评论失败'));
        return null;
      } finally {
        const endSubmittingState = isReply ? { replying: false } : { commenting: false };
        this.updateState(endSubmittingState);
        this.hideLoading();
      }
    },

    /**
     * 删除评论
     * @param {string} commentId
     */
    async _deleteComment(commentId) {
      if (!commentId) return false;
      // 假设 _checkLogin 可用
      const isLoggedIn = await this._checkLogin();
      if (!isLoggedIn) return false;

      try {
        const confirmed = await this.showModal({ content: '确定要删除这条评论吗？' });
        if (!confirmed) return false;
        this.showLoading('删除中...');
        const openid = storage.get('openid');
        const res = await commentApi.delete({ comment_id: commentId, openid });
        if (res.code !== 200) throw new Error(res.message || '删除评论失败');
        this.showToast('删除成功', 'success');
        // 从本地列表移除
        const index = this.data.listData.findIndex(c => c.id === commentId);
        if (index > -1) {
          const newList = [...this.data.listData];
          newList.splice(index, 1);
          this.updateState({ listData: newList, empty: newList.length === 0 });
        }
        // TODO: 可能需要通知父组件更新评论数
        return true;
      } catch (err) {
        this.handleError(err, err.message || '删除评论失败');
        return false;
      } finally {
        this.hideLoading();
      }
    },

    /**
     * 切换评论点赞状态 (bindtap)
     * @param {Event} e
     */
     async _toggleCommentLike(e) {
        const { commentId } = e.currentTarget.dataset;
        if (!commentId) return;
        // 假设 _checkLogin 可用
        const isLoggedIn = await this._checkLogin();
        if (!isLoggedIn) return;
        // TODO: 添加防重点击状态
        try {
            const openid = storage.get('openid');
            const res = await commentApi.like({ comment_id: commentId, openid });
            if (res.code !== 200 || !res.data) throw new Error(res.message || '操作失败');
            // 更新本地状态
            const index = this.data.listData.findIndex(c => c.id === commentId);
            if (index > -1) {
                 const updatedComment = { ...this.data.listData[index], is_liked: res.data.status === 'liked', like_count: res.data.like_count };
                 this.updateState({ [`listData[${index}]`]: updatedComment });
            }
        } catch (err) {
            this.handleError(err, err.message || '操作失败');
        } finally {
            // TODO: 清除防重点击状态
        }
     },

    // ==== 回复 UI 与操作 ====

    /**
     * 显示回复输入框 (bindtap)
     * @param {Event} e
     */
    showReplyInput(e) {
      const { comment } = e.currentTarget.dataset;
      if (!comment) return;
      this.updateState({ showReplyInput: true, replyToComment: comment, replyContent: '' });
      // TODO: 考虑聚焦输入框
    },

    /**
     * 隐藏回复输入框
     */
    hideReplyInput() {
      this.updateState({ showReplyInput: false, replyToComment: null, replyContent: '' });
    },

    /**
     * 处理回复输入框内容变化 (bindinput)
     */
    replyInput(e) {
      this.updateState({ replyContent: e.detail.value });
    },

    /**
     * 提交回复 (通常由回复输入框的发送按钮调用)
     */
    async submitReply() {
      const { replyToComment, replyContent } = this.data;
      if (!replyToComment?.post_id || !replyToComment?.id) {
        this.hideReplyInput();
        return;
      }
      // 调用内部创建方法，传入父评论 ID
      await this._createComment(replyToComment.post_id, replyContent, replyToComment.id);
    },

    // ==== 其他 ====

    /**
     * 获取单条评论详情 (可选)
     * @param {string} commentId
     */
    async _getCommentDetail(commentId) {
      if (!commentId) return null;
      this.showLoading('加载评论...');
      try {
        const res = await commentApi.detail({ comment_id: commentId, openid: storage.get('openid') });
        if (res.code !== 200) throw new Error(res.message || '获取评论详情失败');
        return res.data; // 直接返回原始数据
      } catch (err) {
        this.handleError(err, '获取评论详情失败');
        return null;
      } finally {
        this.hideLoading();
      }
    },
  }
}); 