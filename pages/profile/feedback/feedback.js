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
    // 表单数据
    form: {
      type: 'bug',
      content: '',
      contact: '',
      images: []
    },
    // 反馈类型选项
    typeOptions: [
      { label: '功能异常', value: 'bug', checked: true },
      { label: '功能建议', value: 'suggestion' },
      { label: '其他问题', value: 'other' }
    ],
    // 图片上传配置
    imageConfig: {
      maxCount: 3,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera']
    },
    // 加载状态
    submitting: false
  },
  
  onLoad() {
    // 初始化上传组件
    this.initUploader();
  },

  // --- Event Handlers ---
  onTypeChange(e) {
    this.setData({
      'form.type': e.detail.value
    });
  },

  onContentInput(e) {
    this.setData({
      'form.content': e.detail.value.trim()
    });
  },

  onContactInput(e) {
    this.setData({
      'form.contact': e.detail.value.trim()
    });
  },

  // 重写图片选择回调，适配表单结构
  onImageSelect(e) {
    const updatedImages = this.methods.onImageSelect.call(this, e);
    this.setData({ 'form.images': updatedImages });
  },

  // 重写图片删除回调，适配表单结构
  onImageDelete(e) {
    const images = this.methods.onImageDelete.call(this, e);
    this.setData({ 'form.images': images });
  },

  // --- Form Submit ---
  async onSubmit() {
    const { content, type, contact } = this.data.form;
    
    if (!content) {
      this.showToptips({ msg: '请输入反馈内容', type: 'error' });
      return;
    }

    if (this.data.submitting) return;
    this.setData({ submitting: true });

    try {
      ui.showLoading('提交中...');

      // 获取设备信息
      const deviceInfo = {
        system: wx.getSystemInfoSync().system,
        model: wx.getSystemInfoSync().model,
        platform: wx.getSystemInfoSync().platform,
        brand: wx.getSystemInfoSync().brand
      };

      const res = await feedbackApi.submit({
        openid: this.data.openid,
        content,
        type,
        contact,
        device_info: deviceInfo
      });

      if (res.code === 200) {
        ui.showToast('反馈提交成功', { type: ToastType.SUCCESS });
        // 延迟返回上一页
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        throw new Error(res.message || '提交失败');
      }
    } catch (err) {
      error.handle(err, '提交反馈失败');
    } finally {
      this.setData({ submitting: false });
      ui.hideLoading();
    }
  }
}); 