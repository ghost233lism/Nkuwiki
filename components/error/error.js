Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    text: {
      type: String,
      value: '出错了，请稍后再试'
    }
  },

  methods: {
    // 关闭错误提示
    close() {
      this.triggerEvent('close');
    },

    // 重试操作
    retry() {
      this.triggerEvent('retry');
    }
  }
}); 