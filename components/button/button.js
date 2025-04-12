Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮类型：primary, secondary, warn
    type: {
      type: String,
      value: 'default'
    },
    // 按钮尺寸：large, medium, mini
    size: {
      type: String,
      value: 'medium'
    },
    // 图标名称
    icon: {
      type: Object,
      value: null
    },
    // 图标位置：left, right
    iconPosition: {
      type: String,
      value: 'left'
    },
    // 自定义样式
    customStyle: String,
    // 是否为圆形按钮
    circle: Boolean,
    // 是否为圆角按钮
    round: Boolean,
    // 是否为悬浮按钮
    floating: Boolean,
    // 悬浮按钮位置
    floatingPosition: {
      type: String,
      value: 'bottom-right'
    },
    // 是否禁用
    disabled: Boolean,
    // 文本内容
    text: String,
    // 开放能力
    openType: String,
    // 是否显示加载状态
    loading: Boolean,
    // 计数器
    count: {
      type: Number,
      value: 0
    },
    // 计数器显示阈值
    countThreshold: {
      type: Number,
      value: 0
    },
    textSize: {
      type: Number,
      value: 28
    },
    textColor: String,
    shape: String
  },

  data: {
    timer: null
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 点击事件
    onClick(e) {
      if (this.data.disabled || this.data.loading) return;
      this.triggerEvent('click', e);
    },

    // 获取用户信息回调
    onGetUserInfo(e) {
      this.triggerEvent('getuserinfo', e.detail);
    },

    // 获取手机号回调
    onGetPhoneNumber(e) {
      this.triggerEvent('getphonenumber', e.detail);
    },

    // 打开设置页回调
    onOpenSetting(e) {
      this.triggerEvent('opensetting', e.detail);
    },

    // 选择头像回调
    onChooseAvatar(e) {
      this.triggerEvent('chooseavatar', e.detail);
    }
  }
}) 