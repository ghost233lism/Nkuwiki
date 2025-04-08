Component({
  properties: {
    // nav-bar 属性
    title: {
      type: String,
      value: '消息通知'
    },
    showBack: {
      type: Boolean,
      value: true
    },
    showHome: {
      type: Boolean,
      value: false
    },
    showAvatar: {
      type: Boolean,
      value: true
    },
    bgColor: {
      type: String,
      value: '#ffffff'
    },
    textColor: {
      type: String,
      value: '#000000'
    },
    
    // tabs 属性 - 支持两种方式
    tabTitles: {
      type: Array,
      value: []
    },
    customTabs: {
      type: Array,
      value: []
    },
    useCustomTabs: {
      type: Boolean,
      value: false
    },
    activeTab: {
      type: Number,
      value: 0
    },
    activeTabColor: {
      type: String,
      value: '#07c160'
    },
    equalWidth: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    // 处理选项卡变更
    onTabChange(e) {
      this.triggerEvent('change', e.detail);
    },
    
    // 处理导航栏按钮点击
    onButtonTap(e) {
      // 将事件传递给父组件
      this.triggerEvent('buttonTap', e.detail);
    },
    
    // 处理自定义tab事件
    onTabEvent(e) {
      this.triggerEvent(e.type, e.detail);
    }
  }
})