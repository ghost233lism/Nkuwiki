/**
 * 选择器字段组件
 */
Component({
  options: {
    styleIsolation: 'isolated'
  },
  
  properties: {
    // 选择器类型
    mode: {
      type: String,
      value: 'selector' // selector, multiSelector, time, date, region
    },
    // 默认选中项索引
    value: {
      type: Number,
      value: 0
    },
    // 对于多列选择器，默认选中项索引数组
    multiValue: {
      type: Array,
      value: []
    },
    // 选择器数据源
    range: {
      type: Array,
      value: []
    },
    // 多列选择器数据源
    multiRange: {
      type: Array,
      value: []
    },
    // 选定值在数据源中的键名
    rangeKey: {
      type: String,
      value: ''
    },
    // 占位文本
    placeholder: {
      type: String,
      value: '请选择'
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 开始日期或时间
    start: {
      type: String,
      value: ''
    },
    // 结束日期或时间
    end: {
      type: String,
      value: ''
    },
    // 自定义图标
    icon: {
      type: String,
      value: 'arrow-down'
    },
    // 自定义字段标签
    label: {
      type: String,
      value: ''
    },
    // 是否必填
    required: {
      type: Boolean,
      value: false
    },
    // 显示的数据格式
    fields: {
      type: String,
      value: 'day' // year, month, day
    }
  },
  
  data: {
    // 显示的选择值
    displayValue: ''
  },
  
  observers: {
    'mode, value, multiValue, range, multiRange, rangeKey': function() {
      this.updateDisplayValue();
    }
  },
  
  lifetimes: {
    attached() {
      this.updateDisplayValue();
    }
  },
  
  methods: {
    // 更新显示值
    updateDisplayValue() {
      const { mode, value, multiValue, range, multiRange, rangeKey } = this.properties;
      let displayValue = '';
      
      if (range.length === 0 && mode === 'selector') {
        this.setData({ displayValue: '' });
        return;
      }
      
      switch (mode) {
        case 'selector':
          if (range[value]) {
            if (rangeKey && typeof range[value] === 'object') {
              displayValue = range[value][rangeKey] || '';
            } else {
              displayValue = range[value] || '';
            }
          }
          break;
          
        case 'multiSelector':
          if (multiValue.length > 0 && multiRange.length > 0) {
            displayValue = multiValue.map((v, i) => {
              const columnItems = multiRange[i] || [];
              const item = columnItems[v];
              if (rangeKey && typeof item === 'object') {
                return item[rangeKey] || '';
              } 
              return item || '';
            }).join(' ');
          }
          break;
          
        case 'time':
        case 'date':
        case 'region':
          displayValue = value || '';
          break;
      }
      
      this.setData({ displayValue });
    },
    
    // 选择事件
    onPickerChange(e) {
      const { value } = e.detail;
      
      if (this.properties.mode === 'selector') {
        this.setData({ value });
      } else {
        this.setData({ multiValue: value });
      }
      
      this.updateDisplayValue();
      this.triggerEvent('change', e.detail);
    },
    
    // 列选择事件（多列选择器）
    onColumnChange(e) {
      this.triggerEvent('columnchange', e.detail);
    },
    
    // 取消事件
    onPickerCancel() {
      this.triggerEvent('cancel');
    }
  }
}); 