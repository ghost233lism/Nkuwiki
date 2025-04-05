Component({
  properties: {
    // 标题
    title: {
      type: String,
      value: '菜单'
    },
    // 菜单项
    items: {
      type: Array,
      value: []
    },
    // 是否加载中
    loading: {
      type: Boolean,
      value: false
    },
    // 错误状态
    error: {
      type: Boolean,
      value: false
    },
    // 错误信息
    errorMsg: {
      type: String,
      value: ''
    }
  },

  data: {
  },

  methods: {
    // 点击菜单项
    onItemTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.properties.items[index];
      this.triggerEvent('itemTap', { index, item });
    },
    
    // 处理重试事件
    onRetry() {
      this.triggerEvent('retry');
    }
  }
}); 