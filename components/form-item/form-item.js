Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  
  properties: {
    // 表单项标签
    label: {
      type: String,
      value: ''
    },
    
    // 表单项描述/提示
    desc: {
      type: String,
      value: ''
    },
    
    // 是否必填
    required: {
      type: Boolean,
      value: false
    },
    
    // 是否显示错误
    error: {
      type: Boolean,
      value: false
    },
    
    // 错误提示文本
    errorMsg: {
      type: String,
      value: ''
    },
    
    // 是否显示分割线
    showDivider: {
      type: Boolean,
      value: true
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    
    // 右侧额外样式
    rightStyle: {
      type: String,
      value: ''
    },
    
    // 整体额外样式
    customStyle: {
      type: String,
      value: ''
    }
  }
}) 