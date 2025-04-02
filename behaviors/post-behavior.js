/**
 * 帖子行为 - 统一帖子详情和列表的处理逻辑
 */
const { formatRelativeTime, storage, ui, error, ToastType, createApiClient, parseJsonField, parseImageUrl, parseUrl } = require('../utils/util');
const baseBehavior = require('./base-behavior');
const commentBehavior = require('./comment-behavior');

// 创建帖子API客户端
const postApi = createApiClient('/api/wxapp/post', {
  list: {
    method: 'GET',
    path: '/list',
    params: {
      openid: true,
      page: false,
      limit: false,
      keyword: false,
      category: false,
      tag: false
    }
  },
  detail: {
    method: 'GET',
    path: '/detail',
    params: {
      openid: true,
      post_id: true
    }
  },
  like: {
    method: 'POST',
    path: '/like',
    params: {
      openid: true,
      post_id: true
    }
  },
  favorite: {
    method: 'POST',
    path: '/favorite',
    params: {
      openid: true,
      post_id: true
    }
  },
  status: {
    method: 'GET',
    path: '/status',
    params: {
      openid: true,
      post_id: true
    }
  },
  create: {
    method: 'POST',
    path: '',
    params: {
      openid: true,
      title: true,
      content: true,
      category: false,
      tag: false,
      image: false,
      is_public: false,
      allow_comment: false,
      wiki_knowledge: false
    }
  },
  delete: {
    method: 'POST',
    path: '/delete',
    params: {
      openid: true,
      post_id: true
    }
  }
});

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
  }
});

