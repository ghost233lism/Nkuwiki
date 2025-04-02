Component({
  properties: {
    appName: {
      type: String,
      value: 'nkuwiki'
    },
    version: {
      type: String,
      value: '1.0.0'
    },
    subtitle: {
      type: String,
      value: '校园知识共享平台'
    },
    logoSize: {
      type: Number,
      value: 160
    }
  },

  data: {
    isAnimating: false
  },

  methods: {
    onTap() {
      if (this.data.isAnimating) return;
      
      this.setData({ isAnimating: true });
      
      // 添加动画结束监听
      setTimeout(() => {
        this.setData({ isAnimating: false });
      }, 1000);

      this.triggerEvent('tap');
    }
  }
});