const baseBehavior = require('../../behaviors/baseBehavior');
const authBehavior = require('../../behaviors/authBehavior');

Page({
  behaviors: [baseBehavior, authBehavior],

  data: {
    isLogging: false,
    appInfo: {
      version: '0.0.2',
      appName: 'nkuwiki',
      subtitle: '校园知识共享平台'
    }
  },
  async onLoad() {
    await this.getVersionInfo();
    // 初始化页面状态，确保组件状态正确
    this.updateState({
      loading: false,
      error: false,
      empty: false,
      success: false,
      errorText: '出错了，请稍后再试'
    });
    
    this.setStorage('isLoggedIn', false);
  },

  // 从storage中获取版本信息
  async getVersionInfo() {
    try {
      const aboutInfo = this.getStorage('aboutInfo');
      if (aboutInfo && aboutInfo.version) {
        this.updateState({
          appInfo: {
            ...this.data.appInfo,
            version: aboutInfo.version
          }
        });
      }
      return aboutInfo;
    } catch (err) {throw err;}
  },

  onPullDownRefresh() {
    this.refreshPage();
    wx.stopPullDownRefresh();
  },
  
  // 刷新页面
  async refreshPage() {
    this.updateState({ error: false, errorText: '' });
    await this.getVersionInfo();
  },

  // 隐藏错误
  hideError() {
    this.updateState({ error: false });
  },

  onUnload() {
    this.setStorage('isLoggedIn', false);
  },

  async handleLogin() {
    if (this.data.isLogging) {
      return;
    }
    this.updateState({ isLogging: true, error: false, errorText: '' });
    // 不再调用showLoading，避免显示两个"登录中"
    try {
      const res = await this._syncUserInfo();
      if (res) {
        // 设置登录状态
        this.setStorage('isLoggedIn', true);
        
        // 直接跳转到首页
        wx.switchTab({
          url: '/pages/index/index',
          complete: () => {
            // 无论成功或失败，都重置登录状态
            this.updateState({ isLogging: false });
          }
        });
      } else {
        throw new Error(res.message || '登录失败');
      }
    } catch (err) {
      console.error('登录失败:', err);
      this.updateState({ 
        isLogging: false,
        error: true,
        errorText: err.message || '登录失败，请重试'
      });
    }
  },
  onAgreementTap(e) {
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