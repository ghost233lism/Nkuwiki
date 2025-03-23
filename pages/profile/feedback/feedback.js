const feedbackAPI = require('../../../utils/api/feedback');
const logger = require('../../../utils/logger');
const userManager = require('../../../utils/user_manager');
const uploadHelper = require('../../../utils/upload_helper');

Page({
  data: {
    isLoggedIn: false,
    openid: '',
    content: '',
    contact: '',
    type: 'feature', // 默认为功能建议
    types: [
      { id: 'bug', name: '功能异常' },
      { id: 'feature', name: '功能建议' },
      { id: 'content', name: '内容问题' },
      { id: 'other', name: '其他' }
    ],
    images: [],
    maxImageCount: 3,
    isSubmitting: false,
    feedbackList: [],
    loadingFeedbacks: false
  },

  onLoad: function (options) {
    // 检查登录状态
    const userInfo = userManager.getUser();
    const isLoggedIn = userManager.isLoggedIn();
    
    if (isLoggedIn && userInfo) {
      this.setData({
        isLoggedIn: true,
        openid: userInfo.openid || userInfo.id || userInfo._id,
        contact: userInfo.email || ''
      });
      
      // 加载用户反馈列表
      this.loadFeedbackList();
    } else {
      this.setData({
        isLoggedIn: false
      });
      
      // 提示用户登录
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      
      // 2秒后返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  // 加载反馈列表
  loadFeedbackList: function () {
    const openid = this.data.openid;
    
    this.setData({ loadingFeedbacks: true });
    
    feedbackAPI.getUserFeedback(openid)
      .then(res => {
        logger.debug('获取用户反馈列表成功:', res);
        
        // 更新数据
        this.setData({
          feedbackList: res.feedbacks || [],
          loadingFeedbacks: false
        });
      })
      .catch(err => {
        logger.error('获取用户反馈列表失败:', err);
        this.setData({
          loadingFeedbacks: false
        });
      });
  },

  // 输入内容
  onContentInput: function (e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 输入联系方式
  onContactInput: function (e) {
    this.setData({
      contact: e.detail.value
    });
  },

  // 选择反馈类型
  onTypeChange: function (e) {
    this.setData({
      type: e.detail.value
    });
  },

  // 选择图片
  chooseImage: function () {
    const { images, maxImageCount } = this.data;
    const remainCount = maxImageCount - images.length;
    
    if (remainCount <= 0) {
      wx.showToast({
        title: `最多只能上传${maxImageCount}张图片`,
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        // 上传图片到云存储
        this.uploadImages(tempFiles);
      }
    });
  },

  // 上传图片
  async uploadImages(tempFilePaths) {
    if (!tempFilePaths || tempFilePaths.length === 0) return;
    
    wx.showLoading({
      title: '上传中...',
      mask: true
    });
    
    try {
      // 使用uploadHelper批量上传图片
      const fileIDs = await uploadHelper.batchUploadImages(
        tempFilePaths,
        'feedback',
        this.data.openid,
        true,  // 压缩
        80     // 质量
      );
      
      // 更新图片列表
      this.setData({
        images: [...this.data.images, ...fileIDs]
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
      
    } catch (err) {
      logger.error('上传图片失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    }
  },

  // 预览图片
  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 删除图片
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data;
    
    // 获取要删除的fileID
    const fileID = images[index];
    
    // 从数组中删除该图片
    images.splice(index, 1);
    
    // 更新UI
    this.setData({
      images: images
    });
    
    // 从云存储中删除图片
    uploadHelper.deleteFile(fileID)
      .then(success => {
        if (!success) {
          logger.debug('删除云存储图片失败:', fileID);
        }
      })
      .catch(err => {
        logger.error('删除云存储图片出错:', err);
      });
  },

  // 提交反馈
  submitFeedback: function () {
    // 内容验证
    const { content, type, contact, openid, images } = this.data;
    
    if (!content || content.trim().length < 5) {
      wx.showToast({
        title: '反馈内容不能少于5个字',
        icon: 'none'
      });
      return;
    }
    
    // 防止重复提交
    if (this.data.isSubmitting) {
      return;
    }
    
    this.setData({ isSubmitting: true });
    
    // 获取设备信息 - 使用新API替代旧的wx.getSystemInfoSync
    const deviceInfo = wx.getDeviceInfo();
    const appBaseInfo = wx.getAppBaseInfo();
    
    // 构建用于反馈的设备信息对象
    const deviceInfoForFeedback = {
      brand: deviceInfo.brand,
      model: deviceInfo.model,
      system: deviceInfo.system,
      platform: deviceInfo.platform,
      SDKVersion: appBaseInfo.SDKVersion
    };
    
    // 构建反馈数据
    const feedbackData = {
      openid: openid,
      content: content.trim(),
      type: type,
      contact: contact || null,
      images: images,
      device_info: deviceInfoForFeedback
    };
    
    // 调用API提交反馈
    feedbackAPI.submitFeedback(feedbackData)
      .then(res => {
        logger.debug('提交反馈成功:', res);
        
        this.setData({
          isSubmitting: false,
          content: '',
          images: []
        });
        
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        
        // 刷新反馈列表
        this.loadFeedbackList();
      })
      .catch(err => {
        logger.error('提交反馈失败:', err);
        
        this.setData({
          isSubmitting: false
        });
        
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        });
      });
  },

  // 查看反馈详情
  viewFeedbackDetail: function (e) {
    const feedback = e.currentTarget.dataset.feedback;
    
    // 构建详情内容
    let detailContent = `类型：${this.getTypeName(feedback.type)}\n`;
    detailContent += `时间：${feedback.create_time}\n`;
    detailContent += `状态：${this.getStatusName(feedback.status)}\n\n`;
    detailContent += `${feedback.content}`;
    
    if (feedback.admin_reply) {
      detailContent += `\n\n回复：${feedback.admin_reply}`;
    }
    
    wx.showModal({
      title: '反馈详情',
      content: detailContent,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 获取类型名称
  getTypeName: function (typeId) {
    const type = this.data.types.find(item => item.id === typeId);
    return type ? type.name : '其他';
  },

  // 获取状态名称
  getStatusName: function (status) {
    const statusMap = {
      0: '待处理',
      1: '处理中',
      2: '已处理',
      3: '已关闭'
    };
    
    return statusMap[status] || '待处理';
  }
}); 