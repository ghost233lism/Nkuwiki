/**
 * 图片上传组件
 * 支持多图上传、预览、删除等功能
 */
const { ui, error, ToastType, storage } = require('../../utils/util');

Component({
  properties: {
    // 初始图片列表
    images: {
      type: Array,
      value: []
    },
    
    // 最大图片数量
    maxCount: {
      type: Number,
      value: 9
    },
    
    // 选择器类型
    sourceType: {
      type: Array,
      value: ['album', 'camera']
    },
    
    // 图片压缩质量
    quality: {
      type: Number,
      value: 80 // 0-100
    },
    
    // 是否自动上传
    autoUpload: {
      type: Boolean,
      value: true
    },
    
    // 是否展示上传按钮
    showUploadBtn: {
      type: Boolean,
      value: true
    },
    
    // 图片宽度
    width: {
      type: String,
      value: '200rpx'
    },
    
    // 图片高度
    height: {
      type: String,
      value: '200rpx'
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    localImages: [], // 本地临时图片路径
    uploadedImages: [], // 已上传的图片路径
    isUploading: false, // 是否正在上传
    uploadProgress: 0, // 上传进度
    errors: [] // 上传过程中的错误
  },
  
  lifetimes: {
    attached() {
      // 初始化图片列表
      if (this.properties.images && this.properties.images.length > 0) {
        this.setData({
          uploadedImages: this.properties.images
        });
      }
    }
  },
  
  methods: {
    // 选择图片
    async chooseImage() {
      if (this.data.isUploading || this.properties.disabled) return;
      
      const { maxCount, sourceType } = this.properties;
      const remain = maxCount - this.getTotalImageCount();
      
      if (remain <= 0) {
        wx.showToast({
          title: `最多上传${maxCount}张图片`,
          icon: 'none'
        });
        return;
      }
      
      try {
        const res = await wx.chooseMedia({
          count: remain,
          mediaType: ['image'],
          sourceType,
          sizeType: ['compressed'],
          success: null
        });
        
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        
        this.setData({
          localImages: [...this.data.localImages, ...tempFiles]
        });
        
        // 触发选择图片事件
        this.triggerEvent('choose', {
          images: this.data.localImages
        });
        
        // 如果设置了自动上传，则选择后立即上传
        if (this.properties.autoUpload) {
          this.uploadImages();
        }
      } catch (err) {
        console.debug('选择图片失败:', err);
      }
    },
    
    // 上传所有待上传的图片
    async uploadImages() {
      if (this.data.isUploading || this.data.localImages.length === 0) return;
      
      this.setData({
        isUploading: true,
        uploadProgress: 0,
        errors: []
      });
      
      // 触发上传开始事件
      this.triggerEvent('uploadstart');
      
      const totalCount = this.data.localImages.length;
      let successCount = 0;
      const uploadedImages = [...this.data.uploadedImages];
      const newErrors = [];
      
      // 逐个上传图片
      for (let i = 0; i < this.data.localImages.length; i++) {
        const tempFilePath = this.data.localImages[i];
        
        try {
          // 更新进度
          this.setData({
            uploadProgress: Math.floor((i / totalCount) * 100)
          });
          
          // 压缩图片
          let compressedPath = tempFilePath;
          try {
            const compressRes = await wx.compressImage({
              src: tempFilePath,
              quality: this.properties.quality
            });
            if (compressRes && compressRes.tempFilePath) {
              compressedPath = compressRes.tempFilePath;
              console.debug('图片压缩成功');
            }
          } catch (compressErr) {
            console.debug('图片压缩失败，使用原图:', compressErr);
          }
          
          // 获取openid用于构建云存储路径
          const openid = storage.get('openid');
          if (!openid) {
            throw new Error('用户未登录');
          }
          
          // 生成云存储路径，添加时间戳避免缓存问题
          const timestamp = Date.now();
          const cloudPath = `images/${openid}_${timestamp}_${i}.jpg`;
          
          // 使用微信云存储API上传
          const maxRetries = 3;
          let retryCount = 0;
          let uploadResult = null;
          
          while (retryCount < maxRetries && !uploadResult) {
            try {
              if (retryCount > 0) {
                console.debug(`上传重试第${retryCount}次`);
              }
              
              // 设置上传超时
              uploadResult = await Promise.race([
                wx.cloud.uploadFile({
                  cloudPath,
                  filePath: compressedPath
                }),
                new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('上传超时')), 15000); // 15秒超时
                })
              ]);
              
            } catch (uploadErr) {
              console.debug(`上传失败 (${retryCount + 1}/${maxRetries}):`, uploadErr);
              retryCount++;
              
              if (retryCount >= maxRetries) {
                throw new Error(`上传失败(已重试${maxRetries}次): ${uploadErr.message || '网络错误'}`);
              }
              
              // 重试前等待一段时间
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (!uploadResult?.fileID) {
            throw new Error('云存储返回结果格式错误');
          }
          
          // 上传成功，添加到已上传列表
          uploadedImages.push(uploadResult.fileID);
          successCount++;
          
        } catch (err) {
          // 捕获异常
          newErrors.push({
            file: tempFilePath,
            message: err.message || '上传失败'
          });
          console.debug('上传图片失败:', err);
        }
      }
      
      // 更新组件状态
      this.setData({
        isUploading: false,
        uploadProgress: 100,
        uploadedImages,
        localImages: [], // 清空本地图片
        errors: newErrors
      });
      
      // 触发上传完成事件
      this.triggerEvent('uploadcomplete', {
        success: successCount === totalCount,
        successCount,
        totalCount,
        errors: newErrors,
        images: uploadedImages
      });
    },
    
    // 删除图片
    deleteImage(e) {
      const { index, type } = e.currentTarget.dataset;
      
      if (type === 'local') {
        // 删除本地图片
        const localImages = [...this.data.localImages];
        localImages.splice(index, 1);
        this.setData({ localImages });
      } else {
        // 删除已上传图片
        const uploadedImages = [...this.data.uploadedImages];
        uploadedImages.splice(index, 1);
        this.setData({ uploadedImages });
      }
      
      // 触发删除事件
      this.triggerEvent('delete', {
        index,
        type,
        images: this.getAllImages()
      });
    },
    
    // 预览图片
    previewImage(e) {
      const { index, type } = e.currentTarget.dataset;
      let current;
      const allImages = this.getAllImages();
      
      if (type === 'local') {
        current = this.data.localImages[index];
      } else {
        current = this.data.uploadedImages[index];
      }
      
      wx.previewImage({
        current,
        urls: allImages
      });
    },
    
    // 获取所有图片（已上传的和本地的）
    getAllImages() {
      return [...this.data.uploadedImages, ...this.data.localImages];
    },
    
    // 获取图片总数
    getTotalImageCount() {
      return this.data.uploadedImages.length + this.data.localImages.length;
    },
    
    // 清空所有图片
    clearImages() {
      this.setData({
        localImages: [],
        uploadedImages: [],
        errors: []
      });
      
      // 触发清空事件
      this.triggerEvent('clear');
    },
    
    // 获取已上传的图片URL列表
    getUploadedImageUrls() {
      return this.data.uploadedImages;
    }
  }
}); 