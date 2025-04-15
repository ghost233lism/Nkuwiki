// pages/profile/edit/edit.js
const { ui, ToastType, storage } = require('../../../utils/util');
const behaviors = require('../../../behaviors/index');

Page({
  behaviors: [
    behaviors.baseBehavior,
    behaviors.authBehavior, 
    behaviors.userBehavior,
  ],

  data: {
    userInfo: null,
    loading: true,
    error: false,
    errorMsg: '',
    toptipsShow: false,
    toptipsMsg: '',
    toptipsType: 'info',
    formSubmitting: false,
    // 选择器数据
    ranges: {
      countries: ['中国', '美国', '日本', '韩国', '英国', '法国', '德国', '澳大利亚', '加拿大', '其他'],
      languages: ['中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语', '其他']
    },
    // 表单字段定义
    groups: [
      {
        name: 'basic',
        title: '基本资料'
      },
      {
        name: 'contact',
        title: '联系方式'
      },
      {
        name: 'location',
        title: '位置信息'
      }
    ],
    formFields: [
      {
        type: 'input',
        name: 'nickname',
        label: '昵称',
        placeholder: '请输入昵称',
        maxlength: 20,
        required: true,
        group: 'basic'
      },
      {
        type: 'textarea',
        name: 'bio',
        label: '个人简介',
        placeholder: '一句话介绍自己',
        maxlength: 200,
        group: 'basic'
      },
      {
        type: 'input',
        name: 'wechatId',
        label: '微信号',
        maxlength: 20,
        placeholder: '选填',
        group: 'contact'
      },
      {
        type: 'input',
        name: 'qqId',
        label: 'QQ号',
        maxlength: 20,
        placeholder: '选填',
        required: true,
        group: 'contact'
      },
      {
        type: 'input',
        name: 'phone',
        label: '手机号',
        maxlength: 20,
        placeholder: '选填',
        group: 'contact'
      },
      {
        type: 'picker',
        name: 'location',
        label: '国家/城市',
        placeholder: '选择国家和城市',
        range: 'countries',
        group: 'location'
      }
    ]
  },

  async onLoad() {
    this.setData({ loading: true });
    
    try {
      console.debug('开始加载编辑页面');
      const userInfo = await this._getUserInfo(true);
      
      if (userInfo) {
        this.setData({ 
          userInfo: userInfo,
          loading: false 
        });
        
        console.debug('用户信息:', userInfo);
        
        // 初始化表单面板
        setTimeout(() => {
          this.initFormPanel();
        }, 300);
      }
    } catch (err) {
      console.error('获取用户资料失败:', err);
      this.setData({ 
        error: true, 
        errorMsg: '获取用户资料失败，请重试',
        loading: false
      });
    }
  },

  // 表单字段变更事件处理
  onFieldChange(e) {
    const { name, value } = e.detail;
    console.debug('字段变更:', name, value);
    
    // 更新用户信息
    this.setData({
      [`userInfo.${name}`]: value
    });
  },
  
  // 初始化form-panel组件
  initFormPanel() {
    console.debug('初始化表单面板');
    
    const formPanel = this.selectComponent('#profileForm');
    if (!formPanel) {
      console.error('未找到表单面板组件');
      return;
    }
    
    // 用户信息数据映射到表单数据
    const formData = {};
    if (this.data.userInfo) {
      // 获取所有表单字段的名称
      const fields = this.data.formFields.map(field => field.name);
      
      fields.forEach(field => {
        // 特殊处理location字段，从country和city组合
        if (field === 'location') {
          const country = this.data.userInfo.country || '';
          const city = this.data.userInfo.city || '';
          
          if (country) {
            formData[field] = city ? `${country} - ${city}` : country;
          } else {
            formData[field] = '';
          }
          
          console.debug('组合后的location字段:', formData[field]);
        } else {
          formData[field] = this.data.userInfo[field] || '';
        }
      });
      
      // 添加调试日志，检查联系方式字段
      console.debug('用户数据映射到表单:', 
        `nickname=${this.data.userInfo.nickname || '空'}`, 
        `bio=${this.data.userInfo.bio || '空'}`,
        `wechatId=${this.data.userInfo.wechatId || '空'}`, 
        `qqId=${this.data.userInfo.qqId || '空'}`,
        `phone=${this.data.userInfo.phone || '空'}`,
        `country=${this.data.userInfo.country || '空'}`,
        `city=${this.data.userInfo.city || '空'}`
      );
    }

    console.debug('设置表单数据:', formData);

    // 设置表单数据
    formPanel.setData({
      formData,
      _initialized: true
    });
    
    // 刷新组件
    this.setData({
      _formPanelRefreshKey: Date.now()
    });
  },

  // 表单提交处理
  onFormSubmit(e) {
    console.debug('表单提交:', e.detail);
    this.saveChanges(e.detail);
  },

  async saveChanges(formData) {
    if (this.data.formSubmitting) return;
    
    // 添加调试日志
    console.debug('准备保存表单数据:', JSON.stringify(formData));
    
    try {
      this.setData({ formSubmitting: true });
      this.showLoading('保存中...');

      // 创建更新数据对象
      const updateData = {};
      const fields = [
        'nickname', 'bio', 'wechatId', 'qqId', 'phone'
      ];
      
      // 添加基本字段
      fields.forEach(field => {
        if (formData[field] !== undefined) {
          updateData[field] = formData[field];
        }
      });
      
      // 处理location字段，将其分解为country和city
      if (formData.location) {
        console.debug('处理location字段:', formData.location);
        const locationParts = formData.location.split(' - ');
        if (locationParts.length > 0) {
          updateData.country = locationParts[0] || '';
          updateData.city = locationParts.length > 1 ? locationParts[1] : '';
          console.debug('分解后的国家和城市:', updateData.country, updateData.city);
        }
      }

      // 如果头像已更新，也添加到更新数据中
      if (this.data.userInfo && this.data.userInfo.avatar) {
        updateData.avatar = this.data.userInfo.avatar;
      }

      if (Object.keys(updateData).length === 0) {
        this.showToptips('无数据需要更新', 'info');
        return;
      }
      
      console.debug('最终提交的数据:', JSON.stringify(updateData));
      
      // 调用API更新资料
      const result = await this._updateUserProfile(updateData);
      if (!result) throw new Error('更新失败');

      // 更新成功
      this.showToptips('保存成功', 'success');
      this.setStorage('needRefreshProfile', true);
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      console.error('保存失败:', err);
      this.showToptips('保存失败，请重试', 'error');
    } finally {
      this.hideLoading();
      this.setData({ formSubmitting: false });
    }
  },

  onRetry() {
    // 重新加载页面数据
    this.onLoad();
  },

  // 处理头像加载错误
  onAvatarError() {
    this.setData({
      'userInfo.avatar': this.data.defaultAvatar
    });
  },

  // 处理用户选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      this.setData({
        'userInfo.avatar': avatarUrl
      });
    }
  },

  showToptips(msg, type = 'info') {
    this.setData({
      toptipsShow: true,
      toptipsMsg: msg,
      toptipsType: type
    });
    
    setTimeout(() => {
      this.setData({ toptipsShow: false });
    }, 3000);
  }
});