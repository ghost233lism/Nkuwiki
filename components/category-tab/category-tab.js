Component({
  properties: {
    tabs: {
      type: Array,
      value: []
    },
    categoryId: {
      type: Number,
      value: 0 // 默认0表示不选中任何分类
    },
    scrollable: {
      type: Boolean,
      value: true
    },
    customClass: {
      type: String,
      value: ''
    },
    showIcon: {
      type: Boolean,
      value: false
    },
    iconSize: {
      type: Number,
      value: 60
    },
    activeColor: {
      type: String,
      value: '#1aad19'
    },
    inactiveColor: {
      type: String,
      value: '#666666'
    },
    activeBgColor: {
      type: String,
      value: ''
    }
  },

  methods: {
    onTabTap(e) {
      const index = e.currentTarget.dataset.index;
      const tab = this.properties.tabs[index];
      this.triggerEvent('change', { 
        index,
        tab
      });
    }
  },

  lifetimes: {
    attached() {
      if (this.properties.activeBgColor) {
        this.createSelectorQuery()
          .select('.category-scroll')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res[0] && res[0].node) {
              res[0].node.style.setProperty('--active-bg-color', this.properties.activeBgColor);
              res[0].node.style.setProperty('--active-color', this.properties.activeColor);
            }
          });
      }
    }
  }
}) 