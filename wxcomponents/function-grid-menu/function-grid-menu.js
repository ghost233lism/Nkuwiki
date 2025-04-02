Component({
  /**
   * 组件的属性列表
   */
  properties: {
    title: {
      type: String,
      value: ''
    },
    menuItems: {
      type: Array,
      value: []
    }
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {
    onMenuItemTap: function(e) {
      const type = e.currentTarget.dataset.type;
      this.triggerEvent('itemtap', { type: type });
    }
  }
}) 