Component({
  properties: {
    // nav-bar 属性
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: false
    },
    showHome: {
      type: Boolean,
      value: false
    },
    bgColor: {
      type: String,
      value: '#ffffff'
    },
    textColor: {
      type: String,
      value: '#000000'
    },
    
    // tabs 属性
    tabTitles: {
      type: Array,
      value: []
    },
    activeTab: {
      type: Number,
      value: 0
    }
  },

  methods: {
    onTabChange(e) {
      const index = parseInt(e.currentTarget.dataset.index);
      if (index === this.data.activeTab) return;
      
      this.setData({ activeTab: index });
      this.triggerEvent('change', { index });
    }
  }
})