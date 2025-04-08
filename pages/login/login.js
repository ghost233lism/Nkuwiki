const baseBehavior = require('../../behaviors/baseBehavior');
const authBehavior = require('../../behaviors/authBehavior');
const { getAboutInfo } = require('../../utils/util');
Page({
  behaviors: [baseBehavior, authBehavior],

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
  },
  async onLoad() {
    try {
      let aboutInfo = await getAboutInfo();
      // 确保有默认值，避免传null给组件
      this.updateState({
        companyInfo: {
          app_name: aboutInfo?.app_name || 'nkuwiki',
          version: aboutInfo?.version || '0.0.1',
          description: aboutInfo?.description || '校园知识共享平台',
          company: aboutInfo?.company || '',
          email: aboutInfo?.email || '',
          github: aboutInfo?.github || '',
          website: aboutInfo?.website || '',
          copyright: aboutInfo?.copyright || ''
        },
        loading: false,
        error: false,
      });

      try {
        const res = await this._syncUserInfo();
        if(res && res.code === 200){
          this.setStorage('isLoggedIn', true);
          if(res.details && res.details.message === '用户已存在'){
            wx.reLaunch({
              url: '/pages/index/index'
            });
          }
          //这里不直接进index页面单纯是为了让新用户点一下登录按钮qwq
        }
      } catch (err) {
        console.warn('登录状态同步失败，需要用户手动登录', err);
      }
    } catch (err) {
      console.error('加载页面数据失败', err);
      this.updateState({
        companyInfo: {
          app_name: 'nkuwiki',
          version: '0.0.1',
          description: '校园知识共享平台',
          company: '',
          email: '',
          github: '',
          website: '',
          copyright: ''
        },
        loading: false,
        error: false,
      });
    }
  },

  async onPullDownRefresh() {
    this.refreshPage();
    wx.stopPullDownRefresh();
  },
  // 刷新页面
  async refreshPage() {
    this.updateState({ error: false, errorText: '' });
    
    try {
      // 获取最新的应用信息
      let aboutInfo = await getAboutInfo();
      
      this.updateState({
        companyInfo: {
          app_name: aboutInfo?.app_name || 'nkuwiki',
          version: aboutInfo?.version || '0.0.1',
          description: aboutInfo?.description || '校园知识共享平台',
          company: aboutInfo?.company || '',
          email: aboutInfo?.email || '',
          github: aboutInfo?.github || '',
          website: aboutInfo?.website || '',
          copyright: aboutInfo?.copyright || ''
        }
      });
    } catch (err) {
      console.error('刷新页面失败', err);
    }
  },

  async handleLogin() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
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