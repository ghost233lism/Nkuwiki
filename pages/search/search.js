const app = getApp()
const config = app.globalData.config || {};
const API_BASE_URL = config.services?.app?.base_url || 'https://nkuwiki.com';
const towxml = require('../../wxcomponents/towxml/index');
const api = require('../../utils/api');

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
    
    // 处理![title]()格式为标题超链接
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<navigator url="/pages/webview/webview?url=$2" class="md-link">$1</navigator>')
    
    // 无序列表
    .replace(/^\s*[-*+]\s+(.*?)$/gm, '<view class="md-li">• $1</view>')
    
    // 有序列表 
    .replace(/^\s*(\d+)\.\s+(.*?)$/gm, '<view class="md-li"><text class="md-li-num">$1.</text> $2</view>')
    
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<view class="md-code">$1</view>')
    
    // 行内代码
    .replace(/`(.*?)`/g, '<text class="md-inline-code">$1</text>')
    
    // 引用
    .replace(/^\>\s+(.*?)$/gm, '<view class="md-quote">$1</view>')
    
    // 分隔线
    .replace(/^---$/gm, '<view class="md-hr"></view>')
    
    // 段落
    .replace(/\n\n/g, '</view><view class="md-p">')
  
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
    richTextContent: null,  // 存储美化后的文本内容
    enableTyper: true,  // 打字机效果始终开启
    typerSpeed: 20,  // 打字机速度，值越小速度越快
    requestTask: null, // 存储请求任务，用于取消请求
  },

  // 输入框内容变化
  onSearchInput: function(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  // 清空搜索框
  clearSearchInput: function() {
    this.setData({
      searchValue: '',
      searchResults: [],
      currentPage: 1,
      hasMore: true
    });
  },

  // 加载搜索历史
  loadSearchHistory: function() {
    const searchHistory = wx.getStorageSync('searchHistory') || [];
    this.setData({ searchHistory });
  },

  // 保存搜索历史
  saveSearchHistory: function(keyword) {
    let searchHistory = this.data.searchHistory;
    
    // 如果已存在相同关键词，先删除
    searchHistory = searchHistory.filter(item => item !== keyword);
    
    // 添加到开头
    searchHistory.unshift(keyword);
    
    // 限制历史记录数量，保留最新10条
    if (searchHistory.length > 10) {
      searchHistory = searchHistory.slice(0, 10);
    }
    
    this.setData({ searchHistory });
    wx.setStorageSync('searchHistory', searchHistory);
  },

  // 清空搜索历史
  clearSearchHistory: function() {
    this.setData({ searchHistory: [] });
    wx.removeStorageSync('searchHistory');
  },

  // 点击历史记录
  onHistoryItemTap: function(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchValue: keyword
    });
    this.handleSearch();
  },

  // 处理搜索事件
  handleSearch: function() {
    const { searchValue } = this.data;
    if (!searchValue.trim()) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    this.setData({
      loading: true,
      currentPage: 1,
      searchResults: []
    });

    // 调用搜索API
    api.search.searchPosts({
      keyword: searchValue,
      page: 1,
      pageSize: this.data.pageSize
    }).then(result => {
      if (result.success) {
        this.setData({
          searchResults: result.data,
          hasMore: result.data.length === this.data.pageSize,
          loading: false
        });

        // 保存搜索历史
        this.saveSearchHistory(searchValue);
      } else {
        wx.showToast({
          title: result.message || '搜索失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    }).catch(err => {
      console.error('搜索失败:', err);
      wx.showToast({
        title: err.message || '搜索失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  // 加载更多
  loadMore: function() {
    if (!this.data.hasMore || this.data.loading) return;

    this.setData({ loading: true });

    const nextPage = this.data.currentPage + 1;
    api.search.searchPosts({
      keyword: this.data.searchValue,
      page: nextPage,
      pageSize: this.data.pageSize
    }).then(result => {
      if (result.success) {
        this.setData({
          searchResults: [...this.data.searchResults, ...result.data],
          currentPage: nextPage,
          hasMore: result.data.length === this.data.pageSize,
          loading: false
        });
      } else {
        wx.showToast({
          title: result.message || '加载更多失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    }).catch(err => {
      console.error('加载更多失败:', err);
      wx.showToast({
        title: err.message || '加载更多失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  // 跳转到详情页
  goToDetail: function(e) {
    const post = e.currentTarget.dataset.post;
    if (!post || !post.id) {
      console.error('跳转详情页失败：未提供帖子ID', post);
      wx.showToast({
        title: '无法打开帖子',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${post.id}`,
      fail: (err) => {
        console.error('跳转详情页失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 切换纯文本模式
  togglePlainTextMode() {
    this.setData({
      usePlainText: !this.data.usePlainText
    }, () => {
      // 如果已有内容，重新渲染
      if (this.data.fullResponse) {
        if (this.data.usePlainText) {
          this.setData({
            markdownHtml: '' // 清空markdown以便显示纯文本
          });
        } else {
          // 重新生成markdown
          const markdownHtml = parseMarkdown(this.data.fullResponse);
          this.setData({
            markdownHtml: markdownHtml
          });
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
      processedText = processedText.replace(/(\d+)\.\s*(.*?)[:：]\s*(https?:\/\/[^\s<]+)|^(.*?)[:：]\s*(https?:\/\/[^\s<]+)$|(?<![(\[])(https?:\/\/[^\s<]+)(?![)\]])/gm, 
        (match, num, title, url1, title2, url2, url3) => {
          const placeholder = `__LINK_${linkId}__`;
          if (num && title && url1) {
            // 数字编号的链接
            links.push({
              type: 'numbered',
              num,
              title: title.trim(),
              url: url1
            });
          } else if (title2 && url2) {
            // 标题: 链接格式
            links.push({
              type: 'titled',
              title: title2.trim(),
              url: url2
            });
          } else if (url3) {
            // 单独的链接
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
        if (link.type === 'numbered') {
          processedText = processedText.replace(placeholder, 
            `${link.num}. ![${link.title}](${link.url})`);
        } else if (link.type === 'titled') {
          processedText = processedText.replace(placeholder, 
            `![${link.title}](${link.url})`);
        } else {
          processedText = processedText.replace(placeholder, 
            `[${link.url}](${link.url})`);
        }
      });
      
      // 为表格添加noType属性，让表格直接全部显示而不用逐字打出
      processedText = processedText.replace(/(\|[^\n]*\|\n)(\|[^\n]*\|)/g, '<!--table-noType-->\n$1$2');
      
      // 如有代码块，也标记为不需要打字效果
      processedText = processedText.replace(/```(.+?)```/gs, '<!--code-noType-->\n```$1```');
      
      // 使用 towxml 处理文本
      const result = towxml(processedText, 'markdown', {
        theme: 'light',
        audio: false,
        external_link: true,
        emoji: false,
        latex: false,
        highlight: false,
        // 添加打字机配置
        typer: {
          enable: this.data.enableTyper,  // 是否启用打字机效果，确保传递这个属性
          speed: this.data.typerSpeed,    // 使用data中的打字速度
          delay: 100,                     // 初始延迟
          showCursor: true,               // 显示光标
          skippable: ['table', 'pre', 'code', 'image'] // 跳过打字效果的标签
        },
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
      
      // 处理表格和代码块的noType属性
      this.handleNoTypeElements(result);

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
  
  // 处理不需要打字效果的特殊元素
  handleNoTypeElements: function(node) {
    if (!node) return;
    
    // 为表格和代码块添加noType属性
    if (node.tag === 'table' || node.tag === 'pre') {
      node.noType = true;
    }
    
    // 递归处理所有子节点
    if (node.children && node.children.length > 0) {
      for (let child of node.children) {
        this.handleNoTypeElements(child);
      }
    }
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
    // 取消现有请求
    if (this.data.requestTask) {
      this.data.requestTask.abort();
      this.setData({
        requestTask: null
      });
    }
    
    this.setData({
      textContent: '',
      richTextContent: null,
      isStreaming: false,
      fullResponse: ''
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

  // 用户点击右上角分享
  onShareAppMessage: function() {
    const query = this.data.searchValue;
    return {
      title: `南开wiki - ${query}`,
      path: `/pages/search/search?query=${encodeURIComponent(query)}`
    };
  },

  onLoad: function(options) {
    console.log('搜索页面加载, 打字机配置:', this.data.enableTyper, this.data.typerSpeed);

    // 确保打字机配置正确初始化
    this.setData({
      enableTyper: true,  // 确保打字机效果开启
      typerSpeed: 20      // 设置适中的速度
    });
    
    // 如果从其他页面跳转过来并携带参数
    if (options.query) {
      this.setData({
        searchValue: decodeURIComponent(options.query)
      });
      this.handleSearch();
    }
    
    // 初始化会话历史
    this.loadChatHistory();
    
    // 加载搜索历史
    this.loadSearchHistory();
  },
  
  onUnload: function() {
    // 清除定时器
    if (this.data.typingTimer) {
      clearInterval(this.data.typingTimer);
    }
    
    // 取消现有请求
    if (this.data.requestTask) {
      this.data.requestTask.abort();
    }
  },

  onReachBottom: function() {
    if (this.data.hasMore) {
      this.loadMore();
    }
  }
}); 