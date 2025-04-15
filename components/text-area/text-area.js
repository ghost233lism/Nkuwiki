/**
 * 文本域组件
 */
const towxml = require('/components/towxml/index');

Component({
  options: {
    styleIsolation: 'isolated'
  },
  
  properties: {
    // 文本内容
    value: {
      type: String,
      value: '',
      observer: function(newVal) {
        if (newVal !== this.data._lastValue) {
          this._updateContent(newVal);
        }
      }
    },
    // 占位文本
    placeholder: {
      type: String,
      value: '请输入内容'
    },
    // 最大字符数
    maxlength: {
      type: Number,
      value: 140
    },
    // 高度
    height: {
      type: Number,
      value: 200,
      observer: function(newVal) {
        // 确保高度值为数字
        if (typeof newVal !== 'number' || isNaN(newVal)) {
          console.warn('text-area组件: height属性应为数字，已使用默认值200');
          this.setData({
            _height: 200
          });
        } else {
          this.setData({
            _height: newVal
          });
        }
      }
    },
    // 是否显示计数器
    showCount: {
      type: Boolean,
      value: true
    },
    // 是否自动获取焦点
    focus: {
      type: Boolean,
      value: false
    },
    // 是否允许自动增高
    autoHeight: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否保留空格和换行
    space: {
      type: Boolean,
      value: false
    },
    // 键盘弹起时，是否自动上推页面
    adjustPosition: {
      type: Boolean,
      value: true
    },
    // 是否为Markdown编辑模式
    markdownMode: {
      type: Boolean,
      value: true
    },
    // 是否显示工具栏
    showToolbar: {
      type: Boolean,
      value: true
    },
    // 标题（用于预览时生成markdown标题）
    title: {
      type: String,
      value: ''
    },
    // 是否只显示预览切换按钮，隐藏其他工具栏按钮
    simpleToolbar: {
      type: Boolean,
      value: false
    },
    // 是否为只读模式（只显示预览）
    readOnly: {
      type: Boolean,
      value: false
    },
    // 是否允许滚动预览内容
    scroll: {
      type: Boolean,
      value: true
    },
    // 是否固定高度，不允许滚动
    fixedHeight: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    // 当前字符数
    currentLength: 0,
    // 是否显示预览
    showPreview: false,
    // 预览内容
    markdownNodes: null,
    // 内部使用的高度值，确保为数字
    _height: 200,
    _lastValue: '',
    _timer: null,
    nodes: [],
    rendering: false,
    // 内部状态 - 修改为_focus避免与property重名
    _focus: false,
    rows: 1,
    markdownHTML: '',
    imageCache: {},
    // 已上传图片列表
    uploadedImages: [],
    // 图片计数器
    _imageCounter: 0
  },
  
  observers: {
    'value': function(value) {
      this.setData({
        currentLength: value ? value.length : 0
      });
      
      // 如果在预览模式，更新预览内容
      if (this.data.showPreview) {
        this.updatePreview();
      }
    },
    'readOnly': function(readOnly) {
      // 如果是只读模式，自动切换到预览模式
      if (readOnly && !this.data.showPreview) {
        this.setData({ showPreview: true });
        this.updatePreview();
      }
    },
    'markdownMode, value': function(markdownMode, value) {
      this._updateContent(value);
    }
  },
  
  lifetimes: {
    attached() {
      // 每次组件初始化时强制清除图片计数器
      this._imageCounter = 0;
      wx.setStorageSync('image_counter', 0);
      
      this.setData({
        currentLength: this.properties.value ? this.properties.value.length : 0,
        _height: Number(this.properties.height) || 200,
        uploadedImages: [] // 确保初始化为空数组
      });
      
      // 如果是只读模式，自动切换到预览模式
      if (this.properties.readOnly && !this.data.showPreview) {
        this.setData({ showPreview: true });
      }
      
      // 初始化value
      this._updateContent(this.data.value);
    },
    
    ready() {
      // 如果已经在预览模式，初始化预览内容
      if (this.data.showPreview && this.properties.value) {
        this.updatePreview();
      }
    },
    detached() {
      // 清理定时器
      if (this.data._timer) {
        clearTimeout(this.data._timer);
      }
    }
  },
  
  methods: {
    // 输入事件
    onInput(e) {
      const value = e.detail.value;
      this.setData({
        currentLength: value.length
      });
      this.triggerEvent('input', {
        value,
        cursor: e.detail.cursor
      });
    },
    
    // 获取焦点事件
    onFocus(e) {
      this.triggerEvent('focus', e.detail);
    },
    
    // 失去焦点事件
    onBlur(e) {
      this.triggerEvent('blur', e.detail);
    },
    
    // 确认事件
    onConfirm(e) {
      this.triggerEvent('confirm', e.detail);
    },
    
    // 切换预览
    togglePreview() {
      // 如果是只读模式，不允许切换
      if (this.properties.readOnly) return;
      
      const showPreview = !this.data.showPreview;
      
      if (showPreview) {
        // 先更新预览内容，再切换预览状态
        this.updatePreview();
      }
      
      this.setData({ showPreview });
      
      // 通知父组件预览状态改变
      this.triggerEvent('previewchange', { showPreview });
    },
    
    // 更新Markdown预览
    updatePreview() {
      let content = this.properties.value || '';
      
      // 如果内容为空，仅设置空状态并直接返回
      if (!content || content.trim() === '') {
        this.setData({ 
          markdownNodes: null,
          markdownHTML: '',
          rendering: false
        });
        return;
      }
      
      // 如果有标题但内容不包含标题，添加标题
      const title = this.properties.title || '';
      if (title && !content.trim().startsWith('#') && !content.includes(title)) {
        content = `# ${title}\n\n${content}`;
      }
      
      // 设置为渲染中状态
      this.setData({ rendering: true });
      
      // 使用setTimeout使渲染过程异步化，避免阻塞UI
      this.data._timer = setTimeout(() => {
        try {
          // 使用towxml渲染markdown
          const markdownNodes = towxml(content, 'markdown', {
            theme: 'light',
            events: {
              tap: (e) => {
                // 点击链接事件处理
                this.triggerEvent('linktap', e);
              }
            },
            // 自定义图片样式类
            imgClass: 'markdown-image',
            // 自定义样式，控制图片大小
            styleList: [
              // 添加自定义样式
              '.markdown-image{max-width:120rpx !important;width:auto !important;height:auto !important;display:block !important;margin:10rpx 0 !important;border-radius:8rpx;object-fit:contain !important;}',
              '.towxml-image{max-width:120rpx !important;width:auto !important;height:auto !important;}',
              '.h2w__main image{max-width:120rpx !important;width:auto !important;height:auto !important;}'
            ]
          });
          
          this.setData({
            markdownNodes: markdownNodes,
            rendering: false
          });
        } catch (e) {
          console.error('Markdown渲染失败:', e);
          this.setData({ 
            markdownNodes: null,
            rendering: false
          });
          this.triggerEvent('error', { error: e });
        }
      }, 50);
    },
    
    // 工具栏操作 - 粗体
    onBoldTap() {
      const value = this.properties.value || '';
      this.triggerEvent('input', {
        value: value + '**粗体文字**',
        cursor: value.length + 10
      });
    },
    
    // 工具栏操作 - 斜体
    onItalicTap() {
      const value = this.properties.value || '';
      this.triggerEvent('input', {
        value: value + '*斜体文字*',
        cursor: value.length + 5
      });
    },
    
    // 工具栏操作 - @ 用户
    onAtTap() {
      const value = this.properties.value || '';
      this.triggerEvent('input', {
        value: value + '@用户 ',
        cursor: value.length + 4
      });
    },
    
    // 图片按钮点击事件
    onImageTap() {
      // 获取图片上传组件实例
      const imageUploader = this.selectComponent('#imageUploader');
      if (imageUploader) {
        imageUploader.chooseImage();
      }
      this.triggerEvent('image-tap');
    },
    
    // 图片上传完成回调
    onImageUploadComplete(e) {
      const { success, images } = e.detail;
      if (success && images && images.length > 0) {
        // 获取原始内容
        let content = this.properties.value || '';
        const textArea = this.selectComponent('textarea');
        
        // 获取插入位置
        let insertPosition = content.length;
        if (textArea && textArea.cursor) {
          insertPosition = textArea.cursor;
        }
        
        // 处理新上传的图片
        let imageContent = '';
        const newImages = [...this.data.uploadedImages]; // 保留已有图片，避免闪烁
        
        // 在Markdown模式下，不清空已有图片标记，只处理新图片
        
        // 处理每张新上传的图片
        for (let i = 0; i < images.length; i++) {
          const url = images[i];
          this._imageCounter++; // 递增图片计数器
          
          // 创建图片对象
          const imgObj = {
            id: `img_${Date.now()}_${i}`,
            url,
            index: this._imageCounter,
            style: 'max-width:120rpx;width:auto;height:auto;display:block;margin:10rpx 0;'
          };
          
          // 添加到新图片列表
          newImages.push(imgObj);
          
          // 仅在Markdown模式下才向内容中添加图片标记
          if (this.properties.markdownMode) {
            // Markdown模式：使用标准Markdown图片语法
            imageContent += `\n![](${url})\n`;
          }
        }
        
        // 更新上传的图片列表
        this.setData({
          uploadedImages: newImages
        });
        
        // 触发图片插入事件，向父组件传递图片信息
        this.triggerEvent('image-insert', {
          images: newImages,
          imageKey: `image_${Date.now()}`
        });
        
        // 仅在Markdown模式下更新内容
        if (this.properties.markdownMode) {
          // 插入新的图片内容
          const newContent = content.slice(0, insertPosition) + imageContent + content.slice(insertPosition);
          
          // 更新内容
          this.setData({
            value: newContent,
            currentLength: newContent.length
          });
          
          // 触发输入事件通知父组件内容变化
          this.triggerEvent('input', {
            value: newContent,
            cursor: insertPosition + imageContent.length
          });
        }
        
        // 如果在预览模式下，更新预览内容
        if (this.data.showPreview) {
          this.updatePreview();
        }
      }
    },
    
    // 删除图片
    deleteImage(e) {
      const { id } = e.currentTarget.dataset;
      if (!id) return;
      
      // 查找要删除的图片
      const imageToDelete = this.data.uploadedImages.find(img => img.id == id);
      if (!imageToDelete) return;
      
      // 确认删除
      wx.showModal({
        title: '删除图片',
        content: `确定要删除图片${imageToDelete.index}吗？`,
        success: (res) => {
          if (res.confirm) {
            this._removeImage(id);
          }
        }
      });
    },
    
    // 预览图片
    previewImage(e) {
      const { id } = e.currentTarget.dataset;
      if (!id) return;
      
      // 查找图片
      const image = this.data.uploadedImages.find(img => img.id == id);
      if (!image) return;
      
      // 使用微信原生图片预览
      wx.previewImage({
        current: image.url,
        urls: this.data.uploadedImages.map(img => img.url)
      });
    },
    
    // 内部方法：删除图片并更新状态
    _removeImage(id) {
      // 查找要删除的图片
      const imageToDelete = this.data.uploadedImages.find(img => img.id == id);
      if (!imageToDelete) return;
      
      // 更新图片列表，移除被删除的图片
      const newImages = this.data.uploadedImages.filter(img => img.id != id);
      
      this.setData({
        uploadedImages: newImages
      });
      
      // 仅在Markdown模式下从内容中删除图片标记
      if (this.properties.markdownMode) {
        // 获取内容
        let content = this.properties.value || '';
        
        // Markdown模式：删除标准Markdown图片标记
        content = content.replace(/\n?!\[\]\([^\)]+\)\n?/g, '');
        
        // 更新内容
        this.setData({
          value: content,
          currentLength: content.length
        });
        
        // 触发输入事件
        this.triggerEvent('input', {
          value: content,
          cursor: content.length
        });
      }
      
      // 更新预览
      if (this.data.showPreview) {
        this.updatePreview();
      }
      
      // 如果删除所有图片，重置计数器
      if (newImages.length === 0) {
        this._imageCounter = 0;
      }
      
      // 触发删除图片事件，通知父组件
      this.triggerEvent('image-delete', {
        imageId: id,
        remainingImages: newImages
      });
    },
    
    // 更新内容
    _updateContent(value) {
      // 保存最新值
      this.setData({
        _lastValue: value || ''
      });
      
      if (!this.properties.markdownMode) {
        return;
      }

      // 解析Markdown
      if (value && this.data.showPreview) {
        try {
          const result = towxml(value, 'markdown', {
            theme: 'light',
            events: {
              tap: (e) => {
                this.triggerEvent('linktap', e.currentTarget.dataset);
              }
            },
            // 自定义图片样式类
            imgClass: 'markdown-image',
            // 自定义样式，控制图片大小
            styleList: [
              // 添加自定义样式
              '.markdown-image{max-width:120rpx !important;width:auto !important;height:auto !important;display:block !important;margin:10rpx 0 !important;border-radius:8rpx;object-fit:contain !important;}',
              '.towxml-image{max-width:120rpx !important;width:auto !important;height:auto !important;}',
              '.h2w__main image{max-width:120rpx !important;width:auto !important;height:auto !important;}'
            ]
          });
          
          this.setData({
            markdownNodes: result
          });
        } catch (err) {
          console.error('解析markdown失败:', err);
        }
      }
    }
  }
}); 