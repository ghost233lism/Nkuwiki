// 引入API模块
const api = require('../../utils/api/index');

Page({
  data: {
    title: '',
    content: '',
    images: [],
    tempImages: [],
    showImagePreview: false,
    currentPreviewIndex: 0,
    isWikiEnabled: false,
    isPublic: true,
    allowComment: true,
    wikiKnowledge: false,
    currentStyle: 'formal',
    previewImages: [],
    imageSize: {
      maxWidth: 1080, // 最大宽度
      maxHeight: 1080, // 最大高度
      quality: 0.8 // 压缩质量
    },
    isEditingMode: false
  },

  // 监听标题输入
  onTitleInput(e) {
    const title = e.detail.value;
    this.setData({
      title,
      canSubmit: title.trim() && this.data.content.trim()  // 检查标题和内容是否都有值
    });
  },

  // 监听内容输入
  onContentInput(e) {
    const content = e.detail.value;
    let warn = '';
    // 中文字符通常计为2个字符，所以3800对应约1900个中文字符
    if (content.length > 3800) {
      warn = '即将达到字数上限';
    }
    
    this.setData({
      content,
      contentWarn: warn,
      canSubmit: content.trim() && this.data.title.trim()
    });
  },

  // Wiki润色开关
  toggleWiki() {
    this.setData({
      isWikiEnabled: !this.data.isWikiEnabled
    });
  },

  // 文风选择
  selectStyle(e) {
    this.setData({
      currentStyle: e.currentTarget.dataset.style
    });
  },

  // 公开设置
  togglePublic() {
    this.setData({
      isPublic: !this.data.isPublic
    });
  },

  // 评论设置
  toggleComment() {
    this.setData({
      allowComment: !this.data.allowComment
    });
  },

  // Wiki小知开关
  toggleWikiKnowledge(e) {
    this.setData({
      wikiKnowledge: e.detail.value
    });
  },

  // 选择图片
  showImagePicker: function() {
    const that = this;
    const remainCount = 9 - this.data.images.length;
    
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多只能上传9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function(res) {
        const tempFiles = res.tempFiles;
        const tempPaths = tempFiles.map(file => file.tempFilePath);
        
        // 打开预览并裁剪
        that.setData({
          previewImages: tempPaths,
          showImagePreview: true,
          currentPreviewIndex: 0,
          isEditingMode: false  
        });
      }
    });
  },

  // 切换预览图片
  switchPreviewImage: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentPreviewIndex: index
    });
  },

  // 轮播图变化
  swiperChange: function(e) {
    this.setData({
      currentPreviewIndex: e.detail.current
    });
  },

  // 关闭预览
  closePreview: function() {
    this.setData({
      showImagePreview: false,
      previewImages: []
    });
  },

  // 裁剪当前图片
  cropCurrentImage: function() {
    const that = this;
    const index = this.data.currentPreviewIndex;
    const imageSrc = this.data.previewImages[index];
    
    wx.editImage({
      src: imageSrc,
      success(res) {
        // 更新裁剪后的图片
        const newPreviewImages = [...that.data.previewImages];
        newPreviewImages[index] = res.tempFilePath;
        
        that.setData({
          previewImages: newPreviewImages
        });
      }
    });
  },

  // 确认预览的图片
  confirmPreview: function() {
    if (this.data.isEditingMode) {
      // 直接用预览图片替换原有图片
      this.setData({
        images: [...this.data.previewImages],
        showImagePreview: false,
        previewImages: [],
        isEditingMode: false
      });
    } else {
      // 将预览图片添加到现有图片
      const currentImages = this.data.images || [];
      const newImages = [...currentImages, ...this.data.previewImages];
      
      this.setData({
        images: newImages,
        showImagePreview: false,
        previewImages: [],
        isEditingMode: false
      });
    }
  },

  // 批量编辑图片
  batchEditImages: function() {
    // 打开预览并允许编辑
    this.setData({
      previewImages: [...this.data.images],
      showImagePreview: true,
      currentPreviewIndex: 0,
      isEditingMode: true  // 标记为编辑
    });
  },

  // 预览已上传图片
  previewImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    
    this.setData({
      images: images
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 修改发帖函数，在提交前处理图片
  submitPost: function() {
    const that = this;
    const { title, content, images } = this.data;
    
    // 验证输入
    if (!title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return;
    }
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '正在处理图片...',
      mask: true
    });
    
    // 如果有图片，先处理图片
    if (images.length > 0) {
      this.processImages(images, 0, [], function(processedImages) {
        // 处理完成后发布帖子
        that.doSubmitPost(title, content, processedImages);
      });
    } else {
      // 没有图片，直接发布
      this.doSubmitPost(title, content, []);
      wx.hideLoading();
    }
  },

  // 处理图片（裁剪、压缩）
  processImages: function(images, index, results, callback) {
    const that = this;
    
    if (index >= images.length) {
      // 所有图片处理完成
      wx.hideLoading();
      callback(results);
      return;
    }
    
    // 压缩图片
    wx.compressImage({
      src: images[index],
      quality: that.data.imageSize.quality * 100, // 转为0-100的值
      success(compressRes) {
        results.push(compressRes.tempFilePath);
        // 处理下一张
        that.processImages(images, index + 1, results, callback);
      },
      fail() {
        // 压缩失败，使用原图
        results.push(images[index]);
        that.processImages(images, index + 1, results, callback);
      }
    });
  },

  // 执行发帖请求
  doSubmitPost: function(title, content, processedImages) {
    const that = this;
    wx.showLoading({
      title: '发布中...',
      mask: true
    });
    
    // 获取当前用户信息和openid，用于调试
    const userInfo = wx.getStorageSync('userInfo') || {};
    const openid = wx.getStorageSync('openid');
    console.debug('发布帖子用户信息:', {
      openid: openid,
      nickName: userInfo.nickName,
      hasUserInfo: !!userInfo
    });
    
    // 准备要发送到API的数据
    const postData = {
      title: title,
      content: content,
      isPublic: this.data.isPublic ? 1 : 0,
      allow_comment: this.data.allowComment ? 1 : 0,
      category_id: 1 // 默认分类
    };
    
    // 检查是否有openid，没有则重新获取
    if (!openid) {
      console.warn('未检测到openid，尝试重新登录...');
      wx.hideLoading();
      
      // 提示用户重新登录
      wx.showModal({
        title: '登录状态失效',
        content: '您的登录状态已失效，请重新登录后再发布',
        showCancel: false,
        success: function() {
          // 跳转到登录页或刷新当前页
          const api = require('../../utils/api/index');
          api.user.login().then(res => {
            if (res.code === 0) {
              wx.showToast({
                title: '登录成功，请重新发布',
                icon: 'none'
              });
            }
          });
        }
      });
      return;
    }
    
    // 上传图片
    let uploadImagePromises = [];
    if (processedImages && processedImages.length > 0) {
      console.debug('准备上传图片, 数量:', processedImages.length);
      
      // 先显示上传中状态
      wx.showLoading({
        title: '上传图片中...',
        mask: true
      });
      
      // 使用API上传图片
      uploadImagePromises = processedImages.map((filePath, index) => {
        return new Promise((resolve, reject) => {
          console.debug(`开始上传第${index+1}张图片`);
          
          // 使用API模块上传
          api.upload.uploadImage(filePath).then(res => {
            if (res && res.success && res.fileID) {
              console.debug(`第${index+1}张图片上传成功:`, res.fileID);
              resolve(res.fileID);
            } else {
              console.error(`第${index+1}张图片上传失败:`, res);
              reject(new Error(`图片${index+1}上传失败: ${res.message || '未知错误'}`));
            }
          }).catch(err => {
            console.error(`第${index+1}张图片上传异常:`, err);
            reject(err);
          });
        });
      });
      
      // 处理所有图片上传
      Promise.all(uploadImagePromises)
        .then(imageFileIDs => {
          console.debug('所有图片上传成功，准备发布帖子');
          
          // 更新帖子数据中的图片字段
          postData.images = imageFileIDs;
          
          // 调用发布API
          that.callCreatePostAPI(postData);
        })
        .catch(err => {
          console.error('图片上传失败:', err);
          wx.hideLoading();
          wx.showToast({
            title: '图片上传失败: ' + (err.message || '请检查网络'),
            icon: 'none',
            duration: 2000
          });
        });
    } else {
      // 没有图片，直接发布
      console.debug('无图片，直接发布帖子');
      that.callCreatePostAPI(postData);
    }
  },
  
  // 抽取API调用为单独函数，方便处理错误
  callCreatePostAPI: function(postData) {
    console.debug('发送帖子数据:', postData);
    
    // 使用API模块创建帖子
    api.post.createPost(postData)
      .then(result => {
        wx.hideLoading();
        console.debug('创建帖子API响应:', result);
        
        if (result && result.success) {
          // 设置全局变量，标记需要刷新首页
          getApp().globalData = getApp().globalData || {};
          getApp().globalData.needRefreshHomePage = true;
          
          wx.showToast({
            title: result.message || '发布成功',
            icon: 'success',
            success: function() {
              // 延迟返回上一页
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        } else {
          wx.showToast({
            title: result ? result.message : '发布失败',
            icon: 'none',
            duration: 2000
          });
        }
      })
      .catch(err => {
        console.error('发布帖子API异常:', err);
        wx.hideLoading();
        wx.showToast({
          title: err.message || '网络异常',
          icon: 'none',
          duration: 2000
        });
      });
  },

  onLoad: function() {
    this.setData({
      title: '',
      content: '',
      images: [],
      tempImages: [],
      showImagePreview: false,
      currentPreviewIndex: 0,
      isWikiEnabled: false,
      isPublic: true,
      allowComment: true,
      wikiKnowledge: false,
      currentStyle: 'formal',
      isEditingMode: false
    });
  }
}) 
