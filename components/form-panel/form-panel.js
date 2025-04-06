const baseBehavior = require('../../behaviors/baseBehavior');

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'apply-shared',
    pureDataPattern: /^_/,
    addGlobalClass: true,
  },
  
  behaviors: [baseBehavior],
  
  properties: {
    title: String,
    fields: {
      type: Array,
      value: []
    },
    submitText: {
      type: String,
      value: '提交'
    }
  },
  
  data: {
    formData: {},
    _initialized: false
  },
  
  observers: {
    'fields': function(fields) {
      if (fields?.length && !this.data._initialized) {
        this.initFormData(fields)
      }
    }
  },
  
  methods: {
    initFormData(fields) {
      const formData = fields.reduce((acc, field) => {
        acc[field.name] = field.value ?? ''
        return acc
      }, {})
      
      this.setData({ 
        formData,
        _initialized: true 
      })
    },

    handleFieldChange(e) {
      console.debug('表单字段变更:', e);
      
      // 获取字段名和值
      let name, value;
      
      // 支持不同类型的事件
      if (e.type === 'input') {
        // input-field的input事件
        name = e.currentTarget.dataset.name;
        value = e.detail.value;
      } else {
        // 其他组件的change事件
        name = e.detail.name;
        value = e.detail.value;
      }
      
      if (!name) {
        name = e.currentTarget.dataset.name;
      }
      
      console.debug('字段变更:', name, value);
      
      // 更新formData
      this.setData({
        [`formData.${name}`]: value
      });
      
      // 触发change事件
      this.triggerEvent('change', { name, value });
    },

    handleSubmit() {
      this.triggerEvent('submit', this.data.formData)
    },

    // 获取picker的range数据
    getPickerRange(field) {
      if (field.type === 'picker' && field.range) {
        // 从页面实例获取range数据
        const page = getCurrentPages().pop()
        return page.data[field.range] || []
      }
      return []
    }
  }
})