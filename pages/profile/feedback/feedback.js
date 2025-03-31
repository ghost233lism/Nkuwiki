const {
  getStorage,
  formatTime
} = require('../../../utils/util');
const api = require('../../../utils/api/index');

Page({
  data: {
    feedbackTypes: [
      { label: '功能异常', value: 'bug', checked: true },
      { label: '功能建议', value: 'suggestion' },
      { label: '其他问题', value: 'other' }
    ],
    type: 'bug',
    content: '',
    contact: '',
    images: []
  },

  // 选择反馈类型
  onTypeChange(e) {
    this.setData({
      type: e.detail.value
    });
  },

  // 输入反馈内容
  onContentInput(e) {
    this.setData({
      content: e.detail.value.trim()
    });
  },

  // 输入联系方式
  onContactInput(e) {
    this.setData({
      contact: e.detail.value.trim()
    });
  },

  // 选择图片
  chooseImage() {
    const maxImages = 3;
    const remainCount = maxImages - this.data.images.length;
    if (remainCount <= 0) return;

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          images: [...this.data.images, ...newImages]
        });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.images,
      current: url
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  // 提交反馈
  async submitFeedback() {
    if (!this.data.content) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });

      const userInfo = getStorage('userInfo');
      const feedback = {
        type: this.data.type,
        content: this.data.content,
        contact: this.data.contact,
        images: this.data.images,
        openid: userInfo?.openid,
        deviceInfo: {
          ...wx.getDeviceInfo(),
          ...wx.getAppBaseInfo(),
          ...wx.getSystemSetting(),
          ...wx.getWindowInfo()
        }
      };

      const result = await api.user.submitFeedback(feedback);
      
      if (result?.success) {
        wx.showToast({
          title: '反馈提交成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              wx.navigateBack();
            }, 2000);
          }
        });
      } else {
        throw new Error(result?.message || '提交失败');
      }
    } catch (err) {
      console.debug('提交反馈失败:', err);
      wx.showToast({
        title: err.message || '提交失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
}); 