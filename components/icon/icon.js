/**
 * 图标组件
 * 完全自定义实现的图标组件
 */
Component({
  properties: {
    // 图标名称
    name: {
      type: String,
      value: ''
    },
    
    // 图标类型，可直接传递微信原生icon的type
    type: {
      type: String,
      value: ''
    },
    
    // 图标大小，单位rpx，可接收数字或字符串
    size: {
      type: null,
      value: 40
    },
    
    // 图标颜色
    color: {
      type: String,
      value: ''
    },
    
    // 额外的样式类
    class: {
      type: String,
      value: ''
    },

    // 是否使用轮廓风格
    outline: {
      type: Boolean,
      value: false
    },
    
    // 是否直接使用图片
    useImage: {
      type: Boolean,
      value: false
    },
    
    // 图片路径
    imageSrc: {
      type: String,
      value: ''
    },
    
    // 图标形状：默认为圆形，可选值为 'square'(方形) 或 'rounded'(圆角矩形)
    shape: {
      type: String,
      value: ''
    }
  },
  
  data: {
    // 转换后的尺寸数字
    sizeNumber: 20,
    
    // 是否使用图片 - 内部状态
    _useImage: false,
    
    // 图片路径 - 内部状态
    _imageSrc: '',
    
    // 图标映射表，将名称映射到/icons/目录下的图片
    iconMap: {
      // 通用操作图标
      'like': '/icons/like.png',
      'like-active': '/icons/liked.png',
      'comment': '/icons/comment.png',
      'comment-active': '/icons/comment-active.png',
      'favorite': '/icons/favorite.png',
      'favorite-active': '/icons/favorited.png',
      'share': '/icons/wechat.png',
      'close': '/icons/clear.png',
      'delete': '/icons/eraser.png',
      'add': '/icons/plus.png',
      'loading': '/icons/refresh.png',
      'copy': '/icons/copy.png',
      'clear': '/icons/clear.png',
      'refresh': '/icons/refresh.png',
      'image': '/icons/image.png',
      'eye': '/icons/eye.png',
      'eye-active': '/icons/eye-active.png',
      'book': '/icons/book.png',
      
      // 状态图标
      'success': '/icons/success.png',
      'error': '/icons/error.png',
      'empty': '/icons/empty.png',
      
      // 标签页图标
      'home': '/icons/home.png',
      'home-active': '/icons/home-active.png',
      'discover': '/icons/discover.png',
      'discover-active': '/icons/discover-active.png',
      'profile': '/icons/profile.png',
      'profile-active': '/icons/profile-active.png',
      
      // 功能图标
      'search': '/icons/search.png',
      'search-active': '/icons/search-active.png',
      'notification': '/icons/notification.png',
      'notification-active': '/icons/notification.png',
      'notification-unread': '/icons/notification-unread.png',
      'setting': '/icons/settings.png',
      'back': '/icons/back.png',
      'arrow-right': '/icons/arrow-right.png',
      'history': '/icons/history.png',
      'feedback': '/icons/support.png',
      'draft': '/icons/draft.png',
      'about': '/icons/about.png',
      'message': '/icons/message.png',
      'star': '/icons/star.png',
      'logout': '/icons/logout.png',
      'footprint': '/icons/footprint.png',
      'coins': '/icons/coins.png',
      'token': '/icons/token.png',
      
      // 内容类型图标
      'study': '/icons/study.png',
      'lost': '/icons/lost.png',
      'life': '/icons/life.png',
      'job': '/icons/job.png',
      'club': '/icons/club.png',
      'market': '/icons/market.png',
      'website': '/icons/website.png',
      'book': '/icons/book.png',
      'code': '/icons/code.png',
      'robot': '/icons/robot.png',
      'translate': '/icons/translate.png',
      'plan': '/icons/plan.png',
      'txt': '/icons/txt.png',
      'group': '/icons/group.png',
      'voice': '/icons/voice.png',
      'code': '/icons/code.png',
      
      // 社交平台图标
      'wechat': '/icons/wechat.png',
      'douyin': '/icons/douyin.png',
      
      // 搜索相关平台图标
      'app': '/icons/app.png',
      'forum': '/icons/forum.png',
      'blog': '/icons/blog.png',
      
      // 头像
      'avatar1': '/icons/avatar1.png',
      'avatar2': '/icons/avatar2.png',
      'logo': '/icons/logo.png'
    }
  },

  lifetimes: {
    attached: function() {
      this.initializeIcon();
    }
  },
  
  observers: {
    'name,type,size,useImage,imageSrc': function() {
      this.initializeIcon();
    }
  },
  
  methods: {
    // 初始化图标
    initializeIcon() {
      const updateData = {};
      
      // 处理尺寸
      let sizeValue = this.properties.size;
      if (typeof sizeValue === 'string') {
        sizeValue = parseFloat(sizeValue.replace(/[^0-9.]/g, ''));
      }
      
      updateData.sizeNumber = !isNaN(sizeValue) && sizeValue > 0 ? sizeValue / 2 : 20;
      
      // 处理图标显示逻辑
      if (this.properties.useImage) {
        // 1. 优先使用直接指定的图片
        updateData._useImage = true;
        updateData._imageSrc = this.properties.imageSrc;
      } else if (this.properties.type) {
        // 2. 如果有type，使用微信原生图标
        updateData._useImage = false;
      } else if (this.properties.name) {
        // 3. 如果有name，查找映射表
        if (this.data.iconMap[this.properties.name]) {
          // 如果在映射表中找到对应的图标，使用图片模式
          updateData._useImage = true;
          updateData._imageSrc = this.data.iconMap[this.properties.name];
        } else {
          // 如果未找到，使用默认路径
          updateData._useImage = true;
          updateData._imageSrc = `/icons/${this.properties.name}.png`;
        }
      }
      
      this.setData(updateData);
    },
    
    // 处理点击事件
    handleTap(e) {
      this.triggerEvent('tap', {
        name: this.properties.name,
        ...e.detail
      });
    }
  }
}); 