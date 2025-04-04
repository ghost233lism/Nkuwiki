const { ui, error, ToastType, createApiClient, storage } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const postBehavior = require('../../behaviors/postBehavior');
const authBehavior = require('../../behaviors/authBehavior');
const weuiBehavior = require('../../behaviors/weuiBehavior');

// 常量配置
const CATEGORIES = [
  { id: 1, name: '学习交流', tag: 'study' },
  { id: 2, name: '校园生活', tag: 'life' },
  { id: 3, name: '求助', tag: 'help' },
  { id: 4, name: '社团活动', tag: 'club' },
  { id: 5, name: '失物招领', tag: 'lost' }
];

/** @type {WechatMiniprogram.Page.Instance<IPostPageData>} */
Page({
  behaviors: [
    baseBehavior,
    postBehavior,
    authBehavior,
    weuiBehavior
  ],

  data: {
    // --- Form Data ---
    form: {
      title: '',
      content: '',
      images: [],
      isPublic: true,
      allowComment: true,
      wikiKnowledge: false,
      category_id: 1,
      style: 'formal'
    },

    // --- Form Rules ---
    rules: {
      title: [
        { required: true, message: '请输入标题' },
        { min: 2, message: '标题至少2个字' },
        { max: 50, message: '标题最多50个字' }
      ],
      content: [
        { required: true, message: '请输入内容' },
        { min: 10, message: '内容至少10个字' }
      ]
    },

    categories: [
      { id: 1, name: '学习交流', tag: 'study' },
      { id: 2, name: '校园生活', tag: 'life' },
      { id: 3, name: '求助', tag: 'help' },
      { id: 4, name: '社团活动', tag: 'club' },
      { id: 5, name: '失物招领', tag: 'lost' }
    ],
    categoryIndex: 0,

    // 文风选项
    styles: [
      { id: 'formal', name: '正式' },
      { id: 'casual', name: '轻松' },
      { id: 'humorous', name: '幽默' },
      { id: 'professional', name: '专业' }
    ],

    // --- UI State ---
    canSubmit: false,
    submitting: false,
    error: false,
    errorMsg: '',
    
    // 工具栏状态
    showWikiSuggestion: false,
    
    // weui-uploader需要的函数
    selectFile: null,
    uploadFile: null
  },

  async onLoad() {
    await this.initPage();
    
    // 初始化上传组件
    this.initUploader();
  },

  async initPage() {
    // 检查登录状态
    const isLoggedIn = await this._checkLogin(true);
    if (!isLoggedIn) return;

    // 初始化表单
    this.initForm({
      title: '',
      content: '',
      images: [],
      isPublic: true,
      allowComment: true,
      wikiKnowledge: false,
      category_id: 1
    });
  },

  // 使用baseBehavior的validateForm方法
  validatePostForm() {
    const isValid = this.validateForm(this.data.rules);
    this.updateState({ canSubmit: isValid });
    return isValid;
  },
  
  // 表单变更
  onFormChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setFormField(field, value);
    this.validatePostForm();
  },

  // 图片上传相关方法直接使用weuiBehavior中的方法
  // 选择文件方法从weuiBehavior继承
  selectFile(files) {
    console.debug('选择文件:', files);
    return super.selectFile(files);
  },
  
  // 上传文件方法从weuiBehavior继承
  uploadFile(file) {
    console.debug('上传文件:', file);
    return super.uploadFile(file);
  },
  
  // 图片选择回调，关联到表单
  onImageSelect(e) {
    const images = super.onImageSelect(e);
    this.setFormField('images', images.map(img => img.url));
    this.validatePostForm();
  },
  
  // 图片删除回调，关联到表单
  onImageDelete(e) {
    const images = super.onImageDelete(e);
    this.setFormField('images', images.map(img => img.url));
    this.validatePostForm();
  },

  // 复选框组变更回调
  onCheckboxGroupChange(e) {
    const values = e.detail.value;
    
    this.setFormField('isPublic', values.includes('isPublic'));
    this.setFormField('allowComment', values.includes('allowComment'));
    this.setFormField('wikiKnowledge', values.includes('wikiKnowledge'));
    
    this.validatePostForm();
  },

  // 开关切换
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setFormField(field, value);
    this.validatePostForm();
  },

  // 分类选择
  onCategoryChange(e) {
    const index = parseInt(e.detail.value);
    const category_id = CATEGORIES[index].id;
    
    this.updateState({ categoryIndex: index });
    this.setFormField('category_id', category_id);
    
    this.validatePostForm();
  },

  // 返回上一页
  navigateBack() {
    // 使用baseBehavior中的navigateBack方法
    try {
      console.debug('从发帖页面返回');
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          console.error('返回失败，尝试跳转到首页:', err);
          this.switchTab('/pages/index/index');
        }
      });
    } catch (e) {
      console.error('返回操作异常:', e);
      this.switchTab('/pages/index/index');
    }
  },

  // 提交表单
  async submitForm() {
    // 验证表单
    if (!this.validatePostForm()) {
      this.showFormError();
      return;
    }

    // 显示加载状态
    this.showLoading('发布中...');
    this.updateState({ submitting: true });

    try {
      // 获取表单数据
      const formData = this.getForm();
      
      // 调用postBehavior中的方法发布帖子
      console.debug('准备发布帖子', formData);
      const result = await this._createPost({
        title: formData.title,
        content: formData.content,
        images: formData.images,
        category_id: formData.category_id,
        is_public: formData.isPublic,
        allow_comment: formData.allowComment,
        wiki_knowledge: formData.wikiKnowledge,
        style: formData.style
      });

      if (!result) {
        throw new Error('发布失败');
      }

      // 显示成功提示
      this.showToast('发布成功', ToastType.SUCCESS);
      
      // 设置需要刷新首页帖子列表的标记
      this.setStorage('needRefreshPosts', true);
      
      // 延迟返回
      setTimeout(() => {
        try {
          // 使用wx.navigateBack直接返回，避免使用封装的方法可能引起的问题
          wx.navigateBack({
            delta: 1,
            success: () => {
              // 通知列表页刷新
              const app = getApp();
              if (app && app.globalData) {
                app.globalData.postsUpdated = true;
              }
            },
            fail: (err) => {
              console.error('发布成功后返回失败:', err);
              // 返回失败时跳转到首页
              wx.switchTab({
                url: '/pages/index/index',
                success: () => {
                  const app = getApp();
                  if (app && app.globalData) {
                    app.globalData.postsUpdated = true;
                  }
                }
              });
            }
          });
        } catch (navErr) {
          console.error('导航过程中发生异常:', navErr);
          wx.switchTab({ url: '/pages/index/index' });
        }
      }, 1500);
    } catch (err) {
      // 处理错误
      console.error('发布过程发生错误:', err);
      this.handleError(err, err.message || '发布失败');
    } finally {
      // 更新状态并隐藏加载提示
      this.updateState({ submitting: false });
      this.hideLoading();
    }
  },

  // 切换Wiki润色模式
  toggleWikiMode() {
    this.setFormField('wikiKnowledge', !this.data.form.wikiKnowledge);
    this.validatePostForm();
  },

  // 应用Wiki润色建议
  applyWikiSuggestion() {
    // 简单模拟润色效果
    const originalContent = this.data.form.content;
    const enhancedContent = originalContent.length > 0 ? 
      originalContent + '\n\n(已应用Wiki润色建议，优化了文章结构和表达)' : 
      originalContent;
    
    this.setFormField('content', enhancedContent);
    this.validatePostForm();
    this.showToast('已应用润色建议', ToastType.SUCCESS);
  },

  // 文本编辑工具 - 加粗
  onBoldTap() {
    const content = this.data.form.content;
    const selection = this._getSelectionText(content);
    if (selection) {
      const newContent = content.replace(selection, `**${selection}**`);
      this.setFormField('content', newContent);
    } else {
      this.showToast('请先选择要加粗的文本', ToastType.NONE);
    }
  },

  // 文本编辑工具 - 斜体
  onItalicTap() {
    const content = this.data.form.content;
    const selection = this._getSelectionText(content);
    if (selection) {
      const newContent = content.replace(selection, `*${selection}*`);
      this.setFormField('content', newContent);
    } else {
      this.showToast('请先选择要设为斜体的文本', ToastType.NONE);
    }
  },

  // 文本编辑工具 - @
  onAtTap() {
    const content = this.data.form.content;
    this.setFormField('content', content + '@');
  },

  // 辅助方法 - 获取选中文本（简化实现）
  _getSelectionText(text) {
    // 实际中应该使用小程序的selection API
    // 这里简化处理，需要完整实现
    return '';
  },

  // 选择话题/分类
  onTopicSelect(e) {
    const category_id = parseInt(e.currentTarget.dataset.category);
    this.setFormField('category_id', category_id);
    
    // 找到对应的索引位置
    const index = this.data.categories.findIndex(item => item.id === category_id);
    if (index !== -1) {
      this.updateState({ categoryIndex: index });
    }
    
    this.validatePostForm();
  },

  // 添加自定义话题
  onAddTopicTap() {
    // 显示添加话题的输入框
    this.showModal({
      title: '添加话题',
      content: '请输入话题名称（不含#号）',
      editable: true,
      placeholderText: '如: 校园活动',
      success: (res) => {
        if (res.confirm && res.content) {
          const newTopic = {
            id: res.content.toLowerCase().replace(/\s+/g, '_'),
            name: res.content
          };
          
          // 添加到分类列表
          const categories = [...this.data.categories, newTopic];
          const categoryIndex = categories.length - 1;
          
          this.updateState({ 
            categories,
            categoryIndex
          });
          
          // 设置为当前选中的分类
          this.setFormField('category_id', newTopic.id);
          this.validatePostForm();
        }
      }
    });
  },

  // 文风选择
  onStyleSelect(e) {
    const style = e.currentTarget.dataset.style;
    this.setFormField('style', style);
    this.validatePostForm();
  },

  // 图片选择直接方法
  chooseImage() {
    wx.chooseMedia({
      count: 9 - (this.data.form.images?.length || 0),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        const images = [...(this.data.form.images || []), ...tempFiles];
        this.setFormField('images', images);
        this.validatePostForm();
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.form.images;
    
    wx.previewImage({
      current: images[index], // 当前显示图片的链接
      urls: images // 需要预览的图片链接列表
    });
  },
  
  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.form.images];
    
    if (index >= 0 && index < images.length) {
      images.splice(index, 1);
      this.setFormField('images', images);
      this.validatePostForm();
      
      // 显示轻提示
      this.showToast('已删除图片', ToastType.NONE);
    }
  },
}) 