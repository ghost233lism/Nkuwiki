const app = getApp()
const config = app.globalData.config || {};
const API_BASE_URL = config.services?.app?.base_url || 'https://nkuwiki.com';
const towxml = require('../../wxcomponents/towxml/index');

// 简单的Markdown解析函数
function parseMarkdown(markdown) {
  if (!markdown) return '';
  
  // 替换标题
  let html = markdown
    // 标题
    .replace(/### (.*?)\n/g, '<h3>$1</h3>')
    .replace(/## (.*?)\n/g, '<h2>$1</h2>')
    .replace(/# (.*?)\n/g, '<h1>$1</h1>')
    
    // 加粗和斜体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // 处理链接和图片，提升优先级
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<navigator url="/pages/webview/webview?url=$2" class="md-link">$1</navigator>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<navigator url="/pages/webview/webview?url=$2" class="md-link">$1</navigator>')
    
    // 处理数字编号列表，改进匹配方式
    .replace(/^(\d+)[.、：:]\s*(.*?)$/gm, '<view class="md-li"><text class="md-li-num">$1.</text> $2</view>')
    
    // 无序列表
    .replace(/^\s*[-*+•]\s+(.*?)$/gm, '<view class="md-li">• $1</view>')
    
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<view class="md-code">$1</view>')
    
    // 行内代码
    .replace(/`(.*?)`/g, '<text class="md-inline-code">$1</text>')
    
    // 引用
    .replace(/^\>\s+(.*?)$/gm, '<view class="md-quote">$1</view>')
    
    // 分隔线
    .replace(/^---$/gm, '<view class="md-hr"></view>')
    
    // 段落
    .replace(/\n\n/g, '</view><view class="md-p">');
  
  // 确保段落包裹
  html = '<view class="md-p">' + html + '</view>';
  
  return html;
}

Page({
  data: {
    searchValue: '',
    searchHistory: [],
    searchResults: [],
    markdownHtml: '',
    loading: false,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    baseUrl: app.globalData.config.services.app.base_url,
    isStreaming: false,
    typingText: '',
    fullResponse: '',
    sources: [],
    // 记录所有会话
    chatHistory: [],
    _lastMarkdown: '',
    _lastMarkdownHtml: '',
    usePlainText: false,  // 是否使用纯文本模式（不使用富文本渲染）
    textContent: '',  // 存储纯文本内容
    richTextContent: null  // 存储美化后的文本内容
  },

  // 简单高效的Markdown转HTML函数
  simpleMarkdownToHtml: function(markdown) {
    if (!markdown) return '<view class="md-p"></view>';
    
    // 预处理换行和空行
    let text = markdown.trim().replace(/\r\n/g, '\n');
    
    // 添加结束标记，以便于正则匹配
    text += '\n';
    
    // 识别数字编号列表
    text = text.replace(/^(\d+)[.、：:]\s*(.*?)$/gm, 
      '<view class="md-li"><text class="md-li-num">$1.</text> $2</view>');
    
    // 识别无序列表
    text = text.replace(/^\s*[-*+•]\s+(.*?)$/gm, 
      '<view class="md-li">• $1</view>');
    
    // 处理链接 [文本](链接)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, 
      '<navigator url="/pages/webview/webview?url=$2" class="md-link">$1</navigator>');
    
    // 处理标题 - 从h3到h1
    text = text.replace(/^### (.*?)$/gm, '<view class="md-h3">$1</view>');
    text = text.replace(/^## (.*?)$/gm, '<view class="md-h2">$1</view>');
    text = text.replace(/^# (.*?)$/gm, '<view class="md-h1">$1</view>');
    
    // 处理粗体和斜体
    text = text.replace(/\*\*(.*?)\*\*/g, '<text class="md-bold">$1</text>');
    text = text.replace(/\*(.*?)\*/g, '<text class="md-italic">$1</text>');
    
    // 处理单行代码
    text = text.replace(/`(.*?)`/g, '<text class="md-code-inline">$1</text>');
    
    // 处理代码块
    text = text.replace(/```([\s\S]*?)```/g, '<view class="md-code-block">$1</view>');
    
    // 处理引用
    text = text.replace(/^> (.*?)$/gm, '<view class="md-quote">$1</view>');
    
    // 处理分隔线
    text = text.replace(/^-{3,}$/gm, '<view class="md-hr"></view>');
    
    // 将剩余的文本行转换为段落
    const paragraphs = [];
    let currentP = '';
    
    text.split('\n').forEach(line => {
      if (line.trim() === '') {
        if (currentP) {
          paragraphs.push(`<view class="md-p">${currentP}</view>`);
          currentP = '';
        }
      } else if (!line.startsWith('<view') && !line.startsWith('<text') && !line.startsWith('<navigator')) {
        currentP += (currentP ? ' ' : '') + line;
      } else {
        if (currentP) {
          paragraphs.push(`<view class="md-p">${currentP}</view>`);
          currentP = '';
        }
        paragraphs.push(line);
      }
    });
    
    if (currentP) {
      paragraphs.push(`<view class="md-p">${currentP}</view>`);
    }
    
    return paragraphs.join('');
  },

  // 处理输入框变化
  onInputChange(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  // 切换纯文本模式
  togglePlainTextMode() {
    this.setData({
      usePlainText: !this.data.usePlainText
    }, () => {
      // 如果已有内容，重新渲染
      if (this.data.textContent) {
        if (this.data.usePlainText) {
          this.setData({
            richTextContent: null, // 清空富文本内容
            markdownHtml: '' // 清空markdown以便显示纯文本
          });
        } else {
          // 重新生成markdown并更新富文本
          const markdownHtml = this.simpleMarkdownToHtml(this.data.textContent);
          this.setData({
            markdownHtml: markdownHtml
          });
          // 同时更新富文本渲染
          this.formatRichTextContent(this.data.textContent);
        }
      }
      
      // 提示用户
      wx.showToast({
        title: this.data.usePlainText ? '已切换到纯文本模式' : '已切换到富文本模式',
        icon: 'none'
      });
    });
  },

  // 加载历史会话
  loadChatHistory: function() {
    const chatHistory = wx.getStorageSync('chatHistory') || [];
    this.setData({ chatHistory });
  },

  // 保存会话历史
  saveChatHistory: function(question, answer, sources = []) {
    const chatHistory = this.data.chatHistory;
    
    // 限制历史记录数量，保留最新50条
    if (chatHistory.length >= 50) {
      chatHistory.pop();
    }
    
    chatHistory.unshift({
      id: new Date().getTime(),
      question,
      answer,
      sources,
      timestamp: new Date().toISOString()
    });
    
    this.setData({ chatHistory });
    wx.setStorageSync('chatHistory', chatHistory);
  },

  // 处理搜索事件
  handleSearch() {
    const { searchValue } = this.data;
    if (!searchValue.trim()) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    this.setData({
      textContent: '',  // 清空之前的内容
      richTextContent: null, // 清空富文本内容
      loading: true,
      isStreaming: false // 不立即显示流式状态，避免出现"正在生成"
    });

    console.log(`开始搜索: ${searchValue}`);
    
    // 发起流式搜索请求
    this.startSimpleStream(searchValue);
  },

  // 实时美化文本内容，识别链接、Email等
  formatRichTextContent: function(text) {
    if (!text || this.data.usePlainText) return;
    
    try {
      // 增强链接识别的预处理
      let processedText = text.trim(); // 添加trim()去掉首尾空白
      
      // 先提取所有可能的链接，避免被分块打断
      const links = [];
      let linkId = 0;
      
      // 临时替换链接为占位符
      processedText = processedText.replace(/(\d+)[.、：:]\s*(.*?)[:：]\s*(https?:\/\/[^\s<]+)|(\d+)[.、：:]\s*(.*?)$|^(.*?)[:：]\s*(https?:\/\/[^\s<]+)$|(?<![(\[])(https?:\/\/[^\s<]+)(?![)\]])/gm, 
        (match, num, title, url1, num2, title2, title3, url2, url3) => {
          const placeholder = `__LINK_${linkId}__`;
          if (num && title && url1) {
            // 数字编号的链接: "1. 标题: https://..."
            links.push({
              type: 'numbered_url',
              num,
              title: title.trim(),
              url: url1
            });
          } else if (num2 && title2) {
            // 数字编号无链接: "1. 标题"
            links.push({
              type: 'numbered',
              num: num2,
              title: title2.trim()
            });
          } else if (title3 && url2) {
            // 标题: 链接格式 "标题: https://..."
            links.push({
              type: 'titled',
              title: title3.trim(),
              url: url2
            });
          } else if (url3) {
            // 单独的链接 "https://..."
            links.push({
              type: 'plain',
              url: url3
            });
          }
          linkId++;
          return placeholder;
        }
      );
      
      // 将链接还原为Markdown格式
      links.forEach((link, index) => {
        const placeholder = `__LINK_${index}__`;
        if (link.type === 'numbered_url') {
          processedText = processedText.replace(placeholder, 
            `${link.num}. [${link.title}](${link.url})`);
        } else if (link.type === 'numbered') {
          processedText = processedText.replace(placeholder, 
            `${link.num}. ${link.title}`);
        } else if (link.type === 'titled') {
          processedText = processedText.replace(placeholder, 
            `[${link.title}](${link.url})`);
        } else {
          processedText = processedText.replace(placeholder, 
            `[${link.url}](${link.url})`);
        }
      });
      
      // 使用 towxml 处理文本
      const result = towxml(processedText, 'markdown', {
        theme: 'light',
        audio: false,
        external_link: true,
        emoji: false,
        latex: false,
        highlight: false,
        events: {
          tap: (e) => {
            // 处理链接点击
            if (e.currentTarget.dataset.data && e.currentTarget.dataset.data.attr && e.currentTarget.dataset.data.attr.href) {
              const url = e.currentTarget.dataset.data.attr.href;
              if (url.startsWith('http')) {
                wx.showActionSheet({
                  itemList: ['复制链接', '在浏览器中打开'],
                  success: function(res) {
                    if (res.tapIndex === 0) {
                      wx.setClipboardData({
                        data: url,
                        success: function() {
                          wx.showToast({
                            title: '链接已复制',
                            icon: 'success'
                          });
                        }
                      });
                    } else if (res.tapIndex === 1) {
                      wx.navigateTo({
                        url: `/pages/webview/webview?url=${encodeURIComponent(url)}`,
                        fail: function() {
                          wx.setClipboardData({
                            data: url,
                            success: function() {
                              wx.showModal({
                                title: '链接已复制',
                                content: '链接已复制到剪贴板，您可以在浏览器中打开',
                                showCancel: false
                              });
                            }
                          });
                        }
                      });
                    }
                  }
                });
              }
            }
          }
        }
      });

      this.setData({
        richTextContent: result
      });
      
    } catch (error) {
      console.error('处理富文本失败:', error);
      this.setData({
        richTextContent: {
          child: [{
            type: 'text',
            text: text.trim() // 这里也添加trim()
          }]
        }
      });
    }
  },

  // 处理流式响应
  startSimpleStream: function(query) {
    const that = this;
    
    // 获取用户微信ID
    const userInfo = wx.getStorageSync('userInfo') || {};
    const openid = userInfo.openid || wx.getStorageSync('openid');
    
    // 构建请求数据
    const requestData = {
      query: query,
      stream: true,  // 开启流式响应
      format: 'text', // 直接请求纯文本
      openid: openid || 'default_user' // 使用用户的微信ID，如果没有则使用默认值
    };

    console.log('请求参数:', requestData);
    console.log('请求URL:', `${API_BASE_URL}/agent/chat`);
    
    // 获取系统信息
    let isDevTool = false;
    try {
      const appBaseInfo = wx.getAppBaseInfo();
      isDevTool = appBaseInfo.platform === 'devtools';
      console.log('系统环境:', appBaseInfo.platform);
    } catch (e) {
      console.warn('获取系统信息失败');
    }
    
    // 初始化累积的响应文本
    let accumulatedText = '';
    let isFirstChunk = true;
    
    // 使用wx.request实现SSE
    const requestTask = wx.request({
      url: `${API_BASE_URL}/agent/chat`,
      method: 'POST',
      data: requestData,
      header: {
        'content-type': 'application/json',
        'Accept': 'text/event-stream'
      },
      enableChunked: true, // 启用分块传输
      responseType: 'arraybuffer',
      success(res) {
        console.log('请求成功初始化');
      },
      fail(err) {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        that.setData({ loading: false, isStreaming: false });
      },
      complete() {
        // 请求完成时（无论成功失败）都关闭加载状态
        that.setData({ 
          loading: false,
          isStreaming: false 
        });
      }
    });
    
    // 创建一个变量跟踪是否收到至少一个数据块
    let receivedFirstChunk = false;
    let responseComplete = false;
    let totalChunks = 0;
    
    // 监听数据接收事件
    requestTask.onChunkReceived(function(res) {
      try {
        totalChunks++;
        
        // 如果是第一个数据块，关闭loading，但不显示isStreaming状态
        // 等待累积一定量的内容后再显示，避免"正在生成"的闪烁
        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          that.setData({ 
            loading: false
          });
        }
        
        // 将二进制数据转换为字符串
        let text;
        if (isDevTool) {
          text = new TextDecoder('utf-8').decode(new Uint8Array(res.data));
        } else {
          text = String.fromCharCode.apply(null, new Uint8Array(res.data));
        }
        
        // 检查是否是最后一个数据块
        if (text.includes('"done":true') || text.includes('"done": true')) {
          responseComplete = true;
          that.setData({ 
            isStreaming: false,
            loading: false
          });
          return;
        }
        
        // 处理数据
        let content = '';
        
        // 处理SSE格式
        if (text.includes('data:')) {
          const matches = text.match(/data:\s*({.+?})/g) || [];
          for (const match of matches) {
            try {
              const jsonStr = match.replace(/^data:\s*/, '');
              const data = JSON.parse(jsonStr);
              
              if (data.content !== undefined) {
                // 处理Unicode编码
                if (typeof data.content === 'string' && data.content.includes('\\u')) {
                  try {
                    content += JSON.parse('"' + data.content.replace(/"/g, '\\"') + '"');
                  } catch (e) {
                    content += data.content;
                  }
                } else {
                  content += data.content;
                }
              }
            } catch (e) {
              console.warn('解析数据失败:', e);
            }
          }
        } else if (text.startsWith('{') && text.endsWith('}')) {
          try {
            const data = JSON.parse(text);
            if (data.content !== undefined) {
              content += data.content;
            }
          } catch (e) {
            console.warn('解析JSON失败:', e);
          }
        } else {
          content = text;
        }
        
        // 更新累积的文本
        if (content) {
          // 处理第一个数据块的前导空行
          if (isFirstChunk) {
            content = content.replace(/^\s+/, '');
            isFirstChunk = false;
          }
          
          // 处理连续的空行，将多个空行替换为单个空行
          content = content.replace(/\n\s*\n/g, '\n');
          
          accumulatedText += content;
          
          // 确保整个文本中不会有多余的空行
          const processedText = accumulatedText.replace(/\n\s*\n/g, '\n').trim();
          
          // 设置文本内容
          that.setData({
            textContent: processedText
          });
          
          // 当累积足够的内容或收到足够多的数据块时，才显示isStreaming
          // 这样可以避免"正在生成"的短暂显示
          if (totalChunks > 3 && processedText.length > 20 && !that.data.isStreaming) {
            that.setData({
              isStreaming: true
            });
          }
          
          // 处理富文本显示
          if (!that.data.usePlainText) {
            // 使用towxml处理富文本
            that.formatRichTextContent(processedText);
            
            // 同时使用自定义Markdown渲染器生成HTML
            const markdownHtml = that.simpleMarkdownToHtml(processedText);
            that.setData({
              markdownHtml: markdownHtml
            });
          }
        }
      } catch (error) {
        console.error('处理数据失败:', error);
      }
    });
  },

  // 复制结果
  copyResult() {
    if (!this.data.textContent) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      });
      return;
    }
    
    // 使用纯文本内容进行复制，确保格式正确
    const textToCopy = this.data.textContent;
    
    wx.setClipboardData({
      data: textToCopy,
      success() {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      },
      fail(err) {
        console.error('复制失败:', err);
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 清空搜索结果
  clearResult() {
    this.setData({
      textContent: '',
      richTextContent: null,
      isStreaming: false
    });
  },
  
  // 处理响应错误
  handleResponseError: function(errorMsg) {
    this.setData({
      loading: false,
      isStreaming: false
    });
    
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    });
  },

  // 分享搜索结果
  shareResult: function() {
    // 在小程序中不能直接调用分享，需要用户点击右上角的分享按钮
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none'
    });
  },

  // 反馈搜索结果
  feedbackResult: function() {
    wx.navigateTo({
      url: '/pages/feedback/feedback?query=' + encodeURIComponent(this.data.searchValue)
    });
  },

  // 打开来源链接
  openSource: function(e) {
    const source = e.currentTarget.dataset.source;
    
    if (!source) return;
    
    // 判断来源类型，处理不同来源的打开方式
    if (source.startsWith('http')) {
      // 提供更好的用户体验
      wx.showActionSheet({
        itemList: ['复制链接', '在浏览器中打开'],
        success: function(res) {
          if (res.tapIndex === 0) {
            // 复制链接
            wx.setClipboardData({
              data: source,
              success: function() {
                wx.showToast({
                  title: '链接已复制',
                  icon: 'success'
                });
              }
            });
          } else if (res.tapIndex === 1) {
            // 尝试通过webview页面打开链接
            wx.navigateTo({
              url: `/pages/webview/webview?url=${encodeURIComponent(source)}`,
              fail: function() {
                // 如果没有webview页面，则提示用户在浏览器打开
                wx.setClipboardData({
                  data: source,
                  success: function() {
                    wx.showModal({
                      title: '链接已复制',
                      content: '链接已复制到剪贴板，您可以在浏览器中打开',
                      showCancel: false
                    });
                  }
                });
              }
            });
          }
        }
      });
    } else {
      // 其他类型资源，例如文件、文档等
      wx.showToast({
        title: '暂不支持打开此类资源',
        icon: 'none'
      });
    }
  },

  // 导航到分类
  navigateToCategory: function(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: '/pages/category/category?type=' + type
    });
  },

  // 导航到贡献页
  navigateToContribute: function() {
    wx.navigateTo({
      url: '/pages/contribute/contribute'
    });
  },

  // 处理推荐问题点击
  handleRecommendClick: function(e) {
    const question = e.currentTarget.dataset.question;
    if (question) {
      this.setData({
        searchValue: question
      });
      this.handleSearch();
    }
  },

  // 刷新新闻
  refreshNews: function() {
    wx.showLoading({
      title: '刷新中...',
    });
    
    // 模拟刷新操作
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 1000);
  },

  // 打开新闻详情
  openNewsDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/news/detail?id=' + id
    });
  },

  // 查看更多热榜
  viewMoreHot: function() {
    wx.navigateTo({
      url: '/pages/hot/list'
    });
  },

  // 打开热榜详情
  openHotDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/hot/detail?id=' + id
    });
  },

  // 用户点击右上角分享
  onShareAppMessage: function() {
    const query = this.data.searchValue;
    return {
      title: `南开wiki - ${query}`,
      path: `/pages/search/search?query=${encodeURIComponent(query)}`
    };
  },

  onLoad: function(options) {
    // 如果从其他页面跳转过来并携带参数
    if (options.query) {
      this.setData({
        searchValue: decodeURIComponent(options.query)
      });
      this.handleSearch();
    }
    
    // 初始化会话历史
    this.loadChatHistory();
  },
  
  onUnload: function() {
    // 清除定时器
    if (this.data.typingTimer) {
      clearInterval(this.data.typingTimer);
    }
  },

  // 添加测试方法
  testSSE: function() {
    console.log('开始测试SSE流式响应');
    // 使用一个容易跟踪的测试查询
    const testQuery = "测试流式响应";
    
    this.setData({
      searchValue: testQuery,
      loading: true,
      isStreaming: true,
      markdownHtml: '<view class="md-p">正在测试流式响应...</view>',
      fullResponse: '',
      searchResults: []
    });
    
    // 直接调用流式请求方法
    this.startChatStream(testQuery);
    
    // 延迟2秒后再启动本地测试，避免与实际请求混淆
    setTimeout(() => {
      // 仅当实际接口没有返回数据时才启动本地测试
      if (!this.data.fullResponse || this.data.fullResponse.length === 0) {
        console.log('实际请求无数据返回，启动本地测试');
        this.testLocalStream();
      }
    }, 2000);
  },
  
  // 本地测试流式数据处理
  testLocalStream: function() {
    console.log('开始本地流式测试');
    const that = this;
    
    // 模拟的数据块，包含Unicode示例
    const mockChunks = [
      'data: {"content": "测"}',
      'data: {"content": "\\u8bd5"}', // "试"的Unicode
      'data: {"content": "流"}',
      'data: {"content": "\\u5f0f"}', // "式"的Unicode
      'data: {"content": "响"}',
      'data: {"content": "应"}',
      'data: {"content": "\\n"}',      // 换行符
      'data: {"content": "1"}',
      'data: {"content": "\\n"}',
      'data: {"content": "2"}',
      'data: {"content": "\\n"}',
      'data: {"content": "3"}'
    ];
    
    // 清空当前响应，以便测试
    that.setData({
      fullResponse: '',
      markdownHtml: '',
      searchResults: []
    });
    
    let index = 0;
    let localResponse = '';
    
    // 模拟数据块逐个接收
    const interval = setInterval(() => {
      if (index >= mockChunks.length) {
        clearInterval(interval);
        console.log('本地测试完成，最终响应:', localResponse);
        
        // 测试结束后，切换到纯文本模式以便查看结果
        setTimeout(() => {
          if (!that.data.usePlainText) {
            that.togglePlainTextMode();
          }
        }, 1000);
        
        return;
      }
      
      // 获取当前数据块
      const chunk = mockChunks[index++];
      console.log('模拟接收数据:', chunk);
      
      try {
        // 解析数据块
        if (chunk.includes('data:')) {
          const jsonStr = chunk.replace(/^data:\s*/, '');
          const data = JSON.parse(jsonStr);
          if (data.content !== undefined) {
            // 处理Unicode
            let content = data.content;
            if (typeof content === 'string' && content.includes('\\u')) {
              try {
                content = JSON.parse('"' + content.replace(/"/g, '\\"') + '"');
                console.log('解码Unicode后:', content);
              } catch (err) {
                console.warn('Unicode解码失败:', err);
              }
            }
            
            localResponse += content;
            
            // 更新界面
            const html = that.simpleMarkdownToHtml(localResponse);
            that.setData({
              fullResponse: localResponse,
              searchResults: [localResponse],
              markdownHtml: html,
              isStreaming: true
            });
            
            console.log('本地测试更新响应:', localResponse);
          }
        }
      } catch (error) {
        console.error('本地测试解析错误:', error);
      }
    }, 500); // 每500ms发送一个数据块
  },

  // 处理上传文件
  uploadFile() {
    const that = this;
    
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      async success(res) {
        try {
          if (!res.tempFiles || !res.tempFiles.length) {
            wx.showToast({
              title: '未选择文件',
              icon: 'none'
            });
            return;
          }
          
          const file = res.tempFiles[0];
          const filePath = file.path;
          const fileName = file.name;
          
          wx.showLoading({
            title: '正在上传文件...',
            mask: true
          });
          
          // 获取用户ID
          const userManager = require('../../utils/user_manager');
          const uploadHelper = require('../../utils/upload_helper');
          
          const openid = userManager.getUser()?.id || 'anonymous';
          
          // 使用uploadHelper上传文件
          const fileID = await uploadHelper.uploadFile(
            filePath, 
            'search_docs', 
            openid, 
            false // 不压缩
          );
          
          if (!fileID) {
            throw new Error('文件上传失败');
          }
          
          wx.showLoading({
            title: '正在建立索引...',
            mask: true
          });
          
          // 调用后端API建立索引
          const searchAPI = require('../../api/search_api');
          const result = await searchAPI.indexDocument({
            file_id: fileID,
            file_name: fileName,
            openid: openid
          });
          
          wx.hideLoading();
          
          if (result.success) {
            wx.showToast({
              title: '文档已成功索引',
              icon: 'success'
            });
            
            // 将文件名设为搜索词
            that.setData({
              searchValue: fileName.split('.')[0]
            });
            
            // 如果有建议的关键词，提示用户
            if (result.suggested_keywords && result.suggested_keywords.length > 0) {
              const keywords = result.suggested_keywords.join(', ');
              
              wx.showModal({
                title: '发现以下关键词',
                content: `文档包含这些关键词: ${keywords}\n\n是否立即搜索这些关键词?`,
                confirmText: '搜索',
                cancelText: '取消',
                success(modalRes) {
                  if (modalRes.confirm) {
                    // 使用关键词搜索
                    that.setData({
                      searchValue: keywords
                    });
                    that.handleSearch();
                  }
                }
              });
            }
          } else {
            wx.showToast({
              title: result.message || '建立索引失败',
              icon: 'none'
            });
          }
        } catch (error) {
          console.error('文件上传失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: '文件处理失败',
            icon: 'none'
          });
        }
      },
      fail(err) {
        console.error('选择文件失败:', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 开始语音搜索
  startVoiceSearch() {
    // 检查是否支持录音
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.beginVoiceRecognition();
            },
            fail: () => {
              wx.showToast({
                title: '需要录音权限',
                icon: 'none'
              });
            }
          });
        } else {
          this.beginVoiceRecognition();
        }
      }
    });
  },
  
  // 开始语音识别
  beginVoiceRecognition() {
    const recorderManager = wx.getRecorderManager();
    
    // 配置录音参数
    const options = {
      duration: 10000, // 最长录音时间，单位ms
      sampleRate: 16000, // 采样率
      numberOfChannels: 1, // 录音通道数
      encodeBitRate: 64000, // 编码码率
      format: 'mp3', // 音频格式
      frameSize: 50 // 指定帧大小，单位KB
    };
    
    // 监听录音结束事件
    recorderManager.onStop((res) => {
      console.log('录音结束:', res);
      const { tempFilePath } = res;
      
      wx.showLoading({
        title: '正在识别...',
      });
      
      // 这里可以实现实际的语音识别逻辑
      // 模拟识别过程
      setTimeout(() => {
        wx.hideLoading();
        
        // 模拟识别结果
        const recognizedText = "南开大学的校训是什么";
        
        this.setData({
          searchValue: recognizedText
        });
        
        // 自动执行搜索
        this.handleSearch();
      }, 1500);
    });
    
    // 开始录音
    recorderManager.start(options);
    
    wx.showToast({
      title: '正在录音...',
      icon: 'none',
      duration: 10000 // 与录音时长相同
    });
    
    // 3秒后停止录音（实际应用中可以使用按钮控制停止）
    setTimeout(() => {
      recorderManager.stop();
      wx.hideToast();
    }, 3000);
  }
}) 