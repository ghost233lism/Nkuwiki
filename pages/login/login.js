const baseBehavior = require('../../behaviors/baseBehavior');
const authBehavior = require('../../behaviors/authBehavior');

Page({
  behaviors: [baseBehavior, authBehavior],

  data: {
    appInfo: {
      version: '0.0.2',
      appName: 'nkuwiki',
      subtitle: '校园知识共享平台'
    }
  },
  async onLoad() {
    this.updateState({
      version: this.getStorage('aboutInfo').version,
      loading: false,
      error: false,
    });
    const res = await this._syncUserInfo();
    if(res.code === 200){
      this.setStorage('isLoggedIn', true);
      if(res.details.message === '用户已存在'){
        this.reLaunch('/pages/index/index');
      }
      //这里不直接进index页面单纯是为了让新用户点一下登录按钮qwq
    }
  },

  async onPullDownRefresh() {
    this.refreshPage();
    wx.stopPullDownRefresh();
  },
  // 刷新页面
  async refreshPage() {
    this.updateState({ error: false, errorText: '' });
    await this.getVersionInfo();
  },

  async handleLogin() {
    this.reLaunch('/pages/index/index');
  },

  async onAgreementTap(e) {
    const type = e.detail?.type || e.currentTarget.dataset.type;
    const title = type === 'user' ? '用户协议' : '隐私政策';
    this.showModal({
      title,
      content: `您正在查看${title}，该功能正在开发中`,
      showCancel: false,
      confirmText: '知道了'
    });
  }
}); 