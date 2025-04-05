const { storage } = require("../../utils/util");

Component({
  options: {
    // 启用简化的样式隔离
    styleIsolation: 'isolated',
    // 允许页面样式覆盖组件样式
    pureDataPattern: /^_/
  },

  properties: {
    title: {
      type: String,
      value: ''
    },
    // 文本颜色
    textColor: {
      type: String,
      value: '#000000'
    },
    // 应用工厂生成模式 - 只传必要参数，其他用默认值
    // 示例1: [ {type: 'notification', hasUnread: true} ]
    // 示例2: [ {type: 'back'}, {type: 'home'} ]
    navButtons: {
      type: Array,
      value: []
    }
  },

  data: {
    statusBarHeight: 0,
    navBarHeight: 50,
    totalHeight: 0,
    notificationLeft: '140rpx',
    // 导航按钮映射，方便在WXML和方法中使用
    buttonMap: {},
    // 默认按钮配置
    defaultButtons: {
      back: {
        type: 'back',
        icon: 'back',
        show: false,
        url: '',
        delta: 1
      },
      home: {
        type: 'home',
        icon: 'home',
        show: false,
        url: '/pages/index/index'
      },
      logo: {
        type: 'logo',
        icon: 'logo',
        show: false
      },
      notification: {
        type: 'notification',
        icon: 'notification',
        unreadIcon: 'notification-unread',
        show: false,
        url: '/pages/notification/list/list',
        hasUnread: false
      },
      avatar: {
        type: 'avatar',
        icon: 'profile',
        show: false,
        url: '/pages/profile/profile'
      }
    }
  },

  lifetimes: {
    attached() {
      // 获取系统信息
      const systemInfo = storage.get('systemInfo')
      const statusBarHeight = systemInfo.statusBarHeight
      
      // 根据不同平台设置导航栏高度
      let navBarHeight = 50;
      if (systemInfo.platform === 'android') {
        navBarHeight = 54;
      }
      
      // 设置总高度
      const totalHeight = statusBarHeight + navBarHeight;
      
      // 初始化按钮映射
      this.initButtonMap();
      
      // 计算通知按钮位置
      this.calculateNotificationPosition();
      
      this.setData({
        statusBarHeight,
        navBarHeight,
        totalHeight
      });
    }
  },
  
  observers: {
    'navButtons': function(navButtons) {
      this.initButtonMap();
      this.calculateNotificationPosition();
    }
  },

  methods: {
    // 初始化按钮映射
    initButtonMap() {
      const buttonMap = {};
      
      // 处理传入的按钮配置，与默认配置合并
      this.properties.navButtons.forEach(button => {
        const type = button.type;
        const defaultButton = this.data.defaultButtons[type];
        
        // 如果存在默认配置，则合并配置
        if (defaultButton) {
          buttonMap[type] = { ...defaultButton, ...button, show: true };
        } else {
          // 对于自定义按钮，直接使用传入的配置
          buttonMap[type] = { ...button, show: true };
        }
      });
      
      this.setData({ buttonMap });
    },

    calculateNotificationPosition() {
      // 基础位置，只有logo的情况
      let left = 100;
      
      // 如果有返回按钮，增加距离
      if (this.data.buttonMap.back && this.data.buttonMap.back.show) {
        left += 72;
      }
      
      // 如果有主页按钮，增加距离
      if (this.data.buttonMap.home && this.data.buttonMap.home.show) {
        left += 72;
      }
      
      // 如果没有logo，减少距离
      if (this.data.buttonMap.logo && !this.data.buttonMap.logo.show) {
        left -= 100;
      }
      
      this.setData({
        notificationLeft: `${left}rpx`
      });
    },

    onButtonTap(e) {
      const type = e.currentTarget.dataset.type;
      const button = this.data.buttonMap[type];
      
      if (!button) return;

      // 先触发事件，给父组件机会处理（如果有自定义处理）
      const eventDetail = { type, button };
      const eventOptions = { bubbles: true, composed: true };
      const eventResult = this.triggerEvent(type, eventDetail, eventOptions);
      
      // 检查是否阻止了默认行为
      if (eventResult === false) {
        return;
      }
      
      // 默认行为
      switch (type) {
        case 'back':
          if (button.url) {
            wx.navigateTo({
              url: button.url
            });
          } else {
            wx.navigateBack({
              delta: button.delta || 1
            });
          }
          break;
        case 'home':
          wx.switchTab({
            url: button.url || '/pages/index/index'
          });
          break;
        case 'notification':
          wx.navigateTo({
            url: button.url || '/pages/notification/list/list'
          });
          break;
        case 'avatar':
          wx.navigateTo({
            url: button.url || '/pages/profile/profile'
          });
          break;
        default:
          // 自定义按钮类型
          if (button.url) {
            if (button.url.startsWith('/pages/tabBar/')) {
              wx.switchTab({ url: button.url });
            } else {
              wx.navigateTo({ url: button.url });
            }
          }
          break;
      }
    }
  }
}) 