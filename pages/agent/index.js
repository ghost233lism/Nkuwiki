const app = getApp()
const config = app.globalData.config || {};
const API_BASE_URL = config.services?.app?.base_url || 'https://nkuwiki.com';
const towxml = require('../../wxcomponents/towxml/index');
const api = require('../../utils/api/index');

Page({
  data: {
    query: '', // 用户查询内容
    loading: false, // 是否正在加载中
    isStreaming: false, // 是否正在流式接收数据
    textContent: '', // 存储纯文本内容
    richTextContent: null, // 存储美化后的内容
    usePlainText: false, // 是否使用纯文本模式
    originalQuery: '', // 原始查询
    rewrittenQuery: '', // 改写后的查询
    sources: [], // 信息来源
    suggestedQuestions: [], // 建议问题
    enableTyper: true, // 是否启用打字机效果
    typerSpeed: 20, // 打字机速度
    requestTask: null, // 请求任务，用于取消请求
    retrievedCount: 0, // 检索到的结果数量
    responseTime: 0, // 响应时间
    tables: ["wxapp_post", "website_nku", "wechat_nku"], // 默认检索表
    maxResults: 5 // 每个表最大检索结果数
  },

  onLoad: function() {
    // 页面加载时初始化
    this.loadSettings();
  },

  // 加载用户设置
  loadSettings: function() {
    const settings = wx.getStorageSync('agentSettings') || {};
    this.setData({
      usePlainText: settings.usePlainText || false,
      enableTyper: settings.enableTyper !== false, // 默认开启
      typerSpeed: settings.typerSpeed || 20,
      tables: settings.tables || ["wxapp_post", "website_nku", "wechat_nku"],
      maxResults: settings.maxResults || 5
    });
  },

  // 保存用户设置
  saveSettings: function() {
    wx.setStorageSync('agentSettings', {
      usePlainText: this.data.usePlainText,
      enableTyper: this.data.enableTyper,
      typerSpeed: this.data.typerSpeed,
      tables: this.data.tables,
      maxResults: this.data.maxResults
    });
  },

  // 处理输入框变化
  onInputChange: function(e) {
    this.setData({
      query: e.detail.value
    });
  },

  // 清空结果
  clearResult: function() {
    this.setData({
      textContent: '',
      richTextContent: null,
      sources: [],
      suggestedQuestions: [],
      retrievedCount: 0,
      responseTime: 0
    });
  },

  // 复制结果内容
  copyResult: function() {
    const content = this.data.textContent;
    if (!content) {
      wx.showToast({
        title: '没有内容可复制',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 切换纯文本/富文本模式
  togglePlainTextMode: function() {
    this.setData({
      usePlainText: !this.data.usePlainText
    }, () => {
      // 保存设置
      this.saveSettings();
      
      // 显示提示
      wx.showToast({
        title: this.data.usePlainText ? '已切换到纯文本模式' : '已切换到富文本模式',
        icon: 'none'
      });
    });
  },

  // 处理建议问题点击
  handleSuggestedQuestion: function(e) {
    const question = e.currentTarget.dataset.question;
    if (question) {
      this.setData({
        query: question
      }, () => {
        this.handleSearch();
      });
    }
  },

  // 处理用户搜索请求
  handleSearch: function() {
    const { query, tables, maxResults } = this.data;
    
    if (!query.trim()) {
      wx.showToast({
        title: '请输入问题',
        icon: 'none'
      });
      return;
    }

    // 取消现有请求
    if (this.data.requestTask) {
      this.data.requestTask.abort();
    }

    // 重置数据
    this.setData({
      textContent: '',
      richTextContent: null,
      sources: [],
      suggestedQuestions: [],
      loading: true,
      isStreaming: true,
      originalQuery: query,
      rewrittenQuery: '',
      retrievedCount: 0,
      responseTime: 0
    });

    console.debug(`开始RAG查询: ${query}`);

    // 使用API进行RAG查询
    api.agent.rag({
      query: query,
      tables: tables,
      max_results: maxResults,
      stream: true, // 使用流式响应
      format: 'markdown',
      
      // 处理查询改写
      onQuery: (queryData) => {
        console.debug('查询已处理:', queryData);
        this.setData({
          originalQuery: queryData.original || query,
          rewrittenQuery: queryData.rewritten || query
        });
      },
      
      // 处理内容流
      onContent: (chunk) => {
        const currentContent = this.data.textContent + chunk;
        
        this.setData({
          textContent: currentContent,
          isStreaming: true
        });
        
        // 如果不是纯文本模式，更新富文本内容
        if (!this.data.usePlainText) {
          try {
            const result = towxml(currentContent, 'markdown', {
              theme: 'light',
              typer: {
                enable: this.data.enableTyper,
                speed: this.data.typerSpeed,
                delay: 100,
                showCursor: true,
                skippable: ['table', 'pre', 'code', 'image']
              }
            });
            
            this.setData({
              richTextContent: result
            });
          } catch (error) {
            console.error('处理Markdown内容失败:', error);
          }
        }
      },
      
      // 处理来源信息
      onSources: (sources) => {
        console.debug('接收到来源信息:', sources);
        this.setData({
          sources: sources,
          retrievedCount: sources.length
        });
      },
      
      // 处理建议问题
      onSuggestions: (questions) => {
        console.debug('接收到建议问题:', questions);
        this.setData({
          suggestedQuestions: questions
        });
      },
      
      // 处理完成事件
      onComplete: () => {
        console.debug('RAG查询已完成');
        this.setData({
          loading: false,
          isStreaming: false
        });
      },
      
      // 处理错误
      onError: (err) => {
        console.error('RAG查询失败:', err);
        this.setData({
          loading: false,
          isStreaming: false
        });
        
        wx.showToast({
          title: '查询失败：' + (err.message || '未知错误'),
          icon: 'none',
          duration: 2000
        });
      }
    }).then(res => {
      if (res.success) {
        console.debug('RAG请求已启动');
        this.setData({
          requestTask: res.requestTask
        });
      } else {
        // 处理非流式错误响应
        this.setData({
          loading: false,
          isStreaming: false
        });
        
        wx.showToast({
          title: res.message || '查询失败',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      console.error('发起RAG请求失败:', err);
      this.setData({
        loading: false,
        isStreaming: false
      });
      
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  // 检查来源URL并打开
  openSourceUrl: function(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    
    // 处理URL打开
    if (url.startsWith('http')) {
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(url)}`
      });
    } else if (url.includes('post_id=')) {
      // 帖子链接处理
      const postId = url.match(/post_id=([^&]+)/)?.[1];
      if (postId) {
        wx.navigateTo({
          url: `/pages/post/detail?id=${postId}`
        });
      }
    }
  },

  // 页面分享
  onShareAppMessage: function() {
    return {
      title: '南开知识助手 - ' + (this.data.query || '智能问答'),
      path: '/pages/agent/index',
      imageUrl: '/assets/images/share-agent.jpg'
    };
  }
}); 