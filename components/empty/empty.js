Component({
  properties: {
    show: {
      type: Boolean,
      value: true
    },
    text: {
      type: String,
      value: '暂无数据'
    },
    type: {
      type: String,
      value: 'default' // 可选值：default, post, comment, notification, search
    }
  },

  data: {
    icons: {
      default: '/assets/icons/empty.png',
      post: '/assets/icons/empty-post.png',
      comment: '/assets/icons/empty-comment.png',
      notification: '/assets/icons/empty-notification.png',
      search: '/assets/icons/empty-search.png'
    }
  },

  methods: {
    getIconPath() {
      return this.data.icons[this.properties.type] || this.data.icons.default;
    }
  }
}); 