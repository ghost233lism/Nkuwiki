const { ui, ToastType } = require('../../../utils/util');
const baseBehavior = require('../../../behaviors/baseBehavior');
const postBehavior = require('../../../behaviors/postBehavior');
const userBehavior = require('../../../behaviors/userBehavior');
const authBehavior = require('../../../behaviors/authBehavior');
const commentBehavior = require('../../../behaviors/commentBehavior');

Page({
  behaviors: [baseBehavior, postBehavior, userBehavior, authBehavior, commentBehavior],

  data: {
    id: '',
    loading: false,
    error: null,
    errorText: '',
    postDetail: null,
    userInfo: null,
    
    // 评论相关
    comments: [],
    commentError: null,
    hasMore: false,
    
    // 加载状态
    loadingComment: false,
    
    // 其他
    isEditMode: false,
    // WEUI组件默认值
    toptips: {
      msg: '',
      type: 'error',
      show: false
    },
    dialog: {
      title: '',
      content: '',
      show: false,
      buttons: []
    },
    actionSheet: {
      show: false,
      actions: []
    },
    statusBarHeight: wx.getSystemInfoSync().statusBarHeight || 20,
    containerPaddingTop: ''
  },

  onLoad(options) {
    // 获取状态栏高度
    const app = getApp();
    const statusBarHeight = app.globalData.statusBarHeight || 20;
    
    // 设置容器的paddingTop，为导航栏和状态栏留出空间
    this.setData({
      statusBarHeight,
      containerPaddingTop: `${56 + statusBarHeight + 15}px` // 导航栏高度 + 状态栏高度 + 额外间距
    });
    
    if (options.id) {
      this.setData({
        postId: options.id
      });
    }

    if (!options.id) {
      ui.showToast('缺少帖子ID', { type: ToastType.ERROR });
      return;
    }

    this.setData({
      id: options.id,
      isEditMode: options.edit === '1'
    });
    
    this.loadInitialData();
  },

  onPullDownRefresh() {
    this.loadInitialData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    const { postDetail, id } = this.data;
    return {
      title: postDetail?.title || '分享帖子',
      path: `/pages/post/detail/detail?id=${id}`
    };
  },

  async loadInitialData() {
    if (this.data.loading) return;
    
    this.setData({ 
      loading: true,
      error: null,
      errorText: ''
    });
    
    try {
      // 先获取帖子详情
      const post = await this.loadPostDetail(this.data.id);

      if (!post) {
        throw new Error('帖子不存在或已删除');
      }

      // 获取当前登录用户信息
      const openid = this.getStorage('openid');
      const userInfo = openid ? await this._getUserProfileByOpenid(openid) : null;

      // 更新帖子和用户信息
      this.setData({
        postDetail: post,
        userInfo: userInfo || null,
        loading: false
      });

      // 延迟加载评论
      wx.nextTick(() => {
        this.loadComment();
      });
    } catch (err) {
      this.setData({
        loading: false,
        error: true,
        errorText: err.message || '加载失败，请下拉刷新重试'
      });
      this.handleError(err, '加载失败');
    }
  },

  async onPostEdit(e) {
    try {
      const { title, content, image } = e.detail;
      const updatedPost = await this.updatePost(this.data.id, title, content, image);
      this.setData({
        postDetail: updatedPost,
        isEditMode: false
      });
      ui.showToast('更新成功', { type: ToastType.SUCCESS });
    } catch (err) {
      this.handleError(err, '更新失败');
    }
  },

  async onPostDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇帖子吗？删除后将无法恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            await this.deletePost(this.data.id);
            ui.showToast('删除成功', { type: ToastType.SUCCESS });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) {
            this.handleError(err, '删除失败');
          }
        }
      }
    });
  },

  // 评论相关方法
  async loadComment() {
    if (!this.data.id) return;
    
    this.setData({
      loadingComment: true,
      commentError: null
    });
    
    try {
      console.debug('开始加载评论...');
      // 使用commentBehavior中的方法获取评论列表
      const commentData = await this._getCommentList(this.data.id, {
        page: 1,
        limit: 10
      });
      
      if (!commentData) {
        throw new Error('获取评论失败');
      }
      
      console.debug('评论数据:', commentData);
      
      // 处理评论数据，添加相对时间等
      const formattedComments = this.formatComments(commentData.list || []);
      const total = commentData.total || 0;
      
      this.setData({
        loadingComment: false,
        comments: formattedComments,
        'postDetail.comment_count': total,
        hasMore: formattedComments.length < total,
        commentError: null,
        commentPage: 1
      });
    } catch (err) {
      console.debug('加载评论失败:', err);
      this.setData({
        loadingComment: false,
        commentError: true,
        hasMore: false
      });
      this.handleError(err, '加载评论失败');
    }
  },

  async loadMoreComment() {
    if (!this.data.id || this.data.loadingComment || !this.data.hasMore) return;
    
    const nextPage = (this.data.commentPage || 1) + 1;
    
    this.setData({ loadingComment: true });
    
    try {
      // 使用commentBehavior中的方法获取更多评论
      const commentData = await this._getCommentList(this.data.id, {
        page: nextPage,
        limit: 10
      });
      
      if (!commentData) {
        throw new Error('获取更多评论失败');
      }
      
      // 处理评论数据，添加相对时间等
      const formattedComments = this.formatComments(commentData.list || []);
      const total = commentData.total || 0;
      
      // 合并评论数据
      const mergedComments = [...this.data.comments, ...formattedComments];
      
      this.setData({
        loadingComment: false,
        comments: mergedComments,
        hasMore: mergedComments.length < total,
        commentPage: nextPage
      });
    } catch (err) {
      console.debug('加载更多评论失败:', err);
      this.setData({
        loadingComment: false
      });
    }
  },
  
  // 格式化评论数据
  formatComments(comments) {
    if (!Array.isArray(comments) || comments.length === 0) {
      return [];
    }
    
    return comments.map(comment => {
      // 解析头像和昵称
      let avatar = comment.avatar;
      let nickname = comment.nickname || '游客';
      
      // 如果有图片，确保它是数组格式
      let images = [];
      if (comment.image) {
        try {
          if (typeof comment.image === 'string') {
            images = JSON.parse(comment.image);
          } else if (Array.isArray(comment.image)) {
            images = comment.image;
          }
        } catch (e) {
          console.debug('解析评论图片失败', e);
          images = [];
        }
      }
      
      // 计算相对时间
      let relativeTime = comment.create_time;
      if (comment.create_time) {
        try {
          // 这里可以添加时间格式化逻辑
          relativeTime = comment.create_time;
        } catch (e) {
          console.debug('格式化评论时间失败', e);
        }
      }
      
      // 返回处理后的评论对象
      return {
        ...comment,
        avatar,
        nickname,
        images,
        relativeTime,
        isLiked: !!comment.is_liked
      };
    });
  },

  onUserTap(e) {
    const userId = e.detail?.userId || e.currentTarget.dataset.userId;
    if (!userId) return;
    
    console.debug('跳转到用户页面:', userId);
    this.navigateTo(`/pages/profile/user/user?id=${userId}`);
  },

  // 导航返回上一页
  navigateBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 处理点赞
  handleLike(e) {
    // 获取事件中的post和index数据
    const { post, index, postId } = e.detail;
    
    // 构建事件对象传给toggleLike
    let event;
    
    if (postId) {
      // 新的格式：使用postId
      event = {
        detail: {
          postId,
          index
        }
      };
    } else if (post) {
      // 旧的格式：使用post对象
      event = {
        currentTarget: {
          dataset: {
            post: post,
            index: index
          }
        }
      };
    } else {
      console.debug('点赞失败: 找不到帖子数据');
      return;
    }
    
    this.toggleLike(event);
  },

  // 处理收藏
  handleFavorite(e) {
    // 获取事件中的post和index数据
    const { post, index, postId } = e.detail;
    
    // 构建事件对象传给toggleFavorite
    let event;
    
    if (postId) {
      // 新的格式：使用postId
      event = {
        detail: {
          postId,
          index
        }
      };
    } else if (post) {
      // 旧的格式：使用post对象
      event = {
        currentTarget: {
          dataset: {
            post: post,
            index: index
          }
        }
      };
    } else {
      console.debug('收藏失败: 找不到帖子数据');
      return;
    }
    
    this.toggleFavorite(event);
  },

  async loadPostDetail(id) {
    if (!id) {
      throw new Error('帖子ID不能为空');
    }
    
    try {
      // 调用postBehavior中的方法获取帖子详情
      const res = await this._getPostDetail(id);
      
      if (res.code !== 200 || !res.data) {
        throw new Error(res.message || '获取帖子详情失败');
      }
      
      // 处理帖子内容中的格式
      const post = res.data;
      
      // 处理图片数据
      if (post.image && typeof post.image === 'string') {
        try {
          const images = JSON.parse(post.image);
          if (Array.isArray(images)) {
            post.images = images;
          }
        } catch (e) {
          console.error('解析图片数据失败:', e);
          post.images = [];
        }
      }
      
      // 处理标签数据
      if (post.tag && typeof post.tag === 'string') {
        try {
          const tags = JSON.parse(post.tag);
          if (Array.isArray(tags)) {
            post.tags = tags;
          }
        } catch (e) {
          console.error('解析标签数据失败:', e);
          post.tags = [];
        }
      }
      
      return post;
    } catch (err) {
      console.debug('加载帖子详情失败:', err);
      throw err;
    }
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data.postDetail;
    
    if (!images || !images.length) return;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },
  
  // 标签点击
  onTagTap(e) {
    const { tag } = e.currentTarget.dataset;
    if (!tag) return;
    
    wx.navigateTo({
      url: `/pages/tag/tag?tag=${encodeURIComponent(tag)}`
    });
  },
  
  // 显示评论输入框
  showCommentInput() {
    // 获取评论输入框焦点
    this.setData({
      commentFocus: true
    });
  },
  
  // 评论框获取焦点
  onCommentFocus() {
    // 检查登录状态
    const openid = this.getStorage('openid');
    if (!openid) {
      this.showToast('请先登录', 'error');
      return;
    }
  },
  
  // 提交评论
  submitComment(e) {
    const content = e.detail.value || this.data.commentText;
    if (!content || !content.trim()) {
      this.showToast('评论内容不能为空', 'error');
      return;
    }
    
    // 检查登录状态
    const openid = this.getStorage('openid');
    if (!openid) {
      this.showToast('请先登录', 'error');
      return;
    }
    
    // 显示评论发送中状态
    this.setData({
      loadingComment: true
    });
    
    // 使用commentBehavior中的方法创建评论
    this._createComment(this.data.id, content)
      .then(newComment => {
        if (!newComment) {
          throw new Error('评论失败');
        }
        
        // 补充当前用户信息到评论数据中
        const userInfo = this.getStorage('userInfo') || {};
        newComment = {
          ...newComment,
          nickname: userInfo.nickname || '我',
          avatar: userInfo.avatar || '',
          like_count: 0,
          isLiked: false
        };
        
        // 格式化新评论
        const formattedComment = this.formatComments([newComment])[0];
        
        // 更新评论列表
        this.setData({
          loadingComment: false,
          comments: [formattedComment, ...this.data.comments],
          'postDetail.comment_count': (this.data.postDetail.comment_count || 0) + 1,
          commentText: '',
          commentError: null
        });
        
        this.showToast('评论成功', 'success');
      })
      .catch(err => {
        console.debug('评论失败:', err);
        this.setData({
          loadingComment: false
        });
        this.showToast('评论失败，请稍后再试', 'error');
      });
  },
  
  // 关注作者
  handleFollow() {
    const { postDetail } = this.data;
    if (!postDetail || !postDetail.openid) return;
    
    // 检查是否登录
    const openid = this.getStorage('openid');
    if (!openid) {
      this.showToast('请先登录', 'error');
      return;
    }
    
    // 不能关注自己
    if (postDetail.openid === openid) {
      this.showToast('不能关注自己', 'error');
      return;
    }
    
    const isFollowed = postDetail.is_followed === 1 || postDetail.is_followed === true;
    
    // 乐观更新UI
    this.setData({
      'postDetail.is_followed': !isFollowed
    });
    
    // 调用关注API
    this._toggleFollow(postDetail.openid)
      .then(res => {
        if (res && res.success) {
          const isNowFollowing = res.is_following || res.status === 'followed';
          this.setData({
            'postDetail.is_followed': isNowFollowing
          });
          
          // 显示操作结果提示
          this.showToast(isNowFollowing ? '关注成功' : '已取消关注', 'success');
        }
      })
      .catch(err => {
        console.error('关注操作失败', err);
        // 恢复原状态
        this.setData({
          'postDetail.is_followed': isFollowed
        });
        this.showToast('操作失败，请稍后再试', 'error');
      });
  },

  // 删除评论
  deleteComment(commentId) {
    if (!commentId) return;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 使用commentBehavior中的方法删除评论
            const success = await this._deleteComment(commentId);
            
            if (!success) {
              throw new Error('删除评论失败');
            }
            
            // 更新评论列表
            const newComments = this.data.comments.filter(comment => comment.id !== commentId);
            this.setData({
              comments: newComments,
              'postDetail.comment_count': Math.max(0, (this.data.postDetail.comment_count || 0) - 1)
            });
            
            this.showToast('删除成功', 'success');
          } catch (err) {
            console.debug('删除评论失败:', err);
            this.showToast('删除失败', 'error');
          }
        }
      }
    });
  },
  
  // 点赞评论
  likeComment(commentId, index) {
    if (!commentId) return;
    
    // 检查用户登录状态
    const openid = this.getStorage('openid');
    if (!openid) {
      this.showToast('请先登录', 'error');
      return;
    }
    
    // 获取当前评论
    const comment = this.data.comments[index];
    if (!comment) return;
    
    // 乐观更新UI
    const isLiked = comment.isLiked;
    const newLikeCount = (comment.like_count || 0) + (isLiked ? -1 : 1);
    
    // 更新评论数据
    const newComments = [...this.data.comments];
    newComments[index] = {
      ...comment,
      isLiked: !isLiked,
      like_count: Math.max(0, newLikeCount)
    };
    
    this.setData({
      comments: newComments
    });
    
    // 使用commentBehavior中的方法点赞评论
    this._toggleCommentLike(commentId)
      .then(likeStatus => {
        if (!likeStatus) {
          throw new Error('点赞失败');
        }
        
        // 更新UI为真实状态
        const updatedComments = [...this.data.comments];
        updatedComments[index] = {
          ...comment,
          isLiked: !!likeStatus.is_liked,
          like_count: likeStatus.like_count || 0
        };
        
        this.setData({
          comments: updatedComments
        });
      })
      .catch(err => {
        console.debug('评论点赞失败:', err);
        
        // 恢复原状态
        const originalComments = [...this.data.comments];
        originalComments[index] = comment;
        
        this.setData({
          comments: originalComments
        });
      });
  },

  // 评论相关的事件处理方法
  
  // 评论输入变化
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },
  
  // 点赞评论
  onLikeComment(e) {
    const { id, index } = e.currentTarget.dataset;
    if (!id || index === undefined) return;
    
    this.likeComment(id, index);
  },
  
  // 删除评论
  onDeleteComment(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    
    this.deleteComment(id);
  },
  
  // 回复评论
  onReplyComment(e) {
    const { id, index } = e.currentTarget.dataset;
    const comment = this.data.comments[index];
    if (!comment) return;
    
    // 直接修改评论框的内容为回复格式
    const replyPrefix = `回复 @${comment.nickname}：`;
    
    this.setData({
      commentText: replyPrefix,
      commentFocus: true,
      replyTo: id
    });
  },
  
  // 预览评论图片
  previewCommentImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    if (!urls || !urls.length) return;
    
    wx.previewImage({
      current: current, // 当前显示图片的http链接
      urls: urls // 需要预览的图片http链接列表
    });
  },

  // post-item组件事件处理
  onPostLike(e) {
    const { id } = e.detail;
    // post-item组件内部已经处理了点赞逻辑，这里只需要处理额外逻辑
    console.debug('帖子点赞:', id);
  },
  
  onPostFavorite(e) {
    const { id } = e.detail;
    // post-item组件内部已经处理了收藏逻辑，这里只需要处理额外逻辑
    console.debug('帖子收藏:', id);
  },
  
  onAuthorFollow(e) {
    const { userId } = e.detail;
    // post-item组件内部已经处理了关注逻辑，这里只需要处理额外逻辑
    console.debug('关注作者:', userId);
  },
}); 