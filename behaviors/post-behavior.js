/**
 * 帖子行为 - 统一帖子详情和列表的处理逻辑
 */
const { formatRelativeTime, storage, ui, error, ToastType, createApiClient, parseJsonField, parseImageUrl, parseUrl } = require('../utils/util');
const baseBehavior = require('./base-behavior');

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
  behaviors: [baseBehavior],
  
  data: {
    // 帖子列表相关
    posts: [],
    postsLoading: false,
    postsError: false,
    postsErrorMsg: '',
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    },
    
    // 帖子详情相关
    post: null,
    postId: '',
    postLoading: false,
    postError: false,
    postErrorMsg: '',
    
    // 评论相关
    comments: [],
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
    
    // 加载帖子列表
    async loadPost(params = {}, refresh = false) {
      const { page, pageSize } = refresh ? { page: 1, pageSize: this.data.pagination.pageSize } : this.data.pagination;
      
      if (!refresh && (!this.data.pagination.hasMore || this.data.postsLoading)) {
        return;
      }
      
      this.setData({ postsLoading: true, postsError: false });
      
      try {
        // 可自定义参数，默认用帖子列表API
        const apiParams = {
          page,
          limit: pageSize,
          openid: storage.get('openid'),
          ...params
        };
        
        const res = await postApi.list(apiParams);
        
        if (res.code !== 200) {
          throw error.create(res.message || '获取帖子列表失败');
        }
        
        const newPosts = this.formatPostList(res.data || [], storage.get('openid') || '');
        const total = res.pagination?.total || 0;
        const hasMore = newPosts.length >= pageSize;
        
        this.setData({
          posts: refresh ? newPosts : [...this.data.posts, ...newPosts],
          postsLoading: false,
          pagination: {
            page: page + 1,
            pageSize,
            total,
            hasMore
          }
        });
      } catch (err) {
        this.setData({
          postsLoading: false,
          postsError: true,
          postsErrorMsg: err.message || '获取帖子列表失败'
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
          postError: true,
          postErrorMsg: '未指定帖子ID'
        });
        return;
      }
      
      this.setData({
        postLoading: true,
        postError: false,
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
        
        this.setData({
          post: formattedPost,
          postLoading: false
        });
        
        // 加载帖子评论
        this.loadComment();
      } catch (err) {
        this.setData({
          postLoading: false,
          postError: true,
          postErrorMsg: err.message || '获取帖子详情失败'
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
    async toggleLike(e) {
      if (this.data.isLiking) return;
      
      const { post, index } = e.currentTarget.dataset;
      const postId = post.id;
      
      this.setData({ isLiking: true });
      
      try {
        const res = await postApi.like({ 
          post_id: postId,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '操作失败');
        }
        
        const newLikeStatus = res.data.status === 'liked';
        const newLikeCount = res.data.like_count;
        
        // 更新列表中的点赞状态
        if (typeof index === 'number') {
          this.setData({
            [`posts[${index}].is_liked`]: newLikeStatus,
            [`posts[${index}].like_count`]: newLikeCount
          });
        }
        
        // 如果在详情页也更新详情
        if (this.data.post && this.data.post.id === postId) {
          this.setData({
            'post.is_liked': newLikeStatus,
            'post.like_count': newLikeCount
          });
        }
      } catch (err) {
        console.debug('点赞操作失败:', err);
        ui.showToast(err.message || '操作失败', { type: ToastType.ERROR });
      } finally {
        this.setData({ isLiking: false });
      }
    },
    
    // 收藏/取消收藏帖子
    async toggleFavorite(e) {
      if (this.data.isFavoriting) return;
      
      const { post, index } = e.currentTarget.dataset;
      const postId = post.id;
      
      this.setData({ isFavoriting: true });
      
      try {
        const res = await postApi.favorite({ 
          post_id: postId,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '操作失败');
        }
        
        const newFavoriteStatus = res.data.status === 'favorited';
        const newFavoriteCount = res.data.favorite_count;
        
        // 更新列表中的收藏状态
        if (typeof index === 'number') {
          this.setData({
            [`posts[${index}].is_favorited`]: newFavoriteStatus,
            [`posts[${index}].favorite_count`]: newFavoriteCount
          });
        }
        
        // 如果在详情页也更新详情
        if (this.data.post && this.data.post.id === postId) {
          this.setData({
            'post.is_favorited': newFavoriteStatus,
            'post.favorite_count': newFavoriteCount
          });
        }
      } catch (err) {
        console.debug('收藏操作失败:', err);
        ui.showToast(err.message || '操作失败', { type: ToastType.ERROR });
      } finally {
        this.setData({ isFavoriting: false });
      }
    },
    
    // ==== 评论相关方法 ====
    
    // 加载评论列表
    async loadComment() {
      if (!this.data.postId) return;
      
      try {
        const res = await commentApi.list({ 
          post_id: this.data.postId,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '获取评论失败');
        }
        
        // 格式化评论，添加相对时间
        const formattedComments = (res.data || []).map(comment => ({
          ...comment,
          formattedTime: formatRelativeTime(comment.create_time || comment.createTime)
        }));
        
        this.setData({ comments: formattedComments });
      } catch (err) {
        console.debug('加载评论失败:', err);
      }
    },
    
    // 提交评论
    async submitComment() {
      if (!this.data.commentContent.trim()) {
        ui.showToast('请输入评论内容', { type: ToastType.ERROR });
        return;
      }
      
      if (this.data.commenting) return;
      
      this.setData({ commenting: true });
      
      try {
        const res = await commentApi.create({
          post_id: this.data.postId,
          content: this.data.commentContent,
          openid: storage.get('openid')
        });
        
        if (res.code !== 200) {
          throw error.create(res.message || '评论失败');
        }
        
        // 清空评论内容
        this.setData({ commentContent: '' });
        
        // 刷新评论列表
        this.loadComment();
        
        // 更新帖子评论数
        if (this.data.post) {
          this.setData({
            'post.comment_count': (this.data.post.comment_count || 0) + 1
          });
        }
        
        ui.showToast('评论成功', { type: ToastType.SUCCESS });
      } catch (err) {
        console.debug('提交评论失败:', err);
        ui.showToast(err.message || '评论失败', { type: ToastType.ERROR });
      } finally {
        this.setData({ commenting: false });
      }
    },
    
    // 评论内容变化
    onCommentInput(e) {
      this.setData({
        commentContent: e.detail.value
      });
    },
    
    // 帖子跳转
    navigateToPostDetail(e) {
      const { id } = e.currentTarget.dataset;
      this.navigateTo('/pages/post/detail/detail', { id });
    }
  }
}); 