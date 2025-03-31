const {get, post, processResponse} = require('../../utils/request');
const {
  formatRelativeTime,
  getStorage,
  setStorage,
  processCloudUrl,
  processPostData
} = require('../../utils/util');
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
      maxWidth: 1080,
      maxHeight: 1080,
      quality: 0.8
    },
    isEditingMode: false,
    canSubmit: false,
    contentWarn: ''
  },

  onLoad(options) {
    // 如果是编辑模式，加载帖子数据
    if (options.id) {
      this.loadPostData(options.id);
    }
  },

  async loadPostData(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      const result = await api.post.getPostDetail({ id });
      
      if (result.code === 200) {
        const post = processPostData(result.data);
        this.setData({
          title: post.title,
          content: post.content,
          images: post.images || [],
          isPublic: post.is_public,
          allowComment: post.allow_comment,
          wikiKnowledge: post.wiki_knowledge,
          currentStyle: post.style || 'formal',
          isEditingMode: true,
          canSubmit: true
        });
      } else {
        wx.showToast({
          title: result.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.debug('加载帖子失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  onTitleInput(e) {
    const title = e.detail.value;
    this.setData({
      title,
      canSubmit: title.trim() && this.data.content.trim()
    });
  },

  onContentInput(e) {
    const content = e.detail.value;
    let warn = '';
    if (content.length > 3800) {
      warn = '即将达到字数上限';
    }
    
    this.setData({
      content,
      contentWarn: warn,
      canSubmit: content.trim() && this.data.title.trim()
    });
  },

  toggleWiki() {
    this.setData({
      isWikiEnabled: !this.data.isWikiEnabled
    });
  },

  selectStyle(e) {
    this.setData({
      currentStyle: e.currentTarget.dataset.style
    });
  },

  togglePublic() {
    this.setData({
      isPublic: !this.data.isPublic
    });
  },

  toggleComment() {
    this.setData({
      allowComment: !this.data.allowComment
    });
  },

  toggleWikiKnowledge(e) {
    this.setData({
      wikiKnowledge: e.detail.value
    });
  },

  showImagePicker() {
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
      success: (res) => {
        const tempFiles = res.tempFiles;
        const tempPaths = tempFiles.map(file => file.tempFilePath);
        
        this.setData({
          previewImages: tempPaths,
          showImagePreview: true,
          currentPreviewIndex: 0,
          isEditingMode: false  
        });
      }
    });
  },

  switchPreviewImage(e) {
    this.setData({
      currentPreviewIndex: e.currentTarget.dataset.index
    });
  },

  swiperChange(e) {
    this.setData({
      currentPreviewIndex: e.detail.current
    });
  },

  closePreview() {
    this.setData({
      showImagePreview: false,
      previewImages: []
    });
  },

  cropCurrentImage() {
    const index = this.data.currentPreviewIndex;
    const imageSrc = this.data.previewImages[index];
    
    wx.editImage({
      src: imageSrc,
      success: (res) => {
        const newPreviewImages = [...this.data.previewImages];
        newPreviewImages[index] = res.tempFilePath;
        
        this.setData({
          previewImages: newPreviewImages
        });
      }
    });
  },

  confirmPreview() {
    if (this.data.isEditingMode) {
      this.setData({
        images: [...this.data.previewImages],
        showImagePreview: false,
        previewImages: [],
        isEditingMode: false
      });
    } else {
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

  batchEditImages() {
    this.setData({
      previewImages: [...this.data.images],
      showImagePreview: true,
      currentPreviewIndex: 0,
      isEditingMode: true
    });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    
    this.setData({
      images
    });
  },

  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  async submitPost() {
    const { title, content, images, isPublic, allowComment, wikiKnowledge, currentStyle } = this.data;
    
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
    
    wx.showLoading({
      title: '正在发布...',
      mask: true
    });
    
    try {
      const params = {
        title: title.trim(),
        content: content.trim(),
        images: JSON.stringify(images),
        is_public: isPublic,
        allow_comment: allowComment,
        wiki_knowledge: wikiKnowledge,
        style: currentStyle
      };
      
      const result = await api.post.createPost(params);
      
      if (result.code === 200) {
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack({
            delta: 1
          });
        }, 1500);
      } else {
        wx.showToast({
          title: result.message || '发布失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.debug('发布失败:', err);
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
}); 
