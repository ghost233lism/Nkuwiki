Page({
  data: {
    title: '',
    content: '',
    images: [],
    isWikiEnabled: false,
    isPublic: true,
    allowComment: true,
    wikiKnowledge: true,
    currentStyle: 'formal'
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
  async chooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 9 - this.data.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '上传中...' })

      // 上传图片到云存储
      const uploadTasks = res.tempFilePaths.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `posts/${Date.now()}-${Math.random().toString(36).slice(-6)}.jpg`,
          filePath
        })
      })

      const uploadResults = await Promise.all(uploadTasks)
      console.log('图片上传结果：', uploadResults)

      const newImages = uploadResults.map(res => res.fileID)
      console.log('新增图片fileID：', newImages)

      this.setData({
        images: [...this.data.images, ...newImages]
      })

      wx.hideLoading()
    } catch (err) {
      console.error('上传图片失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    }
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: this.data.images,
      current: url
    })
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 发布帖子
  async submitPost() {
    // 添加前端验证
    if (!this.data.title.trim()) {
      wx.showToast({
        title: '帖子标题不能为空',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.content.trim()) {
      wx.showToast({
        title: '帖子内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 原有的发布逻辑
    wx.showLoading({
      title: '发布中'
    });
    
    wx.cloud.callFunction({
      name: 'createPost',
      data: {
        title: this.data.title,
        content: this.data.content,
        images: this.data.images,
        isPublic: this.data.isPublic,
        allowComment: this.data.allowComment,
        wikiKnowledge: this.data.wikiKnowledge
      },
      success: res => {
        wx.hideLoading();
        if (res.result.code === 0) {
          wx.showToast({
            title: '发布成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.result.message || '发布失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '发布失败，请稍后重试',
          icon: 'none'
        });
        console.error('发布失败:', err);
      }
    });
  }
}) 