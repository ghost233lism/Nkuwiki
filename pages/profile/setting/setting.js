const { storage, ui } = require('../../../utils/util');
const baseBehavior = require('../../../behaviors/baseBehavior');
const userBehavior = require('../../../behaviors/userBehavior');

// 配置项存储键名前缀
const STORAGE_PREFIX = 'setting_';

Page({
  behaviors: [baseBehavior, userBehavior],

  data: {
    settings: [
      {
        type: 'selector',
        id: 'theme',
        title: '主题设置',
        options: ['浅色', '深色', '跟随系统'],
        value: 0
      },
      {
        type: 'switch',
        id: 'notification',
        title: '消息通知',
        value: true
      },
      {
        type: 'action',
        id: 'cache',
        title: '清除缓存',
        buttonText: '立即清理'
      },
      {
        type: 'selector',
        id: 'fontsize',
        title: '正文字号',
        options: ['小', '中', '大'],
        value: 1
      },
      {
        type: 'switch',
        id: 'debug',
        title: '调试模式',
        value: false,
        hidden: true
      }
    ],
    loading: false,
    error: null
  },

  onLoad() {
    this.loadSettings();
  },

  // 加载设置
  async loadSettings() {
    try {
      this.setData({ loading: true, error: null });
      
      const settings = await Promise.all(
        this.data.settings.map(async item => ({
          ...item,
          value: storage.getSync(STORAGE_PREFIX + item.id) ?? item.value
        }))
      );

      // 新增过滤后数据
      const filteredSettings = settings.filter(item => !item.hidden);

      this.setData({ 
        settings,
        filteredSettings, // 新增过滤后的设置项
        loading: false 
      });
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  // 处理设置变更
  handleSettingChange(e) {
    const { id, value } = e.detail;
    const index = this.data.settings.findIndex(item => item.id === id);
    
    if (index === -1) return;

    this.updateSetting(index, value);
  },

  // 更新设置
  updateSetting(index, value) {
    const { id } = this.data.settings[index];
    storage.set(STORAGE_PREFIX + id, value);
    
    this.setData({
      [`settings[${index}].value`]: value
    });

    ui.showToptips('设置已保存', 'success');
    
    // 特殊处理清除缓存
    if (id === 'cache') {
      this.clearCache();
    }
  },

  // 清除缓存
  clearCache() {
    try {
      const preservedData = {
        userInfo: storage.getSync('userInfo'),
        openid: storage.getSync('openid'),
        isLoggedIn: storage.getSync('isLoggedIn')
      };

      storage.clearSync();

      // 恢复必要数据
      Object.entries(preservedData).forEach(([key, value]) => {
        if (value) storage.set(key, value);
      });

      ui.showToptips('缓存已清除', 'success');
      this.loadSettings();
    } catch (err) {
      ui.showToptips('清除缓存失败', 'error');
    }
  },

  // 重试加载
  onRetry() {
    this.loadSettings();
  }
}); 