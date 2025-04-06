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
    },
    // 是否显示标题前的装饰线
    showTitleDecoration: {
      type: Boolean,
      value: true
    },
    // 自定义样式
    customStyle: {
      type: String,
      value: ''
    }
  },

  data: {
    // 处理后的菜单项
    processedItems: []
  },

  observers: {
    'items': function(items) {
      // 处理菜单项，确保所有必要字段都存在
      if (Array.isArray(items)) {
        const processedItems = items.map(item => {
          return {
            ...item,
            // 确保icon和iconName正确处理
            icon: item.icon || false,
            iconName: item.iconName || ''
          };
        });
        this.setData({ processedItems });
      }
    }
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