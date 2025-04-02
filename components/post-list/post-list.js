Component({
  properties: {
    // 帖子列表数据
    post: {
      type: Array,
      value: []
    },
    loading: {
      type: Boolean,
      value: false
    },
    error: {
      type: Boolean,
      value: false
    },
    errorMsg: {
      type: String,
      value: '加载失败'
    },
    hasMore: {
      type: Boolean,
      value: true
    },
    empty: {
      type: Boolean,
      value: false
    },
    emptyText: {
      type: String,
      value: '暂无数据'
    },
    emptyBtnText: {
      type: String,
      value: '发布帖子'
    },
    showEmptyBtn: {
      type: Boolean,
      value: true
    },
    currentOpenid: {
      type: String,
      value: ''
    },
    noMoreText: {
      type: String,
      value: '没有更多数据了'
    }
  },

  lifetimes: {
    attached() {
      console.debug('post-list组件已附加，post数据长度:', this.data.post ? this.data.post.length : 0);
    }
  },

  methods: {
    // 跳转到详情页
    handlePostTap(e) {
      const { id } = e.currentTarget.dataset;
      this.triggerEvent('posttap', { postId: id });
    },
    
    // 加载更多
    loadMore() {
      if (!this.data.loading && this.data.hasMore) {
        this.triggerEvent('loadmore');
      }
    },
    
    // 点击空状态按钮
    handleEmptyBtnTap() {
      this.triggerEvent('emptybtn');
    },
    
    // 处理点赞事件
    handleLike(e) {
      const index = e.currentTarget.dataset.index;
      const post = this.data.post[index];
      if (!post) {
        console.debug('点赞失败：找不到索引为', index, '的帖子');
        return;
      }
      this.triggerEvent('like', { post, index });
    },
    
    // 处理收藏事件
    handleFavorite(e) {
      const index = e.currentTarget.dataset.index;
      const post = this.data.post[index];
      if (!post) {
        console.debug('收藏失败：找不到索引为', index, '的帖子');
        return;
      }
      this.triggerEvent('favorite', { post, index });
    },
    
    // 处理评论事件
    handleComment(e) {
      const { id, index } = e.currentTarget.dataset;
      this.triggerEvent('comment', { id, index });
    },
    
    // 处理关注事件
    handleFollow(e) {
      const { userId, index } = e.currentTarget.dataset;
      this.triggerEvent('follow', { userId, index });
    },
    
    // 处理用户点击事件
    handleUserTap(e) {
      const { userId, index } = e.currentTarget.dataset;
      this.triggerEvent('usertap', { userId, index });
    },
    
    // 处理重试
    handleRetry() {
      this.triggerEvent('retry');
    },
    
    // 阻止事件冒泡
    stopPropagation() {
      // 阻止事件冒泡
    }
  }
}) 