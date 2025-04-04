Component({
  properties: {
    value: {
      type: String,
      value: ''
    },
    placeholder: {
      type: String,
      value: '搜索'
    },
    focus: {
      type: Boolean,
      value: false
    },
    showAction: {
      type: Boolean,
      value: true
    },
    actionText: {
      type: String,
      value: '搜索'
    },
    backgroundColor: {
      type: String,
      value: '#f5f5f5'
    }
  },

  data: {
    inputValue: ''
  },

  lifetimes: {
    attached() {
      this.setData({
        inputValue: this.properties.value
      })
    }
  },

  methods: {
    onInput(e) {
      const value = e.detail.value
      this.setData({
        inputValue: value
      })
      this.triggerEvent('input', { value })
    },

    onClear() {
      this.setData({
        inputValue: ''
      })
      this.triggerEvent('clear')
      this.triggerEvent('input', { value: '' })
    },

    onFocus(e) {
      this.triggerEvent('focus', e.detail)
    },

    onBlur(e) {
      this.triggerEvent('blur', e.detail)
    },

    onConfirm(e) {
      this.triggerEvent('confirm', { value: this.data.inputValue })
    },

    onAction() {
      this.triggerEvent('action', { value: this.data.inputValue })
    }
  }
}) 