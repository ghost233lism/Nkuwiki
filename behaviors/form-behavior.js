/**
 * 表单行为 - 处理表单验证、提交等通用逻辑
 */
const { ui, ToastType } = require('../utils/util');
const baseBehavior = require('./base-behavior');

// 验证规则
const ValidationRules = {
  // 必填项
  required: (value, message = '此项不能为空') => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return '';
  },
  
  // 最小长度
  minLength: (value, length, message = `长度不能少于${length}个字符`) => {
    if (!value || value.length < length) {
      return message;
    }
    return '';
  },
  
  // 最大长度
  maxLength: (value, length, message = `长度不能超过${length}个字符`) => {
    if (value && value.length > length) {
      return message;
    }
    return '';
  },
  
  // 长度范围
  length: (value, [min, max], message = `长度应在${min}~${max}个字符之间`) => {
    if (!value || value.length < min || value.length > max) {
      return message;
    }
    return '';
  },
  
  // 正则匹配
  pattern: (value, pattern, message = '格式不正确') => {
    if (!value || !pattern.test(value)) {
      return message;
    }
    return '';
  },
  
  // 手机号
  phone: (value, message = '请输入正确的手机号') => {
    const phonePattern = /^1[3-9]\d{9}$/;
    return ValidationRules.pattern(value, phonePattern, message);
  },
  
  // 电子邮箱
  email: (value, message = '请输入正确的邮箱地址') => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return ValidationRules.pattern(value, emailPattern, message);
  },
  
  // 数字类型
  number: (value, message = '请输入有效的数字') => {
    if (value === null || value === undefined || value === '') return '';
    return isNaN(Number(value)) ? message : '';
  },
  
  // 最小值
  min: (value, min, message = `不能小于${min}`) => {
    if (value === null || value === undefined || value === '') return '';
    return Number(value) < min ? message : '';
  },
  
  // 最大值
  max: (value, max, message = `不能大于${max}`) => {
    if (value === null || value === undefined || value === '') return '';
    return Number(value) > max ? message : '';
  }
};

module.exports = Behavior({
  behaviors: [baseBehavior],
  
  data: {
    form: {},
    formErrors: {},
    formSubmitting: false
  },
  
  methods: {
    // 初始化表单数据
    initForm(initialData = {}) {
      this.setData({
        form: { ...initialData },
        formErrors: {}
      });
    },
    
    // 获取表单数据
    getFormData() {
      return this.data.form;
    },
    
    // 设置表单字段值
    setFormField(field, value) {
      const updateData = {};
      updateData[`form.${field}`] = value;
      updateData[`formErrors.${field}`] = '';
      this.setData(updateData);
    },
    
    // 处理表单输入改变事件
    onFormInput(e) {
      const { field } = e.currentTarget.dataset;
      const value = e.detail.value;
      this.setFormField(field, value);
    },
    
    // 处理开关切换事件
    onSwitchChange(e) {
      const { field } = e.currentTarget.dataset;
      const value = e.detail.value;
      this.setFormField(field, value);
    },
    
    // 处理单选框组变更
    onRadioChange(e) {
      const { field } = e.currentTarget.dataset;
      const value = e.detail.value;
      this.setFormField(field, value);
    },
    
    // 处理多选框组变更
    onCheckboxChange(e) {
      const { field } = e.currentTarget.dataset;
      const values = e.detail.value;
      this.setFormField(field, values);
    },
    
    // 处理选择器变更
    onPickerChange(e) {
      const { field, options } = e.currentTarget.dataset;
      const index = parseInt(e.detail.value);
      
      if (options && Array.isArray(options)) {
        // 如果提供了选项数组，使用索引获取实际值
        const value = options[index];
        this.setFormField(field, value);
      } else {
        // 直接使用索引值
        this.setFormField(field, index);
      }
    },
    
    // 重置表单
    resetForm() {
      this.setData({
        form: {},
        formErrors: {}
      });
    },
    
    // 验证表单
    validateForm(rules = {}) {
      let isValid = true;
      const errors = {};
      
      // 遍历验证规则
      for (const [field, fieldRules] of Object.entries(rules)) {
        if (!Array.isArray(fieldRules)) continue;
        
        // 获取字段值(支持嵌套对象path如user.name)
        const fieldPath = field.split('.');
        let value = this.data.form;
        for (const part of fieldPath) {
          value = value?.[part];
        }
        
        // 对每个字段应用规则
        for (const rule of fieldRules) {
          let error = '';
          
          if (typeof rule === 'function') {
            // 自定义验证函数
            error = rule(value, this.data.form);
          } else if (rule.rule === 'required') {
            error = ValidationRules.required(value, rule.message);
          } else if (rule.rule === 'minLength') {
            error = ValidationRules.minLength(value, rule.length, rule.message);
          } else if (rule.rule === 'maxLength') {
            error = ValidationRules.maxLength(value, rule.length, rule.message);
          } else if (rule.rule === 'length') {
            error = ValidationRules.length(value, rule.range, rule.message);
          } else if (rule.rule === 'pattern') {
            error = ValidationRules.pattern(value, rule.pattern, rule.message);
          } else if (rule.rule === 'phone') {
            error = ValidationRules.phone(value, rule.message);
          } else if (rule.rule === 'email') {
            error = ValidationRules.email(value, rule.message);
          } else if (rule.rule === 'number') {
            error = ValidationRules.number(value, rule.message);
          } else if (rule.rule === 'min') {
            error = ValidationRules.min(value, rule.min, rule.message);
          } else if (rule.rule === 'max') {
            error = ValidationRules.max(value, rule.max, rule.message);
          }
          
          if (error) {
            errors[field] = error;
            isValid = false;
            break;
          }
        }
      }
      
      this.setData({ formErrors: errors });
      return isValid;
    },
    
    // 显示表单验证错误
    showFormError() {
      const errors = this.data.formErrors;
      const errorFields = Object.keys(errors);
      
      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0];
        const errorMessage = errors[firstErrorField];
        ui.showToast(errorMessage, { type: ToastType.ERROR });
      }
    },
    
    // 提交表单（包含验证）
    async submitFormWithValidation(rules, submitCallback) {
      if (this.data.formSubmitting) return null;
      
      // 验证表单
      const isValid = this.validateForm(rules);
      
      if (!isValid) {
        this.showFormError();
        return null;
      }
      
      this.setData({ formSubmitting: true });
      
      try {
        // 调用提交回调
        const result = await submitCallback(this.data.form);
        return result;
      } catch (err) {
        console.debug('表单提交失败:', err);
        ui.showToast(err.message || '提交失败', { type: ToastType.ERROR });
        return null;
      } finally {
        this.setData({ formSubmitting: false });
      }
    }
  }
}); 