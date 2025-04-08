// webview.js
const baseBehavior = require('../../behaviors/baseBehavior');

Page({
  behaviors: [baseBehavior],
  
  data: {
    url: '',
    title: '网页',
    loading: true,
    error: false,
    errorMsg: '',
    navButtons: [
      {
        type: 'back',
        text: '返回'
      }
    ]
  },

  onLoad(options) {
    if (options.url) {
      const url = decodeURIComponent(options.url);
      const title = options.title ? decodeURIComponent(options.title) : '网页';
      
      console.debug('加载webview页面:', url);
      
      this.setData({
        url,
        title,
        loading: true,
        error: false
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: title
      });
    } else {
      this.setData({
        error: true,
        errorMsg: '无效链接',
        loading: false
      });
      
      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // webview加载完成
  onWebviewLoad() {
    this.setData({ loading: false });
  },
  
  // webview加载出错
  onWebviewError(e) {
    console.error('webview加载错误:', e.detail);
    this.setData({ 
      loading: false,
      error: true,
      errorMsg: '页面加载失败'
    });
  },
  
  // 重试加载
  onRetry() {
    if (!this.data.url) return;
    
    this.setData({
      loading: true,
      error: false
    });
  }
}); 