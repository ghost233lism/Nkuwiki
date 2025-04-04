/**
 * 通用设置项组件
 * 用于设置页面、个人中心等场景
 */
Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  
  properties: {
    // 设置项标题
    title: {
      type: String,
      value: ''
    },
    
    // 设置项描述/副标题
    subtitle: {
      type: String,
      value: ''
    },
    
    // 设置项图标
    icon: {
      type: String,
      value: ''
    },
    
    // 图标尺寸
    iconSize: {
      type: Number,
      value: 40
    },
    
    // 图标颜色
    iconColor: {
      type: String,
      value: ''
    },
    
    // 右侧类型: text(文本), switch(开关), arrow(箭头)
    rightType: {
      type: String,
      value: 'arrow'  // 默认为箭头
    },
    
    // 右侧文本内容，当rightType为text时有效
    value: {
      type: String,
      value: ''
    },
    
    // 开关状态，当rightType为switch时有效
    checked: {
      type: Boolean,
      value: false
    },
    
    // 是否显示分割线
    showDivider: {
      type: Boolean,
      value: true
    },
    
    // 是否为链接（有点击效果）
    isLink: {
      type: Boolean,
      value: true
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    
    // 跳转链接（如果有）
    url: {
      type: String,
      value: ''
    },
    
    // 跳转方式: navigate, redirect, switchTab, reLaunch
    linkType: {
      type: String,
      value: 'navigate'
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
  },
  
  methods: {
    // 点击设置项
    onClick() {
      if (this.data.disabled) return;
      
      // 触发点击事件
      this.triggerEvent('click');
      
      // 如果是链接且有url，则进行跳转
      if (this.data.isLink && this.data.url) {
        const url = this.data.url;
        switch (this.data.linkType) {
          case 'navigate':
            wx.navigateTo({ url });
            break;
          case 'redirect':
            wx.redirectTo({ url });
            break;
          case 'switchTab':
            wx.switchTab({ url });
            break;
          case 'reLaunch':
            wx.reLaunch({ url });
            break;
          default:
            wx.navigateTo({ url });
        }
      }
    },
    
    // 切换开关状态
    onSwitchChange(e) {
      if (this.data.disabled) return;
      
      const checked = e.detail.value;
      this.triggerEvent('change', { checked });
    }
  }
}); 