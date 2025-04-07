Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否正在加载
    loading: {
      type: Boolean,
      value: false
    },
    icon: {
      type: Object,
      value: {
        name: '',
        size: 24,
        color: '#666',
        useImage: false,
        imageSrc: ''
      }
    },
    // 按钮文本
    text: {
      type: String,
      value: ''
    },
    // 文本颜色
    textColor: {
      type: String,
      value: ''
    },
    // 文本大小
    textSize: {
      type: Number,
      value: 28
    },
    // 文本背景色
    textBackground: {
      type: String,
      value: ''
    },
    // 文本按钮样式类型（primary/warn/secondary）
    textType: {
      type: String,
      value: ''
    },
    // 开放能力类型
    openType: {
      type: String,
      value: ''
    },
    // 是否显示计数
    showCount: {
      type: Boolean,
      value: false
    },
    // 计数值
    count: {
      type: Number,
      value: 0
    },
    // 最大显示计数
    maxCount: {
      type: Number,
      value: 99
    },
    // 计数为0时是否隐藏
    hideZero: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    lastTapTime: 0
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onClick(e) {
      if (this.data.disabled || this.data.loading) {
        return;
      }
      
      const openType = this.data.openType;
      
      // 处理开放能力
      if (openType) {
        // 对于分享，可以手动触发页面的分享
        if (openType === 'share') {
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          if (currentPage && currentPage.onShareAppMessage) {
            wx.showShareMenu({
              withShareTicket: true,
              menus: ['shareAppMessage']
            });
          }
        }
      }
      
      this.triggerEvent('tap', e);
    },

    // 获取用户信息回调
    onGetUserInfo: function(e) {
      this.triggerEvent('getuserinfo', e.detail);
    },

    // 获取手机号回调
    onGetPhoneNumber: function(e) {
      this.triggerEvent('getphonenumber', e.detail);
    },

    // 打开设置回调
    onOpenSetting: function(e) {
      this.triggerEvent('opensetting', e.detail);
    },

    // 错误回调
    onError: function(e) {
      this.triggerEvent('error', e.detail);
    },

    // 客服消息回调
    onContact: function(e) {
      this.triggerEvent('contact', e.detail);
    },

    // 获取用户头像回调
    onChooseAvatar: function(e) {
      this.triggerEvent('chooseavatar', e.detail);
    },

    // 同意授权回调
    onAgree: function(e) {
      this.triggerEvent('agree', e.detail);
    },

    // 分享到朋友圈
    onAddToFavorites: function(e) {
      this.triggerEvent('addtofavorites', e.detail);
    }
  }
}) 