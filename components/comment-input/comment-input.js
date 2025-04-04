/**
 * 评论输入组件
 */
Component({
  properties: {
    // 是否显示评论输入框
    show: {
      type: Boolean,
      value: false
    },
    // 输入框内容
    value: {
      type: String,
      value: ''
    },
    // 占位文本
    placeholder: {
      type: String,
      value: '写评论...'
    },
    // 是否显示加载状态
    loading: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 最大字符数
    maxlength: {
      type: Number,
      value: 500
    }
  },

  data: {
    inputHeight: 80, // 输入框初始高度
    focus: false,    // 是否自动获取焦点
    inputValue: ''   // 输入框当前值
  },

  observers: {
    'show': function(show) {
      if (show) {
        this.setData({
          focus: true
        });
      }
    },
    'value': function(value) {
      this.setData({
        inputValue: value
      });
    }
  },

  methods: {
    // 输入事件
    onInput(e) {
      const { value } = e.detail;
      this.setData({
        inputValue: value
      });
      this.triggerEvent('input', { value });
    },

    // 失去焦点事件
    onBlur() {
      if (this.data.inputValue.trim() === '') {
        this.triggerEvent('close');
      }
    },

    // 提交评论
    onSubmit() {
      if (this.data.loading || this.data.disabled) {
        return;
      }
      
      const value = this.data.inputValue.trim();
      if (!value) {
        return;
      }
      
      this.triggerEvent('submit');
    },

    // 关闭评论输入框
    onClose() {
      this.setData({
        focus: false
      });
      this.triggerEvent('close');
    }
  }
}); 