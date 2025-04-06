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
    formFields: [
      {
        type: 'radio-group',
        name: 'type',
        label: '反馈类型',
        options: [
          { label: '功能异常', value: 'bug' },
          { label: '功能建议', value: 'suggestion' },
          { label: '其他问题', value: 'other' }
        ],
        value: 'bug',
        required: true
      },
      {
        type: 'textarea',
        name: 'content',
        label: '反馈内容',
        placeholder: '请详细描述问题或建议（5-500字）',
        maxlength: 500,
        required: true,
        autoHeight: true
      },
      {
        type: 'image-uploader',
        name: 'images',
        label: '相关截图',
        maxCount: 3,
        uploadUrl: '/api/upload/image'
      },
      {
        type: 'input',
        name: 'contact',
        label: '联系方式',
        placeholder: '手机/邮箱/微信（选填）'
      }
    ],
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
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      deviceInfo: {
        model: systemInfo.model,
        system: systemInfo.system,
        platform: systemInfo.platform,
        sdkVersion: systemInfo.SDKVersion
      }
    });
  },

  // 表单字段变更
  onFormChange(e) {
    const { name, value } = e.detail;
    console.debug(`[Feedback] 字段变更: ${name}=`, value);
  },

  // 表单提交
  async onFormSubmit(e) {
    if (this.data.submitting) return;
    
    try {
      this.setData({ submitting: true });
      this.showLoading('提交中...');

      const formData = e.detail;
      const payload = {
        ...formData,
        openid: this.data.openid,
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