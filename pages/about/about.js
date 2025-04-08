const { ui, error, ToastType, getAppInfo } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');

Page({
  behaviors: [baseBehavior],

  data: {
    companyInfo: {
      app_name: '',
      version: '',
      description: '',
      company: '',
      email: '',
      github: '',
      website: '',
      copyright: ''
    },
    currentYear: new Date().getFullYear(),
    loading: true,
    error: false,
    errorMsg: ''
  },

  async onLoad() {
    this.setData({ loading: true });
    try {
      const appInfo = await getAppInfo();
      this.setData({
        companyInfo: appInfo,
        loading: false
      });
    } catch (err) {
      this.setData({ 
        error: true, 
        errorMsg: '加载信息失败，请重试',
        loading: false
      });
    }
  },
  // 处理链接点击
  onLinkTap(e) {
    const link = e.currentTarget.dataset.link;
    if (!link) return;
    
    // 判断链接类型并处理
    if (link.startsWith('http://') || link.startsWith('https://')) {
      // 直接跳转到webview页面
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(link)}&title=外部网页`
      });
    } else if (link.includes('@')) {
      // 如果是邮箱，直接复制到剪贴板
      this._copyToClipboard(link, '邮箱已复制');
    } else {
      // 复制其他类型的链接到剪贴板
      this._copyToClipboard(link);
    }
  },
  
  // 复制到剪贴板的通用方法
  _copyToClipboard(content, message = '链接已复制') {
    wx.setClipboardData({
      data: content,
      success: () => {
        ui.showToast(message, { type: ToastType.SUCCESS });
      }
    });
  },

  contactUs() {
    const { email } = this.data.companyInfo;
    if (!email) return;

    // 直接复制邮箱到剪贴板，无需提示
    wx.setClipboardData({
      data: email,
      success: () => {
        ui.showToast('邮箱已复制', { type: ToastType.SUCCESS });
      }
    });
  },
  
  onPullDownRefresh() {
    this.loadAboutInfo().finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  onRetry() {
    this.loadAboutInfo();
  }
}); 