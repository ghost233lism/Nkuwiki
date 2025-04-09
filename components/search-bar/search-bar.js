Component({
  properties: {
    value: {
      type: String,
      value: ''
    },
    placeholder: {
      type: String,
      value: '搜索'
    },
    focus: {
      type: Boolean,
      value: false
    },
    showAction: {
      type: Boolean,
      value: true
    },
    actionText: {
      type: String,
      value: '搜索'
    },
    backgroundColor: {
      type: String,
      value: '#f5f5f5'
    },
    navBarHeight: {
      type: Number,
      value: 45
    },
    options: {
      type: Array,
      value: []
    }
  },

  data: {
    inputValue: '',
    userInput: '', // 存储用户实际输入的内容（不含前缀）
    showSelector: false,
    selectorOptions: [],
    selectedOption: 0,
    atPosition: -1,
    hasSelected: false,
    selectedType: ''
  },

  lifetimes: {
    attached() {
      this.setData({
        inputValue: this.properties.value,
        selectorOptions: this.properties.options || []
      })
    }
  },

  observers: {
    'options': function(options) {
      if (options) {
        this.setData({
          selectorOptions: options
        });
      }
    }
  },

  methods: {
    onInput(e) {
      const value = e.detail.value;
      let newValue = value;
      
      // 已选择类型的情况下，需要保持前缀
      if (this.data.hasSelected && this.data.selectedType) {
        // 在输入内容前添加前缀
        newValue = `@${this.data.selectedType}${value}`;
      }
      
      this.setData({
        inputValue: newValue
      });
      
      // 已经选择了选项的情况
      if (this.data.hasSelected) {
        // 无需再次触发选项选择
        this.setData({
          showSelector: false,
          atPosition: -1
        });
        this.triggerEvent('input', { value: newValue });
        return;
      }
      
      // 检测@符号
      const lastAtIndex = newValue.lastIndexOf('@');
      if (lastAtIndex !== -1 && (lastAtIndex === 0 || newValue[lastAtIndex - 1] === ' ')) {
        // 获取@后面的内容
        const inputAfterAt = newValue.substring(lastAtIndex + 1).toLowerCase();
        
        // 查找匹配的选项
        let matchedIndex = 0;
        let exactMatch = false;
        
        if (inputAfterAt) {
          // 尝试按输入匹配选项
          for (let i = 0; i < this.data.selectorOptions.length; i++) {
            const option = this.data.selectorOptions[i];
            const typeStr = option.type.toLowerCase();
            const textStr = option.text.toLowerCase();
            const valueStr = (option.value || '').toLowerCase().replace('@', '');
            
            // 精确匹配完整的type
            if (typeStr === inputAfterAt) {
              matchedIndex = i;
              exactMatch = true;
              break;
            }
            // 精确匹配完整的value（不含@符号）
            else if (valueStr && valueStr === inputAfterAt) {
              matchedIndex = i;
              exactMatch = true;
              break;
            }
            // 优先匹配value开头
            else if (valueStr && valueStr.startsWith(inputAfterAt)) {
              matchedIndex = i;
              break;
            }
            // 其次匹配type开头
            else if (typeStr.startsWith(inputAfterAt)) {
              matchedIndex = i;
              break;
            }
            // 最后匹配text开头
            else if (textStr.startsWith(inputAfterAt)) {
              matchedIndex = i;
              break;
            }
          }
        }
        
        // 如果完全匹配，自动选择该选项
        if (exactMatch) {
          this.handleOptionSelected(matchedIndex);
          return;
        }
        
        // 显示选择框
        this.setData({
          showSelector: true,
          atPosition: lastAtIndex,
          hasSelected: false,
          selectedType: '',
          selectedOption: matchedIndex // 设置匹配的选项
        });
      } else {
        this.setData({
          showSelector: false,
          atPosition: -1
        });
      }
      
      this.triggerEvent('input', { value: newValue });
    },

    onClear() {
      // 重置所有状态
      this.setData({
        inputValue: '',
        userInput: '',
        showSelector: false,
        atPosition: -1,
        hasSelected: false,
        selectedType: '',
        focus: true
      });
      
      // 触发清除事件
      this.triggerEvent('clear');
      this.triggerEvent('input', { value: '' });
    },

    onFocus(e) {
      this.triggerEvent('focus', e.detail);
    },

    onBlur(e) {
      // 延迟隐藏选择框，以便能够点击选项
      setTimeout(() => {
        this.setData({
          showSelector: false
        });
      }, 200);
      this.triggerEvent('blur', e.detail);
    },

    onKeyboardHeightChange(e) {
      // 键盘高度变化，可以处理一些UI调整
      console.debug('键盘高度变化:', e.detail);
    },

    onConfirm(e) {
      // 如果选择框显示且有选中选项，则选择该选项
      if (this.data.showSelector && this.data.selectedOption >= 0) {
        this.handleOptionSelected(this.data.selectedOption);
      } else {
        this.triggerEvent('confirm', { value: this.data.inputValue });
      }
    },

    onAction() {
      this.triggerEvent('action', { value: this.data.inputValue });
    },
    
    // 选择选项
    onSelectOption(e) {
      const index = e.currentTarget.dataset.index;
      this.handleOptionSelected(index);
    },
    
    // 处理选项选择
    handleOptionSelected(index) {
      const option = this.data.selectorOptions[index];
      if (!option) return;
      
      const currentValue = this.data.inputValue;
      const atPosition = this.data.atPosition;
      
      // 使用选项的value值
      let newValue = '';
      if (atPosition !== -1) {
        // 替换@后的内容
        const beforeAt = currentValue.substring(0, atPosition);
        // 如果选项有value，使用它，否则只使用type
        if (option.value) {
          newValue = `${beforeAt}${option.value}`;
        } else {
          newValue = `${beforeAt}@${option.type}`;
        }
      } else {
        // 没有@符号的情况，直接使用value或构造一个
        newValue = option.value || `@${option.type}`;
      }
      
      // 触发选择事件
      this.triggerEvent('select', {
        option,
        value: newValue
      });
      
      // 同时触发输入变化事件
      this.triggerEvent('input', { value: newValue });
      
      // 清空用户输入内容，只保留前缀
      this.setData({
        inputValue: newValue,
        userInput: '', // 实际输入框中显示的内容
        showSelector: false,
        atPosition: -1,
        hasSelected: true,
        selectedType: option.type,
        focus: true
      });
    },

    // 处理带前缀的输入
    onInputWithPrefix(e) {
      // 用户输入的内容（不含前缀）
      const value = e.detail.value || '';
      // 构建完整的带前缀的值
      const prefixedValue = `@${this.data.selectedType}${value}`;
      
      console.debug('输入带前缀的内容:', value, '完整值:', prefixedValue);
      
      this.setData({
        inputValue: prefixedValue, // 完整值包含前缀
        userInput: value // 用户实际输入的部分
      });
      
      this.triggerEvent('input', { value: prefixedValue });
    }
  }
})