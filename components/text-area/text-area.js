/**
 * 文本域组件
 */
Component({
  options: {
    styleIsolation: 'isolated'
  },
  
  properties: {
    // 文本内容
    value: {
      type: String,
      value: ''
    },
    // 占位文本
    placeholder: {
      type: String,
      value: '请输入内容'
    },
    // 最大字符数
    maxlength: {
      type: Number,
      value: 140
    },
    // 高度
    height: {
      type: Number,
      value: 200
    },
    // 是否显示计数器
    showCount: {
      type: Boolean,
      value: true
    },
    // 是否自动获取焦点
    focus: {
      type: Boolean,
      value: false
    },
    // 是否允许自动增高
    autoHeight: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否保留空格和换行
    space: {
      type: Boolean,
      value: false
    },
    // 键盘弹起时，是否自动上推页面
    adjustPosition: {
      type: Boolean,
      value: true
    }
  },
  
  data: {
    // 当前字符数
    currentLength: 0
  },
  
  observers: {
    'value': function(value) {
      this.setData({
        currentLength: value ? value.length : 0
      });
    }
  },
  
  attached() {
    this.setData({
      currentLength: this.properties.value ? this.properties.value.length : 0
    });
  },
  
  methods: {
    // 输入事件
    onInput(e) {
      const value = e.detail.value;
      this.setData({
        currentLength: value.length
      });
      this.triggerEvent('input', {
        value,
        cursor: e.detail.cursor
      });
    },
    
    // 获取焦点事件
    onFocus(e) {
      this.triggerEvent('focus', e.detail);
    },
    
    // 失去焦点事件
    onBlur(e) {
      this.triggerEvent('blur', e.detail);
    },
    
    // 确认事件
    onConfirm(e) {
      this.triggerEvent('confirm', e.detail);
    }
  }
}); 