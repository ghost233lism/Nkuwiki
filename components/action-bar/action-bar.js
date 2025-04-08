/**
 * 帖子操作栏组件 - 用于显示点赞、评论、收藏、分享等操作按钮
 */
Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  
  properties: {
    // 点赞数
    likeCount: {
      type: Number,
      value: 0
    },
    // 是否已点赞
    is_liked: {
      type: Boolean,
      value: false
    },
    // 评论数
    commentCount: {
      type: Number,
      value: 0
    },
    // 收藏数
    favoriteCount: {
      type: Number,
      value: 0
    },
    // 是否已收藏
    is_favorited: {
      type: Boolean,
      value: false
    },
    // 分享数
    shareCount: {
      type: Number,
      value: 0
    },
    // 按钮尺寸
    size: {
      type: Number,
      value: 32
    },
    // 是否禁用交互
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否隐藏数字为0的计数
    hideZero: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    baseColor: '#666',
    activeColor: '#ff6b6b',
    activeFavoriteColor: '#ffc107',
    currentLikeColor: '#666',
    currentFavoriteColor: '#666',
    // 图标名称定义
    like: 'like',
    comment: 'comment',
    favorite: 'favorite',
    share: 'share'
  },
  
  observers: {
    'is_liked': function(is_liked) {
      // 根据点赞状态更新图标
      const newLikeIcon = is_liked ? 'like-active' : 'like';
      const newColor = is_liked ? this.data.activeColor : this.data.baseColor;
      
      this.setData({
        currentLikeColor: newColor,
        like: newLikeIcon
      });
    },
    'is_favorited': function(is_favorited) {
      // 根据收藏状态更新图标
      const newFavIcon = is_favorited ? 'favorite-active' : 'favorite';
      const newColor = is_favorited ? this.data.activeFavoriteColor : this.data.baseColor;
      
      this.setData({
        currentFavoriteColor: newColor,
        favorite: newFavIcon
      });
    }
  },
  
  lifetimes: {
    attached: function() {
      // 确保图标状态与属性同步
      const likeIcon = this.properties.is_liked ? 'like-active' : 'like';
      const favIcon = this.properties.is_favorited ? 'favorite-active' : 'favorite';
      
      this.setData({
        currentLikeColor: this.properties.is_liked ? this.data.activeColor : this.data.baseColor,
        currentFavoriteColor: this.properties.is_favorited ? this.data.activeFavoriteColor : this.data.baseColor,
        like: likeIcon,
        favorite: favIcon
      });
    },
    
    ready: function() {
      // 组件准备完成后再次检查状态
      if (this.properties.is_liked !== (this.data.like === 'like-active')) {
        this.observers.is_liked.call(this, this.properties.is_liked);
      }
      
      if (this.properties.is_favorited !== (this.data.favorite === 'favorite-active')) {
        this.observers.is_favorited.call(this, this.properties.is_favorited);
      }
    }
  },
  
  methods: {
    // 点赞按钮点击
    onLikeTap() {
      if (this.properties.disabled) return;
      this.triggerEvent('like');
    },
    
    // 评论按钮点击
    onCommentTap() {
      if (this.properties.disabled) return;
      this.triggerEvent('comment');
    },
    
    // 收藏按钮点击
    onFavoriteTap() {
      if (this.properties.disabled) return;
      this.triggerEvent('favorite');
    },
    
    // 分享按钮点击 - 由于使用open-type="share"，这个方法通常不会被调用
    onShareTap() {
      if (this.properties.disabled) return;
      this.triggerEvent('share');
    }
  }
}); 