module.exports = Behavior({
  behaviors: [baseBehavior, commentBehavior],
  
  data: {
    // 帖子列表相关
    post: [],
    postLoading: false,
    postError: false,
    postErrorMsg: '',
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    },
    
    // 帖子详情相关
    postDetail: null,
    postId: '',
    postDetailLoading: false,
    postDetailError: false,
    postDetailErrorMsg: '',
    
    // 评论相关
    comment: [],
    commenting: false,
    commentContent: '',
    
    // 操作状态
    isLiking: false,
    isFavoriting: false
  },
  
  methods: {
    // ==== 帖子列表相关方法 ====
    
    // 格式化帖子列表
    formatPostList(posts, currentUserOpenid) {
      if (!Array.isArray(posts)) return [];
      
      return posts.map(post => this.formatPost(post, currentUserOpenid));
    },
    
    // 格式化单个帖子
    formatPost(post, currentUserOpenid) {
      if (!post) return null;
      
      // 处理图片和标签
      const image = parseImageUrl(post.image);
      const tag = parseJsonField(post.tag, []);
      
      // 解析头像URL
      let avatarUrl = '';
      if (post.avatar) {
        avatarUrl = parseUrl(post.avatar);
      } else if (post.user_info && post.user_info.avatar) {
        avatarUrl = parseUrl(post.user_info.avatar);
      }
      
      // 构建用户信息
      const user_info = {
        id: post.openid,
        openid: post.openid,
        nickname: post.nickname || (post.user_info ? post.user_info.nickname : '匿名用户'),
        avatar: avatarUrl || '/icons/avatar1.png'
      };
      
      console.debug('帖子数据处理:', {
        原头像: post.avatar,
        解析后头像: avatarUrl,
        用户名: user_info.nickname
      });
      
      // 判断是否已点赞或收藏
      const isLiked = Array.isArray(post.liked_users) && 
                      post.liked_users.includes(currentUserOpenid);
      
      const isFavorited = Array.isArray(post.favorite_users) && 
                          post.favorite_users.includes(currentUserOpenid);
      
      return {
        ...post,
        // 格式化用户信息
        user_info,
        // 格式化图片和标签，使用单数形式
        image,
        tag,
        // 是否点赞和收藏
        is_liked: isLiked,
        is_favorited: isFavorited,
        // 格式化时间，使用create_time
        created_time_formatted: formatRelativeTime(post.create_time || post.created_time),
        // 是否是自己的帖子
        is_mine: post.openid === currentUserOpenid,
        // 确保计数为数字
        view_count: parseInt(post.view_count || 0),
        like_count: parseInt(post.like_count || 0),
        comment_count: parseInt(post.comment_count || 0),
        favorite_count: parseInt(post.favorite_count || 0)
      };
    },
    
    // 查找帖子索引
    findPostIndex(postId, posts) {
      if (!Array.isArray(posts)) return -1;
      return posts.findIndex(post => post.id === postId);
    },
    
    // 批量获取帖子状态（点赞、收藏等）
    async getBatchPostStatus(postIds) {
      if (!Array.isArray(postIds) || postIds.length === 0) {
        return null;
      }
      
      const openid = storage.get('openid');
      if (!openid) return null;
      
      try {
        // 将帖子ID数组转换为逗号分隔的字符串
        const postIdStr = postIds.join(',');
        
        console.debug('批量获取帖子状态:', { post_ids: postIdStr, count: postIds.length });
        const res = await postApi.status({
          post_id: postIdStr,
          openid
        });
        
        console.debug('post/status API返回:', {
          code: res.code,
          message: res.message,
          数据类型: res.data ? typeof res.data : '无数据',
          是否数组: res.data ? Array.isArray(res.data) : false,
          是否对象: res.data ? (typeof res.data === 'object' && !Array.isArray(res.data)) : false,
          数据样例: res.data ? (typeof res.data === 'object' ? 
                             (Array.isArray(res.data) ? 
                                (res.data.length > 0 ? res.data[0] : '空数组') : 
                                Object.keys(res.data).length > 0 ? 
                                  { 键: Object.keys(res.data)[0], 值: res.data[Object.keys(res.data)[0]] } : 
                                  '空对象') : 
                             String(res.data).substring(0, 100)) : '无数据'
        });
        
        if (res.code !== 200 || !res.data) {
          console.debug('批量获取帖子状态失败:', res.message);
          return null;
        }
        
        return res.data;
      } catch (err) {
        console.debug('批量获取帖子状态请求失败:', err);
        return null;
      }
    },
    
    // 批量更新帖子状态
    async updateBatchPostStatus(postList) {
      if (!Array.isArray(postList) || postList.length === 0) {
        return;
      }
      
      const openid = storage.get('openid');
      if (!openid) {
        console.debug('updateBatchPostStatus: 用户未登录');
        return;
      }
      
      // 提取帖子ID列表
      const postIds = postList.map(post => post.id).filter(id => id);
      if (postIds.length === 0) {
        return;
      }
      
      try {
        // 批量获取状态
        const statusData = await this.getBatchPostStatus(postIds);
        if (!statusData) {
          console.debug('批量获取帖子状态返回为空');
          return;
        }
        
        console.debug('获取到的帖子状态数据类型:', typeof statusData, 'isArray:', Array.isArray(statusData));
        
        // 创建帖子状态映射
        let statusMap = {};
        
        // 处理不同格式的返回
        if (Array.isArray(statusData)) {
          // 如果是数组格式: [{post_id: "1", is_liked: true}, ...]
          statusData.forEach(item => {
            if (item && item.post_id) {
              statusMap[item.post_id] = item;
            }
          });
          console.debug('数组格式状态数据处理完成，键数量:', Object.keys(statusMap).length);
        } else if (typeof statusData === 'object') {
          // 如果是对象格式: {"1": {is_liked: true}, ...}
          statusMap = statusData;
          console.debug('对象格式状态数据直接使用，键数量:', Object.keys(statusMap).length);
        } else {
          console.debug('无法识别的状态数据格式:', statusData);
          return;
        }
        
        // 更新列表中所有帖子的状态
        const updatedPostList = this.data.post.map(post => {
          const postId = post.id;
          if (!postId) return post;
          
          const status = statusMap[postId];
          
          if (status) {
            console.debug(`更新帖子${postId}状态:`, {
              原状态: { is_liked: post.is_liked, is_favorited: post.is_favorited },
              新状态: { is_liked: status.is_liked, is_favorited: status.is_favorited }
            });
            
            return {
              ...post,
              is_liked: status.is_liked,
              is_favorited: status.is_favorited,
              like_count: status.like_count || post.like_count,
              favorite_count: status.favorite_count || post.favorite_count,
              comment_count: status.comment_count || post.comment_count,
              view_count: status.view_count || post.view_count
            };
          }
          
          return post;
        });
        
        // 更新数据
        this.setData({
          post: updatedPostList
        });
        
        // 如果在详情页，也更新详情页数据
        if (this.data.postDetail && this.data.postDetail.id && statusMap[this.data.postDetail.id]) {
          const detailStatus = statusMap[this.data.postDetail.id];
          this.setData({
            'postDetail.is_liked': detailStatus.is_liked,
            'postDetail.is_favorited': detailStatus.is_favorited,
            'postDetail.like_count': detailStatus.like_count || this.data.postDetail.like_count,
            'postDetail.favorite_count': detailStatus.favorite_count || this.data.postDetail.favorite_count,
            'postDetail.comment_count': detailStatus.comment_count || this.data.postDetail.comment_count,
            'postDetail.view_count': detailStatus.view_count || this.data.postDetail.view_count
          });
          
          console.debug('更新详情页帖子状态:', {
            id: this.data.postDetail.id,
            is_liked: detailStatus.is_liked,
            is_favorited: detailStatus.is_favorited
          });
        }
        
        console.debug('批量更新帖子状态完成:', {
          总数: postIds.length,
          成功更新: Object.keys(statusMap).length
        });
      } catch (err) {
        console.debug('批量更新帖子状态失败:', err);
      }
    },
    
    // 加载帖子列表
    async loadPost(params = {}, refresh = false) {
      const { page, pageSize } = refresh ? { page: 1, pageSize: this.data.pagination.pageSize } : this.data.pagination;
      
      if (!refresh && (!this.data.pagination.hasMore || this.data.postLoading)) {
        return;
      }
      
      this.setData({ postLoading: true, postError: false });
      
      try {
        // 可自定义参数，默认用帖子列表API
        const apiParams = {
          page,
          limit: pageSize,
          openid: storage.get('openid'),
          ...params
        };
        
        console.debug('调用帖子列表API, 参数:', apiParams);
        const res = await postApi.list(apiParams);
        console.debug('帖子列表API返回:', {
          code: res.code,
          message: res.message,
          数据长度: res.data ? (Array.isArray(res.data) ? res.data.length : '非数组') : '无数据',
          分页: res.pagination || '无分页',
          数据样例: res.data && Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '获取帖子列表失败');
        }
        
        if (!res.data || !Array.isArray(res.data)) {
          console.debug('帖子列表返回的数据不是数组:', res.data);
          throw error.create('帖子列表格式错误');
        }
        
        const newPosts = this.formatPostList(res.data || [], storage.get('openid') || '');
        console.debug('格式化后的帖子列表:', {
          原始长度: res.data.length,
          格式化后长度: newPosts.length,
          样例: newPosts.length > 0 ? { id: newPosts[0].id, title: newPosts[0].title } : null
        });
        
        const total = res.pagination?.total || 0;
        
        // 判断是否有更多数据: 1. 当前页的数据量等于页大小 2. 当前加载的总数小于总数
        const hasMore = newPosts.length >= pageSize && 
                       ((!refresh && this.data.post.length + newPosts.length < total) || 
                        (refresh && newPosts.length < total));
        
        // 如果没有任何数据或数据为空数组，确保hasMore为false
        const finalHasMore = newPosts.length > 0 ? hasMore : false;
        
        // 先更新列表数据
        this.setData({
          post: refresh ? newPosts : [...this.data.post, ...newPosts],
          postLoading: false,
          pagination: {
            page: page + 1,
            pageSize,
            total,
            hasMore: finalHasMore
          }
        });
        
        console.debug('帖子加载完成：', {
          加载方式: refresh ? '刷新' : '加载更多',
          数据量: newPosts.length,
          总数据量: refresh ? newPosts.length : this.data.post.length,
          hasMore: finalHasMore,
          postList状态: this.data.post ? `${this.data.post.length}条数据` : '无数据'
        });
        
        // 批量获取所有帖子的最新状态
        if (newPosts.length > 0) {
          // 使用批量更新方法
          this.updateBatchPostStatus(newPosts);
        }
      } catch (err) {
        this.setData({
          postLoading: false,
          postError: true,
          postErrorMsg: err.message || '获取帖子列表失败',
          pagination: {
            ...this.data.pagination,
            hasMore: false // 发生错误时设置hasMore为false
          }
        });
        console.debug('加载帖子列表失败:', err);
        throw err;
      }
    },
    
    // 刷新帖子列表
    refreshPost(params = {}) {
      return this.loadPost(params, true);
    },
    
    // 加载更多帖子
    loadMorePost(params = {}) {
      return this.loadPost(params, false);
    },
    
    // ==== 帖子详情相关方法 ====
    
    // 加载帖子详情
    async loadPostDetail(postId = null) {
      // 优先使用参数中的postId，其次使用data中的postId
      const targetPostId = postId || this.data.postId;
      
      if (!targetPostId) {
        this.setData({
          postDetailError: true,
          postDetailErrorMsg: '未指定帖子ID'
        });
        return;
      }
      
      this.setData({
        postDetailLoading: true,
        postDetailError: false,
        postId: targetPostId
      });
      
      try {
        const res = await postApi.detail({ 
          post_id: targetPostId,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '获取帖子详情失败');
        }
        
        // 格式化帖子数据
        const formattedPost = this.formatPost(res.data, storage.get('openid') || '');
        
        // 设置帖子详情
        this.setData({
          postDetail: formattedPost,
          postDetailLoading: false
        });
        
        // 获取最新的帖子状态
        await this.updateBatchPostStatus([formattedPost]);
        
        // 直接加载评论数据
        if (typeof this.loadComment === 'function') {
          try {
            this.loadComment(targetPostId);
          } catch (err) {
            console.debug('加载评论失败:', err);
          }
        }
      } catch (err) {
        this.setData({
          postDetailLoading: false,
          postDetailError: true,
          postDetailErrorMsg: err.message || '获取帖子详情失败'
        });
        console.debug('加载帖子详情失败:', err);
      }
    },
    
    // ==== 帖子操作相关方法 ====
    
    // 创建帖子
    async createPost(postData) {
      try {
        const res = await postApi.create({
          ...postData,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '发布失败');
        }
        
        return res.data;
      } catch (err) {
        console.debug('发布帖子失败:', err);
        ui.showToast(err.message || '发布失败', { type: ToastType.ERROR });
        return Promise.reject(err);
      }
    },
    
    // 点赞/取消点赞帖子
    async toggleLike(event) {
      const openid = storage.get('openid');
      if (!openid) {
        ui.showLoginConfirm('登录后才能点赞');
        return;
      }
      
      // 解析事件数据
      let postId, index;
      try {
        if (event && event.currentTarget && event.currentTarget.dataset) {
          ({ postId, index } = event.currentTarget.dataset);
        } else if (event && event.detail) {
          ({ postId, index } = event.detail);
        }
      } catch (err) {
        console.debug('解析点赞事件数据失败:', err);
        return;
      }
      
      // 如果在详情页，优先使用详情页的帖子ID
      if (!postId && this.data.postDetail) {
        postId = this.data.postDetail.id;
      }
      
      if (!postId) {
        console.debug('点赞失败: 未指定帖子ID');
        return;
      }
      
      this.setData({ isLiking: true });
      
      try {
        const res = await postApi.like({
          post_id: postId,
          openid: openid
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '操作失败');
        }
        
        // 获取最新的帖子状态
        await this.updateBatchPostStatus([{id: postId}]);
        
        console.debug('点赞/取消点赞成功:', { post_id: postId, index });
      } catch (err) {
        ui.showToast(err.message || '操作失败', { type: ToastType.ERROR });
        console.debug('点赞/取消点赞失败:', err);
      } finally {
        this.setData({ isLiking: false });
      }
    },
    
    // 收藏/取消收藏帖子
    async toggleFavorite(event) {
      const openid = storage.get('openid');
      if (!openid) {
        ui.showLoginConfirm('登录后才能收藏');
        return;
      }
      
      // 解析事件数据
      let postId, index;
      try {
        if (event && event.currentTarget && event.currentTarget.dataset) {
          ({ postId, index } = event.currentTarget.dataset);
        } else if (event && event.detail) {
          ({ postId, index } = event.detail);
        }
      } catch (err) {
        console.debug('解析收藏事件数据失败:', err);
        return;
      }
      
      // 如果在详情页，优先使用详情页的帖子ID
      if (!postId && this.data.postDetail) {
        postId = this.data.postDetail.id;
      }
      
      if (!postId) {
        console.debug('收藏失败: 未指定帖子ID');
        return;
      }
      
      this.setData({ isFavoriting: true });
      
      try {
        const res = await postApi.favorite({
          post_id: postId,
          openid: openid
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '操作失败');
        }
        
        // 获取最新的帖子状态
        await this.updateBatchPostStatus([{id: postId}]);
        
        console.debug('收藏/取消收藏成功:', { post_id: postId, index });
      } catch (err) {
        ui.showToast(err.message || '操作失败', { type: ToastType.ERROR });
        console.debug('收藏/取消收藏失败:', err);
      } finally {
        this.setData({ isFavoriting: false });
      }
    },
    
    // 帖子跳转
    navigateToPostDetail(e) {
      const { id } = e.currentTarget.dataset;
      this.navigateTo('/pages/post/detail/detail', { id });
    }
  }
}); 