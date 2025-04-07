Component({
  properties: {
    // 数据源列表
    sources: {
      type: Array,
      value: []
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
    }
  },

  data: {
    // 内部数据
  },

  methods: {
    // 点击整个项目
    onItemTap(e) {
      const { index } = e.currentTarget.dataset;
      const item = this.data.sources[index];
      this.triggerEvent('itemtap', { item, index });
    },
    
    // 点击标题
    onTitleTap(e) {
      const { index } = e.currentTarget.dataset;
      const item = this.data.sources[index];
      this.triggerEvent('titletap', { item, index });
    },
    
    // 点击来源图标
    onSourceIconTap(e) {
      const { index } = e.currentTarget.dataset;
      const item = this.data.sources[index];
      this.triggerEvent('sourceicontap', { item, index });
    },
    
    // 格式化相对时间
    formatRelativeTime(dateStr) {
      if (!dateStr) return '';
      
      try {
        const { formatRelativeTime } = require('../../utils/util');
        return formatRelativeTime(dateStr);
      } catch (err) {
        console.debug('格式化相对时间失败:', err);
        return dateStr;
      }
    },
    
    // 获取来源平台名称
    getPlatformName(platform) {
      const platformMap = {
        'wxapp': '小程序',
        'wechat': '公众号',
        'website': '网站',
        'market': '校园集市',
        'forum': '论坛',
        'blog': '博客'
      };
      
      return platformMap[platform] || platform || '南开维基';
    }
  }
}) 