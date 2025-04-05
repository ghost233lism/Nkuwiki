/**
 * 图标组件
 * 完全自定义实现的图标组件，避免依赖weui-miniprogram
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

    // 图标名称
    icon: {
      type: String,
      value: ''
    },
    
    // 图标大小，单位rpx，可接收数字或字符串
    size: {
      type: null, // 使用null允许接收任意类型
      value: 40
    },
    
    // 图标颜色
    color: {
      type: String,
      value: ''
    },
    
    // 点击时是否显示涟漪效果
    ripple: {
      type: Boolean,
      value: false
    },
    
    // 额外的样式类
    extClass: {
      type: String,
      value: ''
    },

    // 是否使用轮廓风格
    outline: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    // 转换后的尺寸数字
    sizeNumber: 20,
    
    // 显示涟漪效果
    showRipple: false,

    // 微信原生支持的icon type
    wxIconTypes: [
      'success', 'success_no_circle', 'info', 'warn', 'waiting', 
      'cancel', 'download', 'search', 'clear'
    ],
    
    // 防止重复更新
    updating: false,
    
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
      'settings': '/icons/settings.png',
      'back': '/icons/back.png',
      'arrow-right': '/icons/arrow-right.png',
      'history': '/icons/history.png',
      'feedback': '/icons/feedback.png',
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
      
      // 社交平台图标
      'wechat': '/icons/wechat.png',
      'douyin': '/icons/douyin.png',
      
      // 头像
      'avatar1': '/icons/avatar1.png',
      'avatar2': '/icons/avatar2.png',
      'logo': '/icons/logo.png'
    },
    
    // 是否使用图片
    useImage: false,
    
    // 图片路径
    imageSrc: ''
  },

  lifetimes: {
    attached: function() {
      // 初始化时设置一次
      this.initializeIcon();
    }
  },
  
  observers: {
    'name,size,icon,type': function(name, size, icon, type) {
      if (this.data.updating) return;
      this.initializeIcon();
    }
  },
  
  methods: {
    // 初始化图标
    initializeIcon() {
      if (this.data.updating) return;
      
      this.data.updating = true;
      
      const updateData = {};
      
      // 处理尺寸 - 支持字符串和数字类型
      if (this.properties.size !== undefined) {
        let sizeValue = this.properties.size;
        
        // 将字符串转换为数字
        if (typeof sizeValue === 'string') {
          // 移除可能的单位（如"px"、"rpx"等）
          sizeValue = parseFloat(sizeValue.replace(/[^0-9.]/g, ''));
        }
        
        // 确保有效数字
        if (!isNaN(sizeValue) && sizeValue > 0) {
          updateData.sizeNumber = sizeValue / 2;
        } else {
          // 默认大小
          updateData.sizeNumber = 20;
        }
      }
      
      // 处理图标名称 - 优先级：name > type > icon
      if (this.properties.name) {
        // 检查是否存在于图标映射表中
        if (this.data.iconMap[this.properties.name]) {
          // 使用图片模式
          updateData.useImage = true;
          updateData.imageSrc = this.data.iconMap[this.properties.name];
          updateData.type = '';
          updateData.icon = '';
        } else if (this.data.wxIconTypes.includes(this.properties.name)) {
          // 如果是微信原生icon，使用type属性
          updateData.type = this.properties.name;
          updateData.icon = '';
          updateData.useImage = false;
        } else {
          // 使用自定义图标
          updateData.icon = this.properties.name;
          updateData.type = '';
          updateData.useImage = false;
        }
      } else if (this.properties.type) {
        // 使用微信原生图标
        updateData.type = this.properties.type;
        updateData.icon = '';
        updateData.useImage = false;
      } else if (this.properties.icon) {
        // 使用自定义图标
        updateData.icon = this.properties.icon;
        updateData.type = '';
        updateData.useImage = false;
      }
      
      // 批量更新数据
      this.setData(updateData, () => {
        // 在回调中重置updating标记
        setTimeout(() => {
          this.data.updating = false;
        }, 0);
      });
    },
    
    // 点击图标
    handleTap: function() {
      // 如果开启了涟漪效果，显示涟漪
      if (this.properties.ripple) {
        this.setData({ showRipple: true });
        
        // 300ms后隐藏涟漪
        setTimeout(() => {
          this.setData({ showRipple: false });
        }, 300);
      }
      
      // 触发点击事件
      this.triggerEvent('tap');
    }
  }
}); 