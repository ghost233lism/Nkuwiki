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
    fields: {
      type: Array,
      value: [],
      observer: function(newVal) {
        console.debug('属性fields变化:', newVal);
        if (newVal?.length) {
          if (!this.data._initialized) {
            this.initFormData(newVal);
          }
        }
      }
    },
    groups: {
      type: Array,
      value: [],
      observer: function(newVal) {
        console.debug('属性groups变化:', newVal);
      }
    },
    submitText: {
      type: String,
      value: '提交'
    },
    submitButtonWidth: {
      type: String,
      value: '80%'
    },
    submitButtonStyle: {
      type: String,
      value: ''
    },
    submitTextBackground: {
      type: String,
      value: '#f2f2f2'
    },
    ranges: {
      type: Object,
      value: {},
      observer: function(newVal) {
        console.debug('属性ranges变化:', newVal);
        if (newVal && this.data.fields?.length) {
          this.initPickerRanges(this.data.fields, newVal);
        }
      }
    }
  },
  
  data: {
    formData: {},
    _initialized: false,
    pickerRanges: {}
  },
  
  observers: {
    'fields': function(fields) {
      console.debug('组件字段数据变化:', fields);
      if (fields?.length) {
        if (!this.data._initialized) {
          this.initFormData(fields);
        }
        if (this.properties.ranges) {
          this.initPickerRanges(fields, this.properties.ranges);
        }
      }
    },
    'groups': function(groups) {
      console.debug('组件分组数据变化:', groups);
    }
  },
  
  lifetimes: {
    attached: function() {
      // console.debug('组件attached, 当前数据:', this.data);
      // if (this.data.fields?.length && !this.data._initialized) {
        // this.initFormData(this.data.fields);
      // }
    },
    ready: function() {
      console.debug('组件ready, 当前数据:', this.data);
    }
  },
  
  methods: {
    initFormData(fields) {
      console.debug('初始化表单数据:', fields);
      
      // 保留现有的表单数据
      const currentFormData = { ...this.data.formData };
      
      const formData = fields.reduce((acc, field) => {
        // 如果已经有值，则保留
        if (currentFormData[field.name] !== undefined) {
          acc[field.name] = currentFormData[field.name];
        } else {
          acc[field.name] = field.value ?? '';
        }
        return acc;
      }, {});
      
      console.debug('构建的表单数据:', formData);
      this.setData({ 
        formData,
        _initialized: true 
      });
    },

    // 初始化picker ranges
    initPickerRanges(fields, ranges) {
      const pickerFields = fields.filter(field => 
        field.type === 'picker' && field.range
      );

      const pickerRanges = {};
      pickerFields.forEach(field => {
        const range = ranges[field.range];
        if (Array.isArray(range)) {
          pickerRanges[field.name] = range;
        } else {
          pickerRanges[field.name] = [];
          console.warn(`Range data "${field.range}" for field "${field.name}" is not available`);
        }
      });

      this.setData({ pickerRanges });
    },

    handleFieldChange(e) {
      const { name, value } = e.detail;
      
      if (!name) {
        console.error('字段变更事件缺少name属性:', e.detail);
        return;
      }
      
      // 更新formData
      this.setData({
        [`formData.${name}`]: value
      });
      
      // 触发change事件
      this.triggerEvent('change', { name, value });
    },

    // 处理text-area组件输入事件
    handleTextAreaInput(e) {
      const { value } = e.detail;
      const name = e.currentTarget.dataset.name;
      
      if (!name) {
        console.error('text-area输入事件缺少name属性:', e);
        return;
      }
      
      // 更新formData
      this.setData({
        [`formData.${name}`]: value
      });
      
      // 触发change事件
      this.triggerEvent('change', { name, value });
    },

    handleSubmit() {
      console.debug('表单提交: 当前formData:', JSON.stringify(this.data.formData));
      this.triggerEvent('submit', this.data.formData)
    },

    // 获取picker的range数据
    getPickerRange(field) {
      return this.data.pickerRanges[field.name] || [];
    }
  }
})