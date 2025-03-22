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
    const app = getApp();
    wx.showLoading({
      title: '发布中...',
      mask: true
    });
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo || !userInfo.id) {
      wx.hideLoading();
      wx.showToast({
        title: '用户未登录，请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 调试输出
    console.debug('准备发帖：', {
      title,
      content: content.substring(0, 30) + '...',
      imagesCount: processedImages?.length || 0
    });
    
    // 图片路径问题可能导致500错误，我们先尝试上传图片到云存储
    const uploadImages = async (images) => {
      if (!images || images.length === 0) return [];
      
      try {
        console.debug('开始上传图片，数量：', images.length);
        
        const uploadedImages = [];
        for (let i = 0; i < images.length; i++) {
          try {
            const cloudPath = `posts/${Date.now()}_${i}.${images[i].split('.').pop() || 'png'}`;
            console.debug(`上传第${i+1}张图片: ${cloudPath}`);
            
            const res = await wx.cloud.uploadFile({
              cloudPath,
              filePath: images[i]
            });
            
            console.debug(`第${i+1}张上传成功: ${res.fileID}`);
            uploadedImages.push(res.fileID);
          } catch (err) {
            console.debug(`上传第${i+1}张图片失败:`, err);
            // 如果上传失败，可以选择继续而不是中断
          }
        }
        
        console.debug('所有图片上传完成，成功数量：', uploadedImages.length);
        return uploadedImages;
      } catch (err) {
        console.error('图片上传过程出错:', err);
        return [];
      }
    };
    
    // 使用云函数作为备用方案，同时尝试API方法
    const useCloudFunction = async () => {
      try {
        console.debug('尝试使用云函数方式发帖');
        
        const cloudData = {
          title: title,
          content: content,
          images: processedImages,
          isPublic: true
        };
        
        console.debug('云函数数据准备完成');
        
        const res = await wx.cloud.callFunction({
          name: 'createPost',
          data: cloudData
        });
        
        console.debug('云函数调用结果:', res);
        
        wx.hideLoading();
        if (res.result && res.result.code === 0) {
          // 设置首页需要刷新
          app.globalData.needRefreshIndexPosts = true;
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            success: function() {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
          return true;
        } else {
          console.debug('云函数返回错误:', res.result);
          return false;
        }
      } catch (err) {
        console.debug('云函数备用方案失败:', err);
        return false;
      }
    };
    
    // 尝试API方式发帖
    const tryApiPost = async () => {
      try {
        console.debug('开始API方式发帖');
        
        // 上传图片到云存储
        const cloudImages = await uploadImages(processedImages);
        
        if (cloudImages.length !== processedImages.length) {
          console.debug('有图片上传失败，API方式可能无法继续');
          return false;
        }
        
        // 准备要发送到API的数据
        const postData = {
          wxapp_id: `post_${Date.now()}`, // 生成唯一ID
          author_id: userInfo.id.toString(),
          author_name: userInfo.nickname || '匿名用户',
          author_avatar: userInfo.avatar_url || '',
          title: title,
          content: content,
          images: cloudImages, // 使用云存储的图片地址
          tags: []
        };
        
        console.debug('API数据准备完成，准备发送请求');
        
        // 调用API发布帖子
        const { postAPI } = require('../../utils/api');
        const res = await postAPI.createPost(postData);
        
        console.debug('API调用成功:', res);
        
        wx.hideLoading();
        // 设置首页需要刷新
        app.globalData.needRefreshIndexPosts = true;
        wx.showToast({
          title: '发布成功',
          icon: 'success',
          success: function() {
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
        });
        return true;
      } catch (err) {
        console.debug('API发帖失败:', err);
        return false;
      }
    };
    
    // 首先检查是否有图片，如果没有图片则优先尝试API方式
    if (!processedImages || processedImages.length === 0) {
      // 无图片帖子，直接调用API
      const postData = {
        wxapp_id: `post_${Date.now()}`,
        author_id: userInfo.id.toString(),
        author_name: userInfo.nickname || '匿名用户',
        author_avatar: userInfo.avatar_url || '',
        title: title,
        content: content,
        images: [],
        tags: []
      };
      
      console.debug('无图片帖子，直接使用API');
      
      const { postAPI } = require('../../utils/api');
      postAPI.createPost(postData)
        .then(res => {
          console.debug('无图片发帖成功:', res);
          wx.hideLoading();
          app.globalData.needRefreshIndexPosts = true;
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            success: function() {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        })
        .catch(err => {
          console.debug('无图片API发帖失败，尝试云函数:', err);
          // API失败，尝试云函数
          useCloudFunction().then(success => {
            if (!success) {
              wx.hideLoading();
              wx.showToast({
                title: '发布失败，请稍后重试',
                icon: 'none'
              });
            }
          });
        });
    } else {
      // 有图片帖子，先尝试API方式上传图片再发帖
      tryApiPost().then(success => {
        if (!success) {
          // API方式失败，尝试云函数
          useCloudFunction().then(cloudSuccess => {
            if (!cloudSuccess) {
              wx.hideLoading();
              wx.showToast({
                title: '发布失败，请稍后重试',
                icon: 'none'
              });
            }
          });
        }
      }).catch(err => {
        console.error('发布失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '发布失败，请稍后重试',
          icon: 'none'
        });
      });
    }
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
