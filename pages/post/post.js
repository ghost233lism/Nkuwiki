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
    
    // 获取用户信息但不立即中断
    const userManager = require('../../utils/user_manager');
    const isLoggedIn = userManager.isLoggedIn();
    const userInfo = userManager.getCurrentUser();
    
    console.debug('发布按钮点击 - 登录状态:', isLoggedIn);
    console.debug('发布按钮点击 - 用户信息:', userInfo);
    
    // 优先验证输入，避免不必要的登录判断
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
    
    // 使用用户管理器获取用户信息
    const userManager = require('../../utils/user_manager');
    const userInfo = userManager.getUserInfoForAPI();
    const isLoggedIn = userManager.isLoggedIn();
    
    // 在这里再次检查登录状态
    if (!isLoggedIn || !userInfo || !userInfo.openid || userInfo.openid === '0') {
      console.debug('发帖时发现未登录状态:', userInfo);
      wx.hideLoading();
      
      // 显示登录提示并记录问题
      wx.showModal({
        title: '需要登录',
        content: '您需要登录后才能发布帖子',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    // 调试输出
    console.debug('发帖使用用户信息:', userInfo);
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
    
    // 尝试API方式发帖
    const tryApiPost = async () => {
      const { postAPI, logger } = require('../../utils/api/index');
      
      try {
        logger.debug('开始API方式发帖');
        
        // 上传图片到云存储
        const cloudImages = await uploadImages(processedImages);
        
        if (cloudImages.length !== processedImages.length) {
          logger.warn('有图片上传失败，可能无法继续发帖');
          wx.hideLoading();
          wx.showToast({
            title: '图片上传失败，请重试',
            icon: 'none'
          });
          return false;
        }
        
        // 获取用户信息
        const avatarUrl = userInfo.avatar_url || userInfo.avatar || userInfo.avatarUrl || '/assets/icons/default-avatar.png';
        const nickName = userInfo.nickname || userInfo.nick_name || userInfo.nickName || '南开大学用户';
        
        logger.debug('用户昵称和头像:', nickName, avatarUrl);
        
        // 准备要发送到API的数据 - 适配新API格式
        const postData = {
          title: title.trim(),
          content: content.trim(),
          images: cloudImages,
          openid: userInfo.openid, // 确保包含openid，API内部会将其移至查询参数
          tags: []
        };
        
        // 不再添加多余字段
        logger.debug('帖子数据准备完成');
        
        // 调用API发布帖子
        const result = await postAPI.createPost(postData);
        logger.debug('发帖API调用结果:', JSON.stringify(result).substring(0, 200) + '...');
        
        // 检查标准API响应格式
        if (result && result.code === 200 && result.data) {
          // 成功发帖 - 新API格式
          wx.hideLoading();
          
          // 设置首页需要刷新
          app.globalData.needRefreshIndexPosts = true;
          
          // 显示成功提示并返回
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            duration: 1500,
            success: function() {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
          return true;
        } else if (result && result.success === true) {
          // 兼容旧格式
          wx.hideLoading();
          app.globalData.needRefreshIndexPosts = true;
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            duration: 1500,
            success: function() {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
          return true;
        } else {
          // 有错误信息
          const errorMsg = (result && result.message) || 
                        (result && result.error) || 
                        '发布失败，请稍后重试';
          
          logger.error('发帖API返回错误:', errorMsg);
          wx.hideLoading();
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
          return false;
        }
      } catch (err) {
        logger.error('API发帖过程出错:', err);
        wx.hideLoading();
        wx.showToast({
          title: err.message || '发布失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return false;
      }
    };
    
    // 首先检查是否有图片，如果没有图片则优先尝试API方式
    if (!processedImages || processedImages.length === 0) {
      // 无图片帖子，直接调用API - 使用简化数据
      console.debug('无图片帖子，直接使用API');
      
      // 检查openid是否有效
      if (!userInfo || !userInfo.openid) {
        console.error('无法获取有效的openid');
        wx.hideLoading();
        wx.showModal({
          title: '发布失败',
          content: '无法获取用户信息，请重新登录',
          showCancel: false,
          success: function() {
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/login/login'
              });
            }, 1000);
          }
        });
        return;
      }
      
      // 准备安全的最小API数据 - 只包含必须字段
      const apiPostData = {
        title: String(title).trim(),
        content: String(content).trim(),
        openid: userInfo.openid // 添加openid，API内部会将其移至查询参数
      };
      
      console.debug('准备发送的API数据:', JSON.stringify(apiPostData));
      console.debug('帖子标题:', apiPostData.title, '长度:', apiPostData.title.length);
      console.debug('帖子内容长度:', apiPostData.content.length);
      console.debug('用户openid:', apiPostData.openid);
      
      wx.showLoading({
        title: '发布中...',
        mask: true
      });
      
      const { postAPI } = require('../../utils/api/index');
      postAPI.createPost(apiPostData)
        .then(res => {
          console.debug('无图片发帖结果:', res);
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
          console.error('无图片API发帖失败:', err);
          
          wx.hideLoading();
          
          // 尝试从错误对象中提取更有用的信息
          let errorMessage = '发布失败，请稍后重试';
          
          if (err) {
            if (typeof err === 'string') {
              errorMessage = err;
            } else if (err.message) {
              errorMessage = err.message;
            } else if (err.errMsg) {
              errorMessage = err.errMsg;
            } else if (typeof err === 'object') {
              try {
                errorMessage = JSON.stringify(err);
              } catch(e) {
                console.error('无法解析错误对象:', e);
              }
            }
          }
          
          // 将错误信息记录到控制台，方便调试
          console.error('完整错误信息:', errorMessage);
          
          // 显示清晰的错误弹窗，不用toast，防止长信息被截断
          wx.showModal({
            title: '发布失败',
            content: errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage,
            showCancel: false
          });
        });
    } else {
      // 有图片帖子，尝试API方式上传图片再发帖
      tryApiPost().catch(err => {
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
    const { logger } = require('../../utils/api/index');
    
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
      isEditingMode: false,
      canSubmit: false
    });
    
    // 检查登录状态
    const userManager = require('../../utils/user_manager');
    const isLoggedIn = userManager.isLoggedIn();
    const userInfo = userManager.getCurrentUser();
    
    logger.debug('帖子发布页加载，登录状态:', isLoggedIn);
    
    // 如果未登录，跳转到登录页
    if (!isLoggedIn) {
      logger.debug('用户未登录，跳转到登录页');
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1000);
    }
  },
  
  // 页面显示时再次检查登录状态
  onShow: function() {
    const { logger } = require('../../utils/api/index');
    const userManager = require('../../utils/user_manager');
    const isLoggedIn = userManager.isLoggedIn();
    
    logger.debug('帖子发布页显示，登录状态:', isLoggedIn);
    
    // 如果未登录，跳转到登录页
    if (!isLoggedIn) {
      logger.debug('用户未登录，跳转到登录页');
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1000);
    }
  }
}) 
