Component({
  /**
   * 组件的属性列表
   */
  properties: {
    history: {
      type: Array,
      value: []
    },
    showResults: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onItemTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.triggerEvent('select', { keyword });
    },
    
    clearHistory() {
      this.triggerEvent('clear');
    }
  }
}) 