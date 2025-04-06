const { ToastType } = require('../../utils/util');
const behaviors = require('../../behaviors/index');

// 常量配置
const CATEGORIES = [
  { id: 1, name: '学习交流', tag: 'study' },
  { id: 2, name: '校园生活', tag: 'life' },
  { id: 3, name: '就业创业', tag: 'job' },
  { id: 4, name: '社团活动', tag: 'club' },
  { id: 5, name: '失物招领', tag: 'lost' }
];

Page({
  behaviors: [
    behaviors.baseBehavior,
    behaviors.postBehavior,
    behaviors.authBehavior,
    behaviors.weuiBehavior
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
      tags: []
    },

    // 导航按钮配置
    navButtons: [
      {type: "back", show: true}
    ],

    tagInputValue: '',
    tagSelected: {}, // 用于标记标签选中状态
    customTags: [], // 自定义标签列表
    showCustomTagInput: false,
    forceRefresh: 0,

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

    // 标准模式和Markdown模式的规则
    normalRules: {
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
    markdownRules: {
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
    showMarkdownPreview: false
  },

  async onLoad() {
    await this.initPage();
    
    // 初始化上传组件
    this.initUploader();
    
    // 确保标签数组已初始化
    this.setData({
      'form.tags': [],
      tagSelected: {},
      customTags: []
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
      wikiKnowledge: false,
      category_id: 1
    });
  },

  // 模式切换处理
  switchToMarkdownMode() {
    if (this.data.isMarkdownMode) return;
    
    // 切换到Markdown模式
    this.setData({
      isMarkdownMode: true,
      rules: this.data.markdownRules
    });
    
    // 验证表单
    this.validatePostForm();
  },
  
  switchToNormalMode() {
    if (!this.data.isMarkdownMode) return;
    
    // 切换到普通模式
    this.setData({
      isMarkdownMode: false,
      rules: this.data.normalRules
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
    // 如果是Markdown模式，检查content中是否包含标题或者form.title是否有值
    if (this.data.isMarkdownMode) {
      const content = this.data.form.content || '';
      const hasMarkdownTitle = content.trim().match(/^#\s+.+$/m);
      const hasFormTitle = !!this.data.form.title;
      
      // 如果内容不为空且（有Markdown标题或表单标题），则视为有效
      if (content.length >= 10 && (hasMarkdownTitle || hasFormTitle)) {
        this.setData({ canSubmit: true });
        return true;
      }
    }
    
    // 常规验证
    const isValid = this.validateForm(this.data.rules);
    this.setData({ canSubmit: isValid });
    return isValid;
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

  // 分类选择
  onTopicSelect(e) {
    const { category } = e.currentTarget.dataset;
    const categoryId = parseInt(category);
    
    // 找到对应分类的索引
    const categoryIndex = this.data.categories.findIndex(item => item.id === categoryId);
    if (categoryIndex !== -1) {
      this.updateState({ categoryIndex });
    }
    
    this.setFormField('category_id', categoryId);
    this.validatePostForm();
  },

  // 返回上一页
  navigateBack() {
    // 返回上一页
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },

  // 处理导航栏按钮点击
  onNavButtonTap(e) {
    const { type } = e.detail;
    if (type === 'publish') {
      this.submitForm();
    }
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

    // 设置提交状态
    this.setData({ submitting: true });

    try {
      // 准备提交数据
      const formData = this.data.form;
      let postData = {
        content: formData.content,
        image: formData.images || [],
        category_id: formData.category_id || 1,
        is_public: formData.isPublic,
        allow_comment: formData.allowComment,
        wiki_knowledge: formData.wikiKnowledge,
        tag: formData.tags || []
      };
      
      // 如果是Markdown模式，需要在content前面添加标题
      if (this.data.isMarkdownMode) {
        // 提取一个title供API使用
        let titleForApi = formData.title || '无标题';
        
        // 检查content是否已有标题行
        const titleMatch = postData.content.trim().match(/^#\s+(.+)$/m);
        if (titleMatch && titleMatch[1]) {
          // 如果内容中已经有标题，提取出来作为API的title参数
          titleForApi = titleMatch[1].trim();
        } else {
          // 如果内容中没有标题，添加一个
          const title = formData.title || '无标题';
          postData.content = `# ${title}\n\n${postData.content}`;
        }
        
        // 设置API需要的title参数
        postData.title = titleForApi;
      } else {
        // 普通模式下，保持标题字段
        postData.title = formData.title;
      }
      
      // 提交帖子
      const result = await this._createPost(postData);
      
      if (result.code === 200) {
        this._showToptips('发布成功', ToastType.SUCCESS);
        
        // 设置需要刷新首页帖子列表的标记
        this.setStorage('needRefreshPosts', true);
        
        // 设置全局app变量，确保返回首页后立即刷新
        const app = getApp();
        if (app) {
          app.globalData = app.globalData || {};
          app.globalData.refreshPostList = true;
        }
        
        // 延迟返回，等待显示成功提示
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index',
            success: () => {
              // 尝试通过页面栈获取首页实例并触发刷新
              const pages = getCurrentPages();
              const indexPage = pages.find(p => p.route === 'pages/index/index');
              if (indexPage) {
                // 如果能获取到首页实例，直接调用其刷新方法
                const postList = indexPage.selectComponent('#postList');
                if (postList) {
                  setTimeout(() => {
                    postList.loadInitialData();
                  }, 300);
                }
              }
            }
          });
        }, 1500);
      } else {
        throw new Error(result.message || '发布失败');
      }
    } catch (err) {
      console.error('提交帖子失败:', err);
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
  }
}); 