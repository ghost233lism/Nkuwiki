Component({
  properties: {
    customClass: {
      type: String,
      value: ''
    },
    loading: {
      type: Boolean,
      value: false
    }
  },

  data: {
    features: [
      { icon: 'edit', text: '发帖' },
      { icon: 'comment', text: '评论' },
      { icon: 'star', text: '收藏' },
      { icon: 'share', text: '分享' }
    ]
  },

  methods: {
    onLogin() {
      // 直接触发登录事件，由页面统一处理
      if (this.data.loading) return;
      this.triggerEvent('login');
    },

    onAgreementTap(e) {
      const type = e.currentTarget.dataset.type;
      this.triggerEvent('agreement', { type });
    }
  }
}) 