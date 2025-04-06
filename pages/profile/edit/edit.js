// pages/profile/edit/edit.js
const { ui, ToastType } = require('../../../utils/util');
const behaviors = require('../../../behaviors/index');

Page({
  behaviors: [
    behaviors.baseBehavior,
    behaviors.authBehavior, 
    behaviors.userBehavior,
  ],

  data: {
    navButtons: [
      {
        type: 'back',
        text: '返回'
      }
    ],
    userInfo: null,
    loading: true,
    error: false,
    errorMsg: '',
    toptipsShow: false,
    toptipsMsg: '',
    toptipsType: 'info',
    defaultAvatar: '/assets/images/default-avatar.png',
    formSubmitting: false,
    countries: ['中国', '美国', '日本', '韩国', '英国', '法国', '德国', '澳大利亚', '加拿大', '其他'],
    provinces: [],
    cities: [],
    languages: ['中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语', '其他'],
    countryIndex: -1,
    provinceIndex: -1, 
    cityIndex: -1,
    languageIndex: -1,
    // 表单校验规则
    formRules: {
      nickname: [
        { required: true, message: '请输入昵称' },
        { minLength: 2, maxLength: 20, message: '昵称长度为2-20个字符' }
      ],
      bio: [
        { maxLength: 200, message: '个人简介不能超过200个字符' }
      ]
    },
    // 表单字段定义
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
        placeholder: '选填',
        group: 'contact'
      },
      {
        type: 'number',
        name: 'qqId',
        label: 'QQ号',
        placeholder: '选填',
        group: 'contact'
      },
      {
        type: 'picker',
        name: 'country',
        label: '国家/地区',
        placeholder: '选择国家/地区',
        range: 'countries',
        group: 'location'
      },
      {
        type: 'picker',
        name: 'province',
        label: '省份',
        placeholder: '选择省份',
        range: 'provinces',
        group: 'location'
      },
      {
        type: 'picker',
        name: 'city',
        label: '城市',
        placeholder: '选择城市',
        range: 'cities',
        group: 'location'
      },
      {
        type: 'picker',
        name: 'language',
        label: '语言',
        placeholder: '选择语言',
        range: 'languages',
        group: 'other'
      }
    ]
  },

  async onLoad() {
    this.setData({ loading: true });
    
    try {
      console.debug('开始加载编辑页面');
      const userInfo = await this._getUserInfo(true);
      
      if (userInfo) {
        // 确保头像不为空
        if (!userInfo.avatar) {
          userInfo.avatar = this.data.defaultAvatar;
        }
        
        this.setData({ 
          userInfo,
          loading: false 
        });
        
        // 初始化地区数据
        await this.initLocationData(userInfo);
        
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

  // 根据省份获取城市列表（模拟数据）
  async getCitiesByProvince(province) {
    const cityMap = {
      '北京': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'],
      '天津': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区'],
      '河北': ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水']
    };
    
    return cityMap[province] || [];
  },

  onAvatarError() {
    this.setData({ 'userInfo.avatar': this.data.defaultAvatar });
  },

  // 微信头像选择器回调
  async onChooseAvatar(e) {
    this.showLoading('更新中...');
    try {
      const { avatarUrl } = e.detail;
      if (!avatarUrl) return;
      
      const openid = this.getStorage('openid');
      if (!openid) {
        this.showToptips('用户未登录', 'error');
        return;
      }
      
      // 压缩图片
      let compressedImagePath = avatarUrl;
      try {
        const compressRes = await wx.compressImage({
          src: avatarUrl,
          quality: 80
        });
        if (compressRes?.tempFilePath) {
          compressedImagePath = compressRes.tempFilePath;
        }
      } catch (err) {
        // 压缩失败，使用原图，无需处理
      }
      
      // 上传头像
      const timestamp = Date.now();
      const cloudPath = `avatars/${openid}_${timestamp}.jpg`;
      
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: compressedImagePath
      });
      
      if (!uploadResult?.fileID) {
        throw new Error('上传失败');
      }
      
      // 更新用户头像
      const fileID = uploadResult.fileID;
      await this._updateUserProfile({ avatar: fileID });
      
      // 更新本地显示和存储
      this.setData({ 'userInfo.avatar': fileID });
      
      const userInfo = this.getStorage('userInfo');
      if (userInfo) {
        userInfo.avatar = fileID;
        this.setStorage('userInfo', userInfo);
      }
      
      this.setStorage('needRefreshProfile', true);
      this.showToptips('头像更新成功', 'success');
    } catch (err) {
      this.showToptips('头像更新失败', 'error');
    } finally {
      this.hideLoading();
    }
  },

  // 表单字段变更事件处理
  onFieldChange(e) {
    const { name, value } = e.detail;
    console.debug('字段变更:', name, value);
    
    this.setData({
      [`userInfo.${name}`]: value
    });
    
    // 特殊处理省份变更
    if (name === 'province') {
      this.handleProvinceChange(value);
    }
  },
  
  // 处理省份变更时，更新城市列表
  async handleProvinceChange(province) {
    const cities = await this.getCitiesByProvince(province);
    
    this.setData({
      cities,
      'userInfo.city': ''
    });
    
    // 获取表单面板组件，清空city字段
    const formPanel = this.selectComponent('#profileForm');
    if (formPanel) {
      this.setData({
        [`formData.city`]: ''
      });
    }
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
      const fields = [
        'nickname', 'bio', 'wechatId', 'qqId',
        'country', 'province', 'city', 'language'
      ];
      
      fields.forEach(field => {
        formData[field] = this.data.userInfo[field] || '';
      });
    }

    // 设置表单数据
    formPanel.setData({
      formData
    });
  },

  // 表单提交
  onFormSubmit(e) {
    console.debug('表单提交，数据:', e.detail);
    this.saveChanges(e.detail);
  },

  async saveChanges(formData) {
    if (this.data.formSubmitting) return;
    
    try {
      this.setData({ formSubmitting: true });
      this.showLoading('保存中...');

      // 创建更新数据对象
      const updateData = {};
      const fields = [
        'nickname', 'bio', 'wechatId', 'qqId',
        'country', 'province', 'city', 'language'
      ];
      
      fields.forEach(field => {
        if (formData[field] !== undefined) {
          updateData[field] = formData[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        this.showToptips('无数据需要更新', 'info');
        return;
      }
      
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

  showToptips(msg, type = 'info') {
    this.setData({
      toptipsShow: true,
      toptipsMsg: msg,
      toptipsType: type
    });
    
    setTimeout(() => {
      this.setData({ toptipsShow: false });
    }, 3000);
  },

  // 初始化地区数据
  async initLocationData(userInfo) {
    const cities = userInfo.province ? 
      await this.getCitiesByProvince(userInfo.province) : [];
      
    this.setData({
      cities
    });
  }
});