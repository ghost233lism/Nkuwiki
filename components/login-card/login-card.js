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
      if (this.data.loading) return;
      
      this.setData({ loading: true });
      
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          this.triggerEvent('login', {
            userInfo: res.userInfo
          });
        },
        fail: (err) => {
          console.debug('用户拒绝授权', err);
          wx.showToast({
            title: '需要授权才能使用完整功能',
            icon: 'none',
            duration: 2000
          });
        },
        complete: () => {
          this.setData({ loading: false });
        }
      });
    },

    onAgreementTap(e) {
      const type = e.currentTarget.dataset.type;
      this.triggerEvent('agreement', { type });
    }
  }
}) 