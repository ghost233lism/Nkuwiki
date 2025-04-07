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
    // 内部状态
    focus: false,
    rows: 1,
    markdownHTML: ''
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
      this.setData({
        currentLength: this.properties.value ? this.properties.value.length : 0,
        _height: Number(this.properties.height) || 200
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
      
      // 如果有标题但内容不包含标题，添加标题
      const title = this.properties.title || '';
      if (title && !content.trim().startsWith('#') && !content.includes(title)) {
        content = `# ${title}\n\n${content}`;
      }
      
      if (!content) {
        this.setData({ 
          markdownNodes: towxml('*暂无内容*', 'markdown') 
        });
        return;
      }
      
      try {
        // 使用towxml解析Markdown
        const markdownNodes = towxml(content, 'markdown', {
          theme: 'light',
          events: {
            tap: (e) => {
              // 点击链接事件处理
              this.triggerEvent('linktap', e);
            }
          }
        });
        
        this.setData({ markdownNodes });
      } catch (err) {
        this.triggerEvent('error', { error: err });
      }
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
    
    // 工具栏操作 - 添加图片
    onImageTap() {
      this.triggerEvent('imagetap');
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
            }
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