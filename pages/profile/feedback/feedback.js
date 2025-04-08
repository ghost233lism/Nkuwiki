const { ui, error, ToastType, createApiClient } = require('../../../utils/util');

// 创建反馈API客户端
const feedbackApi = createApiClient('/api/wxapp/feedback', {
  // 提交反馈 POST /api/wxapp/feedback
  submit: {
    method: 'POST',
    data: {
      openid: true,
      content: true,
      type: true,
      contact: true,
      device_info: true
    }
  },
  // 获取反馈列表 GET /api/wxapp/feedback/list
  getList: {
    method: 'GET',
    path: '/list',
    params: {
      openid: true,
      limit: true,
      offset: true
    }
  }
});

// behaviors
const baseBehavior = require('../../../behaviors/baseBehavior');
const authBehavior = require('../../../behaviors/authBehavior');
const weuiBehavior = require('../../../behaviors/weuiBehavior');

Page({
  behaviors: [baseBehavior, authBehavior, weuiBehavior],

  data: {
    types: [
      { label: '功能异常', value: 'bug' },
      { label: '功能建议', value: 'suggestion' },
      { label: '其他问题', value: 'other' }
    ],
    typeLabels: ['功能异常', '功能建议', '其他问题'],
    typeValues: ['bug', 'suggestion', 'other'],
    feedbackType: 'bug',
    typeName: '功能异常',
    content: '',
    contact: '',
    submitting: false,
    deviceInfo: null
  },
  
  onLoad() {
    // 初始化页面数据
    console.debug('页面初始化');
    this.initDeviceInfo();
  },

  // 初始化设备信息
  initDeviceInfo() {
    try {
      // 使用新API替代已废弃的getSystemInfoSync
      const appBaseInfo = wx.getAppBaseInfo();
      const deviceInfo = wx.getDeviceInfo();
      
      this.setData({
        deviceInfo: {
          model: deviceInfo.model,
          system: deviceInfo.system,
          platform: deviceInfo.platform,
          sdkVersion: appBaseInfo.SDKVersion
        }
      });
    } catch (err) {
      console.error('获取设备信息失败:', err);
    }
  },
  
  // 反馈类型变更 - 使用picker-field
  onTypeChange(e) {
    const { value, index } = e.detail;
    this.setData({
      typeName: value,
      feedbackType: this.data.typeValues[index]
    });
    console.debug(`[Feedback] 类型变更: ${value}, 索引:${index}, 值:${this.data.feedbackType}`);
  },
  
  // 反馈内容变更
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },
  
  // 联系方式变更 - 使用input-field
  onContactInput(e) {
    this.setData({
      contact: e.detail.value
    });
  },

  // 提交反馈
  async submitFeedback() {
    if (this.data.submitting) return;
    
    // 基本验证
    if (!this.data.content || this.data.content.length < 5) {
      this.showToptips('请填写反馈内容（至少5个字）', 'error');
      return;
    }
    
    try {
      this.setData({ submitting: true });
      this.showLoading('提交中...');

      const payload = {
        openid: this.data.openid,
        content: this.data.content,
        type: this.data.feedbackType,
        contact: this.data.contact,
        device_info: this.data.deviceInfo
      };

      const res = await feedbackApi.submit(payload);
      
      if (res.code === 200) {
        this.showToptips('提交成功，感谢您的反馈', 'success');
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        throw new Error(res.message || '提交失败');
      }
    } catch (err) {
      this.showToptips(err.message || '提交失败，请稍后重试', 'error');
    } finally {
      this.hideLoading();
      this.setData({ submitting: false });
    }
  }
}); 