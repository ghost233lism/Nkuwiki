const { ToastType } = require('../../utils/util');
const behaviors = require('../../behaviors/index');

Page({
  behaviors: [
    behaviors.baseBehavior,
    behaviors.postBehavior,
    behaviors.authBehavior,
    behaviors.weuiBehavior
  ],

  data: {
    tabIndex: 0,
    tabTitles: ['富文本模式', 'Markdown'],
  
    // --- Form Data ---
    form: {
      title: '',
      content: '',
      images: [],
      isPublic: true,
      allowComment: true,
      category_id: 1,
      tags: []
    },
    categoryId: 1,  
    tabItems:  [
      { category_id: 1, tag:'study', text: '学习交流' },
      { category_id: 2, tag:'life', text: '校园生活' },
      { category_id: 3, tag:'job', text: '就业创业' },
      { category_id: 4, tag:'club', text: '社团活动' },
      { category_id: 5, tag:'lost', text: '失物招领' }
    ],  
    tagInputValue: '',
    tagSelected: {}, // 用于标记标签选中状态
    customTags: [], // 自定义标签列表
    showCustomTagInput: false,
    forceRefresh: 0,

    // --- 统一验证规则 ---
    rules: {
      content: [
        { required: true, message: '请输入内容' },
        { min: 10, message: '内容至少10个字' }
      ]
    },

    // --- UI State ---
    canSubmit: false,
    submitting: false,
    error: false,
    errorMsg: '',
    
    // 是否是Markdown模式
    isMarkdownMode: false,
    
    // weui-uploader需要的函数
    selectFile: null,
    uploadFile: null,
    
    // 顶部消息条
    toptipsShow: false,
    toptipsMsg: '',
    toptipsType: 'error',

    // 预览对话框
    dialogShow: false,
    dialogTitle: '',
    dialogContent: '',
    dialogButtons: [],

    // Markdown预览状态
    showMarkdownPreview: false,

    // 设置按钮配置
    settingButtons: [
      {
        field: 'isPublic',
        icon: 'eye',
        text: '公开',
        iconSize: 24
      },
      {
        field: 'allowComment',
        icon: 'comment',
        text: '允许评论',
        iconSize: 24
      }
    ]
  },

  async onLoad() {
    await this.initPage();
    
    // 初始化上传组件
    this.initUploader();
    
    // 确保标签数组已初始化
    this.setData({
      'form.tags': [],
      tagSelected: {},
      customTags: [],
      canSubmit: false  // 初始状态设为false
    });

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
      category_id: 1
    });
  },

  // 模式切换处理
  switchToMarkdownMode() {
    if (this.data.isMarkdownMode) return;
    
    // 切换到Markdown模式
    this.setData({
      isMarkdownMode: true,
      rules: this.data.rules
    });
    
    // 验证表单
    this.validatePostForm();
  },
  
  switchToNormalMode() {
    if (!this.data.isMarkdownMode) return;
    
    // 切换到普通模式
    this.setData({
      isMarkdownMode: false,
      rules: this.data.rules
    });
    
    // 从markdown内容中提取标题
    this._extractTitleFromMarkdown();
    
    // 验证表单
    this.validatePostForm();
  },
  
  // 从markdown内容中提取标题
  _extractTitleFromMarkdown() {
    const content = this.data.form.content || '';
    const titleMatch = content.match(/^#\s+(.+)$/m);
    
    if (titleMatch && titleMatch[1]) {
      // 提取到标题
      const title = titleMatch[1].trim();
      let newContent = content;
      
      // 从内容中移除标题行
      newContent = newContent.replace(/^#\s+(.+)$/m, '').trim();
      
      this.setData({
        'form.title': title,
        'form.content': newContent
      });
    }
  },

  // 使用baseBehavior的validateForm方法
  validatePostForm() {
    const content = this.data.form.content || '';
    
    // 检查内容是否为空
    if (!content) {
      this.setData({ canSubmit: false });
      return false;
    }
    
    // Markdown模式下自动处理标题
    if (this.data.isMarkdownMode) {
      // 无需标题检查，只要有内容即可
      this.setData({ canSubmit: true });
      return true;
    } else {
      // 富文本模式需要检查标题
      if (!this.data.form.title || this.data.form.title.length < 2) {
        this.setData({ canSubmit: false });
        return false;
      }
    }
    
    // 验证通过，可以提交
    this.setData({ canSubmit: true });
    return true;
  },
  
  // 表单变更
  onFormChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setFormField(field, value);
    this.validatePostForm();
  },

  // 开关切换
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.currentTarget.dataset.value !== undefined ? 
                  e.currentTarget.dataset.value : 
                  e.detail.value;
    
    this.setFormField(field, value);
    this.validatePostForm();
  },

  // 标签相关方法
  selectTag(e) {
    const { tag } = e.currentTarget.dataset;
    if (!tag) return;
    
    // 创建标签选中状态的副本
    const newTagSelected = {...this.data.tagSelected};
    
    // 切换标签的选中状态
    if (newTagSelected[tag]) {
      delete newTagSelected[tag];
    } else {
      // 检查标签数量限制
      if (Object.keys(newTagSelected).length >= 3) {
        this._showToptips('最多添加3个标签', ToastType.error);
        return;
      }
      newTagSelected[tag] = true;
    }
    
    console.debug('标签选择状态:', newTagSelected);
    
    // 更新选中状态和表单数据
    this.setData({
      tagSelected: newTagSelected,
      'form.tags': Object.keys(newTagSelected)
    });
  },
  
  // 显示标签输入框
  showTagInput() {
    this.setData({
      showCustomTagInput: true
    });
  },
  
  // 隐藏标签输入框
  hideTagInput() {
    this.setData({
      showCustomTagInput: false,
      tagInputValue: ''
    });
  },
  
  onTagInput(e) {
    this.setData({
      tagInputValue: e.detail.value
    });
  },
  
  // 添加自定义标签
  addTag() {
    const value = this.data.tagInputValue.trim();
    if (!value) return;
    
    // 创建标签选中状态的副本
    const newTagSelected = {...this.data.tagSelected};
    
    // 检查标签是否已存在
    if (newTagSelected[value]) {
      this._showToptips('该标签已存在', ToastType.ERROR);
      return;
    }
    
    // 检查标签数量限制
    if (Object.keys(newTagSelected).length >= 3) {
      this._showToptips('最多添加3个标签', ToastType.ERROR);
      return;
    }
    
    // 添加标签
    newTagSelected[value] = true;
    
    // 添加到自定义标签列表
    const newCustomTags = [...this.data.customTags, value];
    
    // 更新选中状态和表单数据
    this.setData({
      tagSelected: newTagSelected,
      customTags: newCustomTags,
      'form.tags': Object.keys(newTagSelected),
      tagInputValue: ''
    });
  },
  
  // 移除自定义标签
  removeCustomTag(e) {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    
    // 创建副本
    const newTagSelected = {...this.data.tagSelected};
    const newCustomTags = this.data.customTags.filter(t => t !== tag);
    
    // 移除标签
    delete newTagSelected[tag];
    
    // 更新状态
    this.setData({
      tagSelected: newTagSelected,
      customTags: newCustomTags,
      'form.tags': Object.keys(newTagSelected)
    });
  },

  // 显示图片上传组件
  showImageUploader() {
    const imageUploader = this.selectComponent('#imageUploader');
    if (imageUploader) {
      imageUploader.chooseImage();
    }
  },
  
  // 对话框按钮点击
  tapDialogButton(e) {
    this.setData({ dialogShow: false });
  },
  
  // 图片选择后的回调
  onImagesChoose(e) {
    console.debug('选择图片', e.detail);
    // 用户选择了图片，但还未上传
    const images = e.detail.images || [];
    this.validatePostForm();
  },
  
  // 图片上传完成后的回调
  onImagesUploaded(e) {
    console.debug('图片上传完成', e.detail);
    // 更新表单中的图片列表
    const images = e.detail.images || [];
    this.setFormField('images', images);
    this.validatePostForm();
  },

  // 提交表单
  async submitForm() {
    // 防止重复提交
    if (this.data.submitting) return;

    // 验证表单
    if (!this.validatePostForm()) {
      wx.showToast({
        title: '请完善内容',
        icon: 'none'
      });
      return;
    }

    // 显示加载组件
    // const loadingComponent = this.selectComponent('#loading');
    // if (loadingComponent) {
    //   loadingComponent.showLoading({
    //     text: '发布中...',
    //     type: 'fullscreen',
    //     mask: true
    //   });
    // }

    // 设置提交状态
    this.setData({ submitting: true });

    try {
      // 准备提交数据
      const formData = this.data.form;
      let content = formData.content || '';
      let title = formData.title || '无标题';
      
      // 处理标题
      const hasMarkdownTitle = content.trim().match(/^#\s+(.+)$/m);
      if (hasMarkdownTitle) {
        // 已有标题，提取出来
        title = hasMarkdownTitle[1].trim();
      } else {
        // 没有标题，添加一个
        content = `# ${title}\n\n${content}`;
      }
      
      // 构建API提交数据
      const postData = {
        title,
        content,
        image: formData.images || [],
        category_id: formData.category_id || 1,
        is_public: formData.isPublic,
        allow_comment: formData.allowComment,
        tag: formData.tags || []
      };
      
      // 提交帖子
      const result = await this._createPost(postData);
      
      if (result.code === 200) {
        // 显示发布成功提示
        // wx.showToast({
        //   title: '发布成功',
        //   icon: 'success',
        //   duration: 1500
        // });
        
        // 立即返回首页
        wx.navigateBack();
      } else {
        throw new Error(result.message || '发布失败');
      }
    } catch (err) {
      console.debug('提交帖子失败:', err);
      
      this._showToptips(err.message || '发布失败，请稍后再试', ToastType.ERROR);
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 显示顶部消息提示
  _showToptips(msg, type = 'error') {
    this.setData({
      toptipsShow: true,
      toptipsMsg: msg,
      toptipsType: type
    });

    setTimeout(() => {
      this.setData({
        toptipsShow: false
      });
    }, 3000);
  },

  // 处理text-area组件的预览状态变化
  onPreviewChange(e) {
    const { showPreview } = e.detail;
    this.setData({
      showMarkdownPreview: showPreview
    });
  },

  // 设置表单字段
  setFormField(field, value) {
    const newData = {};
    newData[`form.${field}`] = value;
    this.setData(newData, () => {
      this.validatePostForm();
    });
  },

  // 处理模式Tab切换事件
  onModeTabChange(e) {
    const { index } = e.detail;
    
    // index为1表示Markdown模式，0表示富文本模式
    if (index === 1) {
      this.switchToMarkdownMode();
    } else {
      this.switchToNormalMode();
    }
  },

  // 分类选择
  selectCategory(e) {
    const { tab } = e.detail;
    const categoryId = tab.category_id;
    
    this.setData({
      categoryId,
      'form.category_id': categoryId
    });
  },
}); 