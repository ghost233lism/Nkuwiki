Component({
  /**
   * 组件的属性列表
   */
  properties: {
    type: {
      type: String,
      value: 'primary' // primary, default, warn
    },
    size: {
      type: String,
      value: '' // medium, mini
    },
    plain: {
      type: Boolean,
      value: false
    },
    disabled: {
      type: Boolean,
      value: false
    },
    loading: {
      type: Boolean,
      value: false
    },
    icon: {
      type: String,
      value: ''
    },
    customClass: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onClick: function() {
      if (!this.data.disabled && !this.data.loading) {
        this.triggerEvent('tap');
      }
    }
  }
}) 