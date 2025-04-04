Component({
  properties: {
    tabs: {
      type: Array,
      value: []
    },
    activeTab: {
      type: Number,
      value: 0
    },
    scrollable: {
      type: Boolean,
      value: true
    },
    customClass: {
      type: String,
      value: ''
    }
  },

  methods: {
    onTabTap(e) {
      const index = e.currentTarget.dataset.index
      if (index !== this.properties.activeTab) {
        this.triggerEvent('change', { index })
      }
    }
  }
}) 