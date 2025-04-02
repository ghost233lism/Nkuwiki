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
    }
  }
}); 