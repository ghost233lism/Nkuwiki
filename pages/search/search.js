Page({
  data: {
    searchText: '', // 搜索文本
    searchResult: null, // 搜索结果
    sources: [], // 引用来源
  },

  // 处理搜索事件
  handleSearch() {
    const { searchText } = this.data;
    if (!searchText.trim()) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    // 发送搜索请求
    wx.request({
      url: 'http://113.44.175.112/agent/chat',
      method: 'POST',
      data: {
        query: searchText,
        history: [] // 暂不使用历史记录
      },
      success: (res) => {
        this.setData({
          searchResult: res.data.response,
          sources: res.data.sources
        });
      },
      fail: (err) => {
        wx.showToast({
          title: '搜索失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  onLoad: function() {
    // 页面加载时的初始化逻辑
  }
}) 