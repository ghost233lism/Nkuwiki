const { aboutAPI, logger } = require('../../../utils/api');

Page({
  data: {
    platformInfo: null,
    versions: [],
    loading: true,
    activeTab: 'info', // 当前激活的标签页：info-平台信息，versions-版本历史，agreement-用户协议，privacy-隐私政策
    agreement: { title: '', content: '' },
    privacy: { title: '', content: '' }
  },

  onLoad: function(options) {
    this.loadPlatformInfo();
    this.loadVersionHistory();
  },

  // 加载平台信息
  loadPlatformInfo: function() {
    aboutAPI.getPlatformInfo().then(res => {
      logger.debug('获取平台信息成功:', res);
      this.setData({
        platformInfo: res,
        loading: false
      });
    }).catch(err => {
      logger.error('获取平台信息失败:', err);
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '获取平台信息失败',
        icon: 'none'
      });
    });
  },

  // 加载版本历史
  loadVersionHistory: function() {
    aboutAPI.getVersionHistory(10).then(res => {
      logger.debug('获取版本历史成功:', res);
      this.setData({
        versions: res.versions || [],
        loading: false
      });
    }).catch(err => {
      logger.error('获取版本历史失败:', err);
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '获取版本历史失败',
        icon: 'none'
      });
    });
  },

  // 加载用户协议
  loadAgreement: function() {
    if (this.data.agreement.content) {
      return; // 已加载过就不再重复请求
    }

    aboutAPI.getAgreement('user').then(res => {
      logger.debug('获取用户协议成功:', res);
      this.setData({
        agreement: res
      });
    }).catch(err => {
      logger.error('获取用户协议失败:', err);
      wx.showToast({
        title: '获取用户协议失败',
        icon: 'none'
      });
    });
  },

  // 加载隐私政策
  loadPrivacyPolicy: function() {
    if (this.data.privacy.content) {
      return; // 已加载过就不再重复请求
    }

    aboutAPI.getAgreement('privacy').then(res => {
      logger.debug('获取隐私政策成功:', res);
      this.setData({
        privacy: res
      });
    }).catch(err => {
      logger.error('获取隐私政策失败:', err);
      wx.showToast({
        title: '获取隐私政策失败',
        icon: 'none'
      });
    });
  },

  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });

    // 懒加载用户协议和隐私政策
    if (tab === 'agreement') {
      this.loadAgreement();
    } else if (tab === 'privacy') {
      this.loadPrivacyPolicy();
    }
  },

  // 复制联系方式
  copyContact: function(e) {
    const type = e.currentTarget.dataset.type;
    let content = '';

    if (type === 'email' && this.data.platformInfo.email) {
      content = this.data.platformInfo.email;
    } else if (type === 'wechat' && this.data.platformInfo.wechat) {
      content = this.data.platformInfo.wechat;
    } else if (type === 'github' && this.data.platformInfo.github) {
      content = this.data.platformInfo.github;
    }

    if (content) {
      wx.setClipboardData({
        data: content,
        success: function() {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    }
  },

  // 查看团队成员详情
  viewTeamMember: function(e) {
    const index = e.currentTarget.dataset.index;
    const member = this.data.platformInfo.team[index];
    
    if (member) {
      wx.showModal({
        title: member.name,
        content: `角色: ${member.role}`,
        showCancel: false
      });
    }
  }
}); 