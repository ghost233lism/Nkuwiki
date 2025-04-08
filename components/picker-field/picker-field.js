/**
 * 选择器字段组件
 */
Component({
  options: {
    styleIsolation: 'isolated'
  },
  
  properties: {
    // 字段标签
    label: {
      type: String,
      value: ''
    },
    // 当前选中的值
    value: {
      type: String,
      value: ''
    },
    // 选项数组
    options: {
      type: Array,
      value: []
    },
    // 占位文本
    placeholder: {
      type: String,
      value: '请选择'
    },
    // 字段名称
    name: {
      type: String,
      value: ''
    },
    currentIndex: {
      type: Number,
      value: -1
    }
  },
  
  data: {
    showPopup: false,
    selectedIndex: -1,
    // 城市数据
    cityMap: {
      '中国': ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'],
      '美国': ['纽约', '洛杉矶', '芝加哥', '休斯顿', '旧金山', '西雅图', '波士顿'],
      '日本': ['东京', '大阪', '京都', '札幌', '福冈', '神户', '横滨'],
      '韩国': ['首尔', '釜山', '仁川', '大邱', '光州', '大田'],
      '英国': ['伦敦', '曼彻斯特', '利物浦', '伯明翰', '爱丁堡', '格拉斯哥'],
      '法国': ['巴黎', '马赛', '里昂', '波尔多', '尼斯', '斯特拉斯堡'],
      '德国': ['柏林', '慕尼黑', '汉堡', '法兰克福', '科隆', '斯图加特'],
      '澳大利亚': ['悉尼', '墨尔本', '布里斯班', '珀斯', '阿德莱德', '堪培拉'],
      '加拿大': ['多伦多', '温哥华', '蒙特利尔', '渥太华', '卡尔加里', '魁北克']
    },
    currentCountry: '',
    cities: [],
    selectedCity: ''
  },
  
  observers: {
    'value': function(value) {
      if (value) {
        // 解析 'country - city' 格式的值
        const [country, city] = value.split(' - ');
        const index = this.data.options.indexOf(country);
        
        console.debug('解析location值:', value, '解析结果:', {country, city, index});
        
        this.setData({ 
          currentIndex: index >= 0 ? index : -1,
          currentCountry: country || '',
          cities: country ? this.data.cityMap[country] || [] : [],
          selectedCity: city || ''
        });
      }
    }
  },
  
  methods: {
    // 显示picker
    showPicker() {
      this.setData({
        showPopup: true,
        selectedIndex: this.data.currentIndex,
        cities: this.data.currentCountry ? this.data.cityMap[this.data.currentCountry] : []
      });
    },

    // 隐藏picker
    hidePicker() {
      this.setData({
        showPopup: false
      });
    },

    // 点击国家选项
    onOptionTap(e) {
      const index = e.currentTarget.dataset.index;
      const country = this.data.options[index];
      this.setData({
        selectedIndex: index,
        cities: this.data.cityMap[country] || [],
        selectedCity: ''  // 重置已选城市
      });
    },

    // 点击城市选项
    onCityTap(e) {
      const city = e.currentTarget.dataset.city;
      this.setData({
        selectedCity: city
      });
    },

    // 确认选择
    onConfirm() {
      const { selectedIndex, options, selectedCity, name } = this.data;
      if (selectedIndex !== -1) {
        const country = options[selectedIndex];
        const value = selectedCity ? `${country} - ${selectedCity}` : country;
        this.setData({
          currentIndex: selectedIndex,
          value: value,
          currentCountry: country
        });
        this.triggerEvent('change', {
          name: this.properties.name,
          value: value,
          country: country,
          city: selectedCity,
          index: selectedIndex
        });
      }
      this.hidePicker();
    }
  }
}); 