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
    
    // tabs 属性
    tabTitles: {
      type: Array,
      value: []
    },
    activeTab: {
      type: Number,
      value: 0
    }
  },

  methods: {
    // 处理选项卡变更
    onTabChange(e) {
      const index = parseInt(e.currentTarget.dataset.index);
      if (index === this.data.activeTab) return;
      
      this.setData({ activeTab: index });
      this.triggerEvent('change', { index });
    },
    
    // 处理导航栏按钮点击
    onButtonTap(e) {
      // 将事件传递给父组件
      this.triggerEvent('buttonTap', e.detail);
    }
  }
})