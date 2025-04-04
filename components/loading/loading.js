Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    text: {
      type: String,
      value: '加载中...'
    },
    type: {
      type: String,
      value: 'inline', // 可选值: inline, fullscreen, dots
    },
    mask: {
      type: Boolean,
      value: false, // 是否显示遮罩（仅fullscreen时有效）
    },
    color: {
      type: String,
      value: '', // 自定义颜色
    },
    size: {
      type: String,
      value: '', // small, medium, large
    }
  },
  
  data: {
    // 内部数据
  },
  
  methods: {
    // 外部调用方法，显示loading
    showLoading(options = {}) {
      const { text, type, mask } = options;
      const data = { show: true };
      
      if (text !== undefined) data.text = text;
      if (type !== undefined) data.type = type;
      if (mask !== undefined) data.mask = mask;
      
      this.setData(data);
    },
    
    // 外部调用方法，隐藏loading
    hideLoading() {
      this.setData({ show: false });
    }
  }
}); 