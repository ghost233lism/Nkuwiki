/**
 * 通用底部操作栏组件
 */
Component({
  options: {
    styleIsolation: 'isolated'
  },
  
  properties: {
    // 操作按钮列表
    actions: {
      type: Array,
      value: []
      /*
        格式：[
          {
            id: 'action1',   // 操作ID
            icon: 'like',    // 图标名称
            text: '点赞',    // 按钮文字
            count: 0,       // 计数（可选）
            active: false,  // 是否激活状态
            activeIcon: 'like_active', // 激活状态的图标（可选）
            disabled: false // 是否禁用
          }
        ]
      */
    },
    // 是否固定在底部
    fixed: {
      type: Boolean,
      value: true
    },
    // 操作栏背景色
    background: {
      type: String,
      value: '#ffffff'
    },
    // 是否显示上边框
    showBorder: {
      type: Boolean,
      value: true
    },
    // 按钮样式类型
    buttonType: {
      type: String,
      value: 'icon-text' // 可选：icon-text, icon-only, text-only
    },
    // 按钮大小
    buttonSize: {
      type: String,
      value: 'medium' // 可选：small, medium, large
    },
    // 额外的内容插槽
    showExtra: {
      type: Boolean,
      value: false
    },
    // 是否为安全区适配
    safeAreaInsetBottom: {
      type: Boolean,
      value: true
    }
  },
  
  data: {
    // 图标尺寸映射
    sizeMap: {
      small: 40,
      medium: 48,
      large: 56
    }
  },
  
  methods: {
    // 点击操作按钮
    handleAction(e) {
      const { index } = e.currentTarget.dataset;
      const action = this.properties.actions[index];
      
      if (!action || action.disabled) {
        return;
      }
      
      this.triggerEvent('action', {
        action: action.id,
        index,
        item: action
      });
    },
    
    // 获取图标尺寸
    getIconSize() {
      return this.data.sizeMap[this.properties.buttonSize] || 48;
    }
  }
}); 