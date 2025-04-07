Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    // 数据源列表
    sources: {
      type: Array,
      value: [],
      observer: function(newVal) {
        if (newVal && newVal.length > 0) {
          this.processSourceItems(newVal);
        } else {
          this.setData({
            processedSources: []
          });
        }
      }
    },
    // 是否展示排名
    showRank: {
      type: Boolean,
      value: true
    },
    // 是否展示阅读数和点赞
    showStats: {
      type: Boolean,
      value: true
    },
    // 是否展示官方标签
    showOfficial: {
      type: Boolean,
      value: true
    },
    // 是否展示来源和时间
    showSource: {
      type: Boolean,
      value: true
    },
    // 点击项目的加载状态
    loadingItemId: {
      type: String,
      value: ''
    },
    loading: {
      type: Boolean,
      value: false
    },
    emptyTip: {
      type: String,
      value: '暂无数据'
    }
  },

  data: {
    // 处理后的数据源列表
    processedSources: []
  },

  lifetimes: {
    attached: function() {
      // 组件初始化时，处理一次数据
      if (Array.isArray(this.properties.sources)) {
        this.processSourceItems(this.properties.sources);
      }
    }
  },

  methods: {
    // 处理数据源列表中的每一项，添加缺失值，转换格式
    processSourceItems: function(sources) {
      if (!sources || !Array.isArray(sources)) {
        return;
      }
      
      const processedItems = sources.map((item, index) => {
        // 处理平台信息
        const platformInfo = this.getPlatformInfo(item);
        
        // 处理时间显示
        const displayTime = this.formatTime(item.publish_time || item.create_time);
        
        // 处理相关度
        const relevanceDisplay = this.formatRelevance(item.relevance);
        
        // 处理阅读数
        const views = this.formatNumber(item.views || item.read_count);
        
        // 处理点赞数
        const likes = this.formatNumber(item.likes || item.like_count);
        
        return {
          ...item,
          title: item.title || '无标题',
          summary: item.summary || (item.content ? this.truncateText(item.content, 100) : ''),
          author: item.author || '',
          displayTime: displayTime,
          relevanceDisplay: relevanceDisplay,
          platformIcon: platformInfo.icon,
          platformName: platformInfo.name,
          is_official: !!item.is_official,
          views: views,
          likes: likes
        };
      });
      
      this.setData({
        processedSources: processedItems
      });
    },
    
    // 截断文本
    truncateText(text, maxLength) {
      if (!text || typeof text !== 'string') {
        return '';
      }
      
      if (text.length <= maxLength) {
        return text;
      }
      
      return text.substring(0, maxLength) + '...';
    },
    
    // 格式化数字（大于1000显示为1k+）
    formatNumber(num) {
      if (num === undefined || num === null) {
        return '';
      }
      
      const numValue = parseInt(num);
      if (isNaN(numValue)) {
        return '';
      }
      
      if (numValue >= 10000) {
        return (numValue / 10000).toFixed(1) + 'w';
      } else if (numValue >= 1000) {
        return (numValue / 1000).toFixed(1) + 'k';
      }
      
      return numValue.toString();
    },
    
    // 获取平台图标和名称
    getPlatformInfo(item) {
      let icon = 'website';
      let name = '网页';
      
      if (!item || !item.platform) {
        return { icon, name };
      }
      
      const platform = item.platform.toLowerCase();
      
      if (platform.includes('wechat') || platform.includes('weixin') || platform === 'wechat' || platform === 'weixin') {
        icon = 'wechat';
        name = '微信';
      } else if (platform.includes('wxapp') || platform.includes('miniprogram') || platform === 'wxapp' || platform === 'miniprogram') {
        icon = 'wechat';
        name = '小程序';
      } else if (platform.includes('web') || platform.includes('website') || platform === 'web' || platform === 'website') {
        icon = 'website';
        name = '网页';
      } else if (platform.includes('douyin') || platform === 'douyin') {
        icon = 'douyin';
        name = '抖音';
      } else if (platform.includes('app') || platform === 'app') {
        icon = 'app';
        name = '应用';
      } else if (platform.includes('blog') || platform === 'blog') {
        icon = 'blog';
        name = '博客';
      } else if (platform.includes('forum') || platform === 'forum') {
        icon = 'forum';
        name = '论坛';
      } else if (item.source_name) {
        name = item.source_name;
      }
      
      return { icon, name };
    },
    
    // 点击整个项目
    onItemTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.processedSources[index];
      
      this.triggerEvent('itemtap', {
        item: item,
        index: index
      });
    },
    
    // 点击标题
    onTitleTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.processedSources[index];
      
      this.triggerEvent('titletap', {
        item: item,
        index: index
      });
      
      return false; // 阻止冒泡
    },
    
    // 点击来源图标
    onSourceIconTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.processedSources[index];
      
      this.triggerEvent('sourcetap', {
        item: item,
        index: index
      });
      
      return false; // 阻止冒泡
    },
    
    // 格式化相关度
    formatRelevance(relevance) {
      if (relevance === undefined || relevance === null) {
        return '';
      }
      
      // 如果是字符串，尝试提取数字部分
      if (typeof relevance === 'string') {
        // 如果包含 % 符号，截取前面的数字
        if (relevance.includes('%')) {
          const numStr = relevance.replace('%', '').trim();
          return numStr + '%';
        }
        
        // 尝试将字符串解析为数字
        const numValue = parseFloat(relevance);
        if (!isNaN(numValue)) {
          // 如果数字大于1，假设它是百分比值
          if (numValue > 1) {
            return Math.round(numValue) + '%';
          } else {
            // 否则假设它是0-1之间的小数
            return Math.round(numValue * 100) + '%';
          }
        }
        
        return relevance; // 返回原始字符串
      }
      
      // 如果是数字类型
      if (typeof relevance === 'number') {
        // 如果大于1，假设它已经是百分比
        if (relevance > 1) {
          return Math.round(relevance) + '%';
        } else {
          // 否则假设它是0-1之间的小数
          return Math.round(relevance * 100) + '%';
        }
      }
      
      return ''; // 对于其他情况返回空字符串
    },
    
    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) {
        return '';
      }
      
      try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) {
          return '';
        }
        
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 30) {
          // 超过30天显示日期
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else if (days > 0) {
          return `${days}天前`;
        } else if (hours > 0) {
          return `${hours}小时前`;
        } else if (minutes > 0) {
          return `${minutes}分钟前`;
        } else {
          return '刚刚';
        }
      } catch (e) {
        console.error('时间格式化错误:', e, timeStr);
        return '';
      }
    },
    
    // 格式化相对时间
    formatRelativeTime(dateStr) {
      return this.formatTime(dateStr);
    }
  }
}) 