const { ui, error, ToastType, createApiClient, storage } = require('../../utils/util');
const baseBehavior = require('../../behaviors/base-behavior');
const postBehavior = require('../../behaviors/post-behavior');
const userBehavior = require('../../behaviors/user-behavior');
const formBehavior = require('../../behaviors/form-behavior');

// behaviors
const pageBehavior = require('../../behaviors/page-behavior');
const authBehavior = require('../../behaviors/auth-behavior');
const weuiBehavior = require('../../behaviors/weui-behavior');

// 常量配置
const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'study', name: '学习' },
  { id: 'life', name: '生活' },
  { id: 'job', name: '工作' },
  { id: 'other', name: '其他' }
];

/** @type {WechatMiniprogram.Page.Instance<IPostPageData>} */
Page({
  behaviors: [
    baseBehavior,
    postBehavior,
    userBehavior,
    formBehavior
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
      category: CATEGORIES[0].id
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

    categories: CATEGORIES,
    categoryIndex: 0,

    // --- UI State ---
    canSubmit: false,
    submitting: false,
    error: false,
    errorMsg: '',
    
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
    const isLoggedIn = await this.ensureLogin();
    if (!isLoggedIn) return;

    this.initForm();
  },

  // 表单验证
  onFormChange(e) {
    const { field, value } = e.detail;
    this.setFormField(field, value);
    this.validateForm();
  },

  // 重写图片选择回调，适配表单结构
  onImageSelect(e) {
    const updatedImages = this.methods.onImageSelect.call(this, e);
    this.setFormField('images', updatedImages);
    this.validateForm();
  },

  // 重写图片删除回调，适配表单结构
  onImageDelete(e) {
    const images = this.methods.onImageDelete.call(this, e);
    this.setFormField('images', images);
    this.validateForm();
  },

  // 复选框组变更回调
  onCheckboxGroupChange(e) {
    const values = e.detail.value;
    
    this.setFormField('isPublic', values.includes('isPublic'));
    this.setFormField('allowComment', values.includes('allowComment'));
    this.setFormField('wikiKnowledge', values.includes('wikiKnowledge'));
    
    this.validateForm();
  },

  // 图片上传
  async onImagesChange(e) {
    const images = e.detail.value;
    this.setFormField('images', images);
    this.validateForm();
  },

  // 开关切换
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setFormField(field, value);
    this.validateForm();
  },

  // 分类选择
  onCategoryChange(e) {
    const index = parseInt(e.detail.value);
    const category = CATEGORIES[index].id;
    this.setData({
      categoryIndex: index,
      'form.category': category
    });
    this.validateForm();
  },

  // 提交表单
  async submitForm() {
    if (!this.validateForm()) {
      this.showToast('请检查表单内容', 'error');
      return;
    }

    this.showLoading('发布中...');
    this.setData({ submitting: true });

    try {
      const formData = this.getFormData();
      const result = await this.createPost({
        title: formData.title,
        content: formData.content,
        images: formData.images,
        category: formData.category,
        is_public: formData.isPublic,
        allow_comment: formData.allowComment,
        wiki_knowledge: formData.wikiKnowledge
      });

      if (!result) {
        throw new Error('发布失败');
      }

      this.showToast('发布成功', 'success');
      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          success: () => {
            // 通知列表页刷新
            getApp().globalData.postsUpdated = true;
          }
        });
      }, 1500);
    } catch (err) {
      this.handleError(err, '发布失败');
    } finally {
      this.setData({ submitting: false });
      this.hideLoading();
    }
  }
}) 