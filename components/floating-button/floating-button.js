Component({
  properties: {
    icon: {
      type: String,
      value: 'add'
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