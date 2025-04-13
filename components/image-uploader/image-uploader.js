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
    },
    
    // 是否静默上传（不显示上传进度）
    silentUpload: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    localImages: [], // 本地临时图片路径
    uploadedImages: [], // 已上传的图片路径
    isUploading: false, // 是否正在上传
    uploadProgress: 0, // 上传进度
    errors: [], // 上传过程中的错误
    imageStatus: {} // 图片上传状态: {[localPath]: {uploaded: boolean, cloudPath: string}}
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
      
      // 记录原始本地图片用于上传
      const localImagesToUpload = [...this.data.localImages];
      
      this.setData({
        isUploading: true,
        uploadProgress: 0,
        errors: []
      });
      
      // 触发上传开始事件
      this.triggerEvent('uploadstart');
      
      const totalCount = localImagesToUpload.length;
      let successCount = 0;
      // 创建云存储链接映射
      const imageStatus = {...this.data.imageStatus};
      const cloudUrls = [];
      const newErrors = [];
      
      // 逐个上传图片
      for (let i = 0; i < localImagesToUpload.length; i++) {
        const tempFilePath = localImagesToUpload[i];
        
        // 已上传的图片跳过
        if (imageStatus[tempFilePath] && imageStatus[tempFilePath].uploaded) {
          cloudUrls.push(imageStatus[tempFilePath].cloudPath);
          successCount++;
          continue;
        }
        
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
            }
          } catch (compressErr) {
            // 压缩失败继续使用原图
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
          
          // 上传成功，记录状态和云存储路径
          imageStatus[tempFilePath] = {
            uploaded: true,
            cloudPath: uploadResult.fileID
          };
          cloudUrls.push(uploadResult.fileID);
          successCount++;
          
        } catch (err) {
          // 捕获异常
          newErrors.push({
            file: tempFilePath,
            message: err.message || '上传失败'
          });
          // 标记上传失败
          imageStatus[tempFilePath] = {
            uploaded: false,
            error: err.message || '上传失败'
          };
        }
      }
      
      // 更新组件状态 - 不删除本地图片，只更新状态和已上传图片列表
      this.setData({
        isUploading: false,
        uploadProgress: 100,
        errors: newErrors,
        imageStatus,
        uploadedImages: cloudUrls
      });
      
      // 触发上传完成事件
      this.triggerEvent('uploadcomplete', {
        success: successCount === totalCount,
        successCount,
        totalCount,
        errors: newErrors,
        images: cloudUrls
      });
    },
    
    // 删除图片
    deleteImage(e) {
      const { index, type } = e.currentTarget.dataset;
      
      if (type === 'local') {
        // 获取要删除的图片路径
        const localImage = this.data.localImages[index];
        
        // 复制状态对象
        const imageStatus = {...this.data.imageStatus};
        const wasUploaded = imageStatus[localImage] && imageStatus[localImage].uploaded;
        let cloudPath = null;
        
        // 保存可能已上传的云路径
        if (wasUploaded) {
          cloudPath = imageStatus[localImage].cloudPath;
        }
        
        // 从状态中删除
        if (imageStatus[localImage]) {
          delete imageStatus[localImage];
        }
        
        // 删除本地图片
        const localImages = [...this.data.localImages];
        localImages.splice(index, 1);
        
        // 同时从已上传列表中删除
        let uploadedImages = [...this.data.uploadedImages];
        if (wasUploaded && cloudPath) {
          uploadedImages = uploadedImages.filter(url => url !== cloudPath);
        }
        
        this.setData({ 
          localImages,
          imageStatus,
          uploadedImages
        });
        
        // 触发删除事件
        this.triggerEvent('delete', {
          index,
          type,
          images: this.getAllImages()
        });
      } else {
        // 删除已上传图片 (应该不会再运行到这里，保留兼容)
        const uploadedImages = [...this.data.uploadedImages];
        uploadedImages.splice(index, 1);
        this.setData({ uploadedImages });
        
        // 触发删除事件
        this.triggerEvent('delete', {
          index,
          type,
          images: this.getAllImages()
        });
      }
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
      // 优先返回云存储图片路径，没有则返回本地路径
      const allImages = [];
      const {localImages, imageStatus} = this.data;
      
      for (const img of localImages) {
        if (imageStatus[img] && imageStatus[img].uploaded) {
          allImages.push(imageStatus[img].cloudPath);
        } else {
          allImages.push(img);
        }
      }
      
      return [...this.data.uploadedImages, ...allImages];
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
        errors: [],
        imageStatus: {}
      });
      
      // 触发清空事件
      this.triggerEvent('clear');
    },
    
    // 获取已上传的图片URL列表
    getUploadedImageUrls() {
      return this.data.uploadedImages;
    },
    
    // 删除本地图片
    onLocalImageDelete(e) {
      const index = e.currentTarget.dataset.index;
      const localImages = [...this.data.localImages];
      localImages.splice(index, 1);
      
      // 同时移除对应的错误信息
      const errors = [...this.data.errors];
      errors.splice(index, 1);
      
      this.setData({
        localImages,
        errors
      });
      
      this.triggerEvent('delete', {
        index,
        type: 'local'
      });
    }
  }
}); 