const {
  getStorage,
  formatTime
} = require('../../../utils/util');
const api = require('../../../utils/api/index');

Page({
  data: {
    companyInfo: {},
    currentYear: new Date().getFullYear(),
    platforms: [],
    contributions: [],
    loading: true,
    error: false
  },

  async onLoad() {
    console.debug('加载关于页面');
    try {
      wx.showLoading({ title: '加载中...' });
      const result = await api.user.getAboutInfo();
      
      if (result?.success && result.data) {
        this.setData({
          companyInfo: result.data.companyInfo || {},
          platforms: result.data.platforms || [],
          contributions: result.data.contributions || [],
          loading: false
        });
      } else {
        throw new Error(result?.message || '获取数据失败');
      }
    } catch (err) {
      console.debug('获取关于信息失败:', err);
      this.setData({
        loading: false,
        error: true
      });
      
      wx.showToast({
        title: '获取信息失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  contactUs() {
    const { email } = this.data.companyInfo;
    if (email) {
      wx.setClipboardData({
        data: email,
        success: () => {
          wx.showToast({
            title: '邮箱已复制',
            icon: 'success'
          });
        }
      });
    }
  },
  
  refresh() {
    this.setData({ loading: true, error: false });
    this.onLoad();
  }
}); 