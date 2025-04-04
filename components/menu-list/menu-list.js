Component({
  properties: {
    items: {
      type: Array,
      value: []
    },
    customClass: {
      type: String,
      value: ''
    }
  },

  methods: {
    onItemTap(e) {
      const { index } = e.currentTarget.dataset
      const item = this.data.items[index]
      
      if (item.url) {
        wx.navigateTo({
          url: item.url
        })
      }
      
      this.triggerEvent('click', { item, index })
    }
  }
}) 