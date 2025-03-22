const fs = wx.getFileSystemManager();

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
      content: e.detail.value
    });
  },

  // 输入联系方式
  onContactInput(e) {
    this.setData({
      contact: e.detail.value
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 3 - this.data.images.length,
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
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: this.data.images,
      current: url
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },

  // 保存反馈信息到本地文件
  saveFeedback(feedback) {
    const timestamp = new Date().getTime();
    const fileName = `feedback_${timestamp}.json`;
    const filePath = `${wx.env.USER_DATA_PATH}/feedback/${fileName}`;

    // 确保feedback文件夹存在
    try {
      fs.accessSync(`${wx.env.USER_DATA_PATH}/feedback`);
    } catch (e) {
      fs.mkdirSync(`${wx.env.USER_DATA_PATH}/feedback`, true);
    }

    // 保存反馈信息
    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify(feedback),
        'utf8'
      );
      return true;
    } catch (e) {
      console.error('保存反馈失败：', e);
      return false;
    }
  },

  // 提交反馈
  submitFeedback() {
    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...'
    });

    // 准备反馈数据
    const feedback = {
      type: this.data.type,
      content: this.data.content,
      contact: this.data.contact,
      images: this.data.images,
      createTime: new Date().toISOString(),
      deviceInfo: {
        ...wx.getDeviceInfo(),
        ...wx.getAppBaseInfo(),
        ...wx.getSystemSetting(),
        windowInfo: wx.getWindowInfo()
      }
    };

    // 保存反馈
    if (this.saveFeedback(feedback)) {
      wx.hideLoading();
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
      wx.hideLoading();
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'error'
      });
    }
  }
}); 