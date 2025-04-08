Component({
  properties: {
    label: {
      type: String,
      value: ''
    },
    name: {
      type: String,
      value: ''
    },
    value: {
      type: String,
      value: ''
    },
    placeholder: {
      type: String,
      value: '请输入'
    },
    type: {
      type: String,
      value: 'text' // text, number, idcard, digit, textarea
    },
    password: {
      type: Boolean,
      value: false
    },
    disabled: {
      type: Boolean,
      value: false
    },
    readonly: {
      type: Boolean,
      value: false
    },
    maxlength: {
      type: Number,
      value: 140
    },
    showClear: {
      type: Boolean,
      value: true
    },
    focus: {
      type: Boolean,
      value: false
    },
    confirmType: {
      type: String,
      value: 'done' // done, send, next, search, go
    },
    confirmHold: {
      type: Boolean,
      value: false
    },
    showCounter: {
      type: Boolean,
      value: false
    },
    customStyle: {
      type: String,
      value: ''
    }
  },

  data: {
    inputValue: '',
    isFocus: false
  },

  observers: {
    'value': function(value) {
      this.setData({
        inputValue: value
      })
    }
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
      this.triggerEvent('input', { value, name: this.properties.name })
    },

    onFocus(e) {
      this.setData({
        isFocus: true
      })
      this.triggerEvent('focus', e.detail)
    },

    onBlur(e) {
      this.setData({
        isFocus: false
      })
      this.triggerEvent('blur', e.detail)
    },

    onClear() {
      this.setData({
        inputValue: ''
      })
      this.triggerEvent('input', { value: '', name: this.properties.name })
      this.triggerEvent('clear')
    },

    onConfirm(e) {
      this.triggerEvent('confirm', { value: this.data.inputValue })
    }
  }
}) 