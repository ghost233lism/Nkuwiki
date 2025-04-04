const { storage } = require("../../utils/util");

Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: false
    },
    showHome: {
      type: Boolean,
      value: false
    },
    textColor: {
      type: String,
      value: '#000000'
    },
    showLogo: {
      type: Boolean,
      value: true
    },
    hasUnread: {
      type: Boolean,
      value: false
    }
  },

  data: {
    statusBarHeight: 0,
    navBarHeight: 50,
    totalHeight: 0,
    notificationLeft: '140rpx' // 更新默认位置，更靠近logo
  },

  lifetimes: {
    attached() {
      // 获取系统信息
      const systemInfo = storage.get('systemInfo')
      const statusBarHeight = systemInfo.statusBarHeight
      
      // 根据不同平台设置导航栏高度
      let navBarHeight = 50; // 默认高度已调整
      if (systemInfo.platform === 'android') {
        navBarHeight = 54; // 安卓平台略高
      }
      
      // 设置总高度
      const totalHeight = statusBarHeight + navBarHeight;
      
      // 计算通知按钮位置
      this.calculateNotificationPosition();
      
      this.setData({
        statusBarHeight,
        navBarHeight,
        totalHeight
      })
    }
  },
  
  observers: {
    'showBack, showHome, showLogo': function() {
      this.calculateNotificationPosition();
    }
  },

  methods: {
    calculateNotificationPosition() {
      // 基础位置，只有logo的情况
      let left = 100; // 减小基础位置值，让通知按钮更靠近logo
      
      // 如果有返回按钮，增加距离
      if (this.properties.showBack) {
        left += 72;
      }
      
      // 如果有主页按钮，增加距离
      if (this.properties.showHome) {
        left += 72;
      }
      
      // 如果没有logo，减少距离
      if (!this.properties.showLogo) {
        left -= 100; // 调整减少的距离
      }
      
      this.setData({
        notificationLeft: `${left}rpx`
      });
    },

    onBack() {
      wx.navigateBack({
        delta: 1
      })
    },

    onHome() {
      wx.switchTab({
        url: '/pages/index/index'
      })
    },

    onNotificationClick() {
      this.triggerEvent('notification', { });
    },

    onAvatarTap() {
      this.triggerEvent('avatar', { });
    }
  }
}) 