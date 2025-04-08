/**
 * 纯标签栏组件
 * 可以独立使用，不依赖其他组件
 */
Component({
  properties: {
    // tabs 属性
    tabs: {
      type: Array,
      value: []
    },
    // 自定义格式的tabs，可以包含多种属性
    customTabs: {
      type: Array,
      value: []
    },
    // 是否使用自定义tabs
    useCustomTabs: {
      type: Boolean,
      value: false
    },
    activeTab: {
      type: Number,
      value: 0
    },
    // 样式相关
    bgColor: {
      type: String,
      value: '#ffffff'
    },
    textColor: {
      type: String,
      value: '#666666'
    },
    activeColor: {
      type: String,
      value: '#07c160'
    },
    fixed: {
      type: Boolean,
      value: false
    },
    // 固定在顶部时的导航栏高度（用于定位）
    navBarHeight: {
      type: Number,
      value: 0
    },
    // 是否显示底部线条
    showLine: {
      type: Boolean,
      value: true
    },
    // 是否可滚动
    scrollable: {
      type: Boolean,
      value: true
    },
    // 是否等宽分布
    equalWidth: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    // 处理选项卡变更
    onTabChange(e) {
      const index = parseInt(e.currentTarget.dataset.index);
      if (index === this.properties.activeTab) return;
      
      const tabData = this.properties.useCustomTabs ? this.properties.customTabs[index] : null;
      this.triggerEvent('change', { 
        index,
        tab: tabData
      });
    },
    
    // 响应自定义事件
    onTabEvent(e) {
      const { index, event } = e.currentTarget.dataset;
      if (!event) return;
      
      const tabData = this.properties.useCustomTabs ? this.properties.customTabs[index] : null;
      this.triggerEvent(event, {
        index,
        tab: tabData
      });
    }
  }
}); 