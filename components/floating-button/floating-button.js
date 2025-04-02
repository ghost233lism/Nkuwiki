Component({
  properties: {
    icon: {
      type: String,
      value: 'edit'
    },
    text: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: 'primary'
    },
    position: {
      type: String,
      value: 'bottom-right'
    },
    size: {
      type: String,
      value: 'large'
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onClick() {
      if (this.data.disabled) return;
      this.triggerEvent('tap');
    }
  }
}) 