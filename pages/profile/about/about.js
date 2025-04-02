const { ui, error, ToastType , getAppInfo} = require('../../../utils/util');


// behaviors
const pageBehavior = require('../../../behaviors/page-behavior');
const baseBehavior = require('../../../behaviors/base-behavior');

Page({
  behaviors: [baseBehavior, pageBehavior],

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
    error: false
  },

  async onLoad() {
    console.debug('【About】页面onLoad触发');
    this.loadAboutInfo();
  },

  async loadAboutInfo() {
    const appInfo = await getAppInfo();
    this.setData({
      companyInfo: appInfo
    });
  },

  contactUs() {
    const { email } = this.data.companyInfo;
    if (!email) return;

    wx.setClipboardData({
      data: email,
      success: () => {
        ui.showToast('邮箱已复制', { type: ToastType.SUCCESS });
      }
    });
  },
  
  onPullDownRefresh() {
    console.debug('【About】下拉刷新');
    this.loadAboutInfo().finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 添加重试方法
  onRetry() {
    console.debug('【About】点击重试');
    this.loadAboutInfo();
  }
}); 