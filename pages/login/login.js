const { ui, nav, storage, ToastType, getAppInfo } = require('../../utils/util');
const baseBehavior = require('../../behaviors/base-behavior');
const authBehavior = require('../../behaviors/auth-behavior');
const app = getApp();

Page({
  behaviors: [baseBehavior, authBehavior],

  data: {
    loading: false,
    error: false,
    errorText: '',
    isLogging: false,
    appInfo: {
      version: '1.0.0',
      appName: 'nkuwiki',
      subtitle: '校园知识共享平台'
    }
  },

  async onLoad() {
    // 获取应用信息
    try {
      const appInfo = await getAppInfo();
      this.setData({
        appInfo: {
          ...this.data.appInfo,
          version: appInfo.version || '1.0.0'
        }
      });
    } catch (err) {
      console.debug('获取应用信息失败:', err);
    }
    
    // 检查是否已登录
    if (this.isLoggedIn()) {
      nav.switchTab('/pages/index/index');
    }
    storage.set('isLogging', false);
  },

  onUnload() {
    storage.set('isLogging', false);
  },

  async handleLogin() {
    if (this.data.isLogging) {
      return;
    }

    this.setData({ isLogging: true, error: false, errorText: '' });
    
    try {
      // 使用auth-behavior中的wxLogin方法
      const loginResult = await this.wxLogin();
      if (loginResult.code === 200) {
        // 登录成功，直接跳转到首页
        nav.switchTab('/pages/index/index');
      } else {
        throw new Error(loginResult.message || '登录失败');
      }
    } catch (err) {
      ui.showToast(err.message || '登录失败，请重试', { type: ToastType.ERROR });
      this.setData({ 
        error: true,
        errorText: err.message || '登录失败，请重试'
      });
    } finally {
      this.setData({ isLogging: false });
    }
  },

  onAgreementTap(e) {
    const type = e.detail?.type || e.currentTarget.dataset.type;
    const title = type === 'user' ? '用户协议' : '隐私政策';
    wx.showModal({
      title,
      content: `您正在查看${title}，该功能正在开发中`,
      showCancel: false,
      confirmText: '知道了'
    });
  }
}); 