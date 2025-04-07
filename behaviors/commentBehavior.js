/**
 * 评论行为 - 处理评论列表加载、发布、删除、回复等
 */
const { storage, createApiClient } = require('../utils/util');

// 创建评论API客户端
const commentApi = createApiClient('/api/wxapp/comment', {
  list:   { method: 'GET',  path: '/list',   params: { openid: true, post_id: true } }, // Required: post_id
  detail: { method: 'GET',  path: '/detail', params: { openid: true, comment_id: true } },
  create: { method: 'POST', path: '',        params: { openid: true, post_id: true, content: true } }, // Required: post_id, content
  delete: { method: 'POST', path: '/delete', params: { openid: true, comment_id: true } },
  like:   { method: 'POST', path: '/like',   params: { openid: true, comment_id: true } }
});

module.exports = Behavior({
  methods: {
    /**
     * 获取评论列表
     * @param {string} postId - 帖子ID
     * @param {object} [options={}] - 可选参数
     * @param {string} [options.parentId] - 父评论ID，获取回复列表时使用
     * @param {number} [options.page=1] - 页码
     * @param {number} [options.page_size=20] - 每页数量
     * @returns {Promise<Object|null>} 评论列表和分页信息
     */
    async _getCommentList(postId, options = {}) {
      if (!postId) return null;
      
      const { parentId, page = 1, page_size = 20, limit } = options;
      console.debug(`获取评论: postId=${postId}` + (parentId ? ` parentId=${parentId}` : ''));

      const openid = storage.get('openid');
      const params = { 
        post_id: postId, 
        parent_id: parentId, 
        page, 
        page_size: page_size || limit || 20,  // 优先使用page_size，兼容旧的limit参数
        openid 
      };

      try {
        const res = await commentApi.list(params);
        if (res.code !== 200) throw new Error(res.message || '获取评论列表失败');
        
        // 标准API响应格式
        if (res.data && res.pagination) {
          return {
            data: res.data,
            pagination: res.pagination
          };
        }
        
        // 处理新的响应格式：直接使用data数组作为评论列表
        if (Array.isArray(res.data)) {
          const total = res.pagination?.total || res.total || res.data.length;
          return {
            data: res.data,
            pagination: {
              total: total,
              page: page,
              page_size: params.page_size,
              total_pages: Math.ceil(total / params.page_size),
              has_more: (page * params.page_size) < total
            }
          };
        }
        
        // 兼容旧格式
        const list = res.data?.list || [];
        const total = res.pagination?.total || res.data?.total || list.length;
        return { 
          data: list,
          pagination: {
            total: total,
            page: page,
            page_size: params.page_size,
            total_pages: Math.ceil(total / params.page_size),
            has_more: (page * params.page_size) < total
          }
        };
      } catch (err) {
        console.debug('获取评论失败:', err);
        return null;
      }
    },

    /**
     * 获取单条评论详情
     * @param {string} commentId - 评论ID
     * @returns {Promise<object|null>} 评论详情
     */
    async _getCommentDetail(commentId) {
      if (!commentId) return null;
      
      try {
        const res = await commentApi.detail({ 
          comment_id: commentId, 
          openid: storage.get('openid') 
        });
        
        if (res.code !== 200) throw new Error(res.message || '获取评论详情失败');
        return res.data;
      } catch (err) {
        console.debug('获取评论详情失败:', err);
        return null;
      }
    },

    /**
     * 创建评论或回复
     * @param {string} postId - 帖子ID
     * @param {string} content - 评论内容
     * @param {string} [parentId] - 父评论ID，回复时使用
     * @returns {Promise<object|null>} 创建的评论
     */
    async _createComment(postId, content, parentId = null) {
      if (!postId) return null;
      if (!content?.trim()) return null;
      
      const openid = storage.get('openid');
      if (!openid) return null;

      try {
        const res = await commentApi.create({ 
          post_id: postId, 
          content: content.trim(), 
          parent_id: parentId, 
          openid 
        });
        
        if (res.code !== 200) {
          throw new Error(res.message || '评论失败');
        }
        
        // 处理新的响应格式，从details中获取comment_id
        if (res.details?.comment_id) {
          // 如果details中有comment_id，创建一个简单的评论对象返回
          return {
            id: res.details.comment_id,
            post_id: postId,
            content: content.trim(),
            parent_id: parentId,
            openid,
            // 添加创建时间
            create_time: new Date().toISOString()
          };
        } else if (res.data) {
          // 兼容旧格式，如果data中有完整评论数据
          return res.data;
        }
        
        throw new Error('评论创建成功但未返回评论数据');
      } catch (err) {
        console.debug('创建评论失败:', err);
        return null;
      }
    },

    /**
     * 删除评论
     * @param {string} commentId - 评论ID
     * @returns {Promise<boolean>} 是否删除成功
     */
    async _deleteComment(commentId) {
      if (!commentId) return false;
      
      const openid = storage.get('openid');
      if (!openid) return false;

      try {
        const res = await commentApi.delete({ 
          comment_id: commentId, 
          openid 
        });
        
        if (res.code !== 200) throw new Error(res.message || '删除评论失败');
        return true;
      } catch (err) {
        console.debug('删除评论失败:', err);
        return false;
      }
    },

    /**
     * 点赞/取消点赞评论
     * @param {string} commentId - 评论ID
     * @returns {Promise<{status: string, like_count: number}|null>} 点赞结果
     */
    async _toggleCommentLike(commentId) {
      if (!commentId) return null;
      
      const openid = storage.get('openid');
      if (!openid) return null;

      try {
        const res = await commentApi.like({ 
          comment_id: commentId, 
          openid 
        });
        
        if (res.code !== 200 || !res.data) throw new Error(res.message || '操作失败');
        return res.data;
      } catch (err) {
        console.debug('评论点赞操作失败:', err);
        return null;
      }
    }
  }
}); 