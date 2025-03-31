const app = getApp()
const {get, post, processResponse} = require('../../utils/request');
const towxml = require('../../wxcomponents/towxml/index');
const api = require('../../utils/api/index');
const {
  formatRelativeTime,
  getStorage,
  setStorage,
  removeStorage
} = require('../../utils/util');

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
    currentCategory: 'all', // 当前选中的分类
    categories: [
      { id: 'all', name: '全部', icon: '/assets/icons/search/all.png' },
      { id: 'website', name: '网站', icon: '/assets/icons/search/website.png' },
      { id: 'wechat', name: '微信', icon: '/assets/icons/search/wechat.png' },
      { id: 'market', name: '集市', icon: '/assets/icons/search/market.png' },
      { id: 'douyin', name: '抖音', icon: '/assets/icons/search/douyin.png' }
    ],
    loading: false,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    },
    isRecording: false, // 是否正在录音
    textContent: '',
    richTextContent: null,
    usePlainText: false,
    enableTyper: true,
    typerSpeed: 20,
    markdownHtml: '',
    fullResponse: '',
    sources: [],
    // 记录所有会话
    chatHistory: [],
    _lastMarkdown: '',
    _lastMarkdownHtml: '',
    typingText: '',
    requestTask: null, // 存储请求任务，用于取消请求
  },

  // 输入框内容变化
  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value });
  },

  // 清空搜索框
  clearSearchInput() {
    this.setData({
      searchValue: '',
      searchResults: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        hasMore: true
      }
    });
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const searchHistory = getStorage('searchHistory') || [];
      this.setData({ searchHistory });
    } catch (err) {
      console.debug('加载搜索历史失败:', err);
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    try {
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
      setStorage('searchHistory', searchHistory);
    } catch (err) {
      console.debug('保存搜索历史失败:', err);
    }
  },

  // 清空搜索历史
  clearSearchHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ searchHistory: [] });
          removeStorage('searchHistory');
          wx.showToast({
            title: '已清空搜索历史',
            icon: 'success'
          });
        }
      }
    });
  },

  // 点击历史记录
  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchValue: keyword });
    this.handleSearch();
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;
    
    this.setData({
      currentCategory: category,
      searchResults: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        hasMore: true
      }
    });
    
    if (this.data.searchValue) {
      this.handleSearch();
    }
  },

  // 开始语音搜索
  startVoiceSearch() {
    // 检查是否有录音权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({ isRecording: true });
        const recorderManager = wx.getRecorderManager();
        
        recorderManager.onStart(() => {
          wx.showToast({
            title: '开始录音',
            icon: 'none'
          });
        });
        
        recorderManager.onStop((res) => {
          this.setData({ isRecording: false });
          if (res.duration < 1000) {
            wx.showToast({
              title: '说话时间太短',
              icon: 'none'
            });
            return;
          }
          
          wx.showLoading({ title: '识别中...' });
          
          // 调用语音识别API
          wx.uploadFile({
            url: `${API_BASE_URL}/api/voice/recognize`,
            filePath: res.tempFilePath,
            name: 'file',
            success: (uploadRes) => {
              const result = JSON.parse(uploadRes.data);
              if (result.code === 200 && result.data) {
                this.setData({ searchValue: result.data.text });
                this.handleSearch();
              } else {
                wx.showToast({
                  title: '识别失败',
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.showToast({
                title: '识别失败',
                icon: 'none'
              });
            },
            complete: () => {
              wx.hideLoading();
            }
          });
        });
        
        recorderManager.start({
          duration: 10000, // 最长录音时间，单位ms
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: 'mp3'
        });
      },
      fail: () => {
        wx.showModal({
          title: '提示',
          content: '需要您的录音权限才能使用语音搜索功能',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  // 停止语音搜索
  stopVoiceSearch() {
    if (this.data.isRecording) {
      const recorderManager = wx.getRecorderManager();
      recorderManager.stop();
    }
  },

  // 处理搜索事件
  async handleSearch() {
    const { searchValue, currentCategory, pagination } = this.data;
    if (!searchValue.trim()) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const params = {
        keyword: searchValue,
        category: currentCategory,
        page: pagination.page,
        pageSize: pagination.pageSize
      };
      
      const result = await api.search.searchPosts(params);
      
      if (result.code === 200) {
        // 处理搜索结果，添加相对时间
        const processedResults = result.data.list.map(item => ({
          ...item,
          created_at: formatRelativeTime(item.created_at)
        }));

        // 更新搜索结果和分页信息
        this.setData({
          searchResults: pagination.page === 1 
            ? processedResults 
            : [...this.data.searchResults, ...processedResults],
          'pagination.total': result.data.total,
          'pagination.hasMore': result.data.list.length === pagination.pageSize,
          loading: false
        });

        // 保存搜索历史
        if (pagination.page === 1) {
          this.saveSearchHistory(searchValue);
        }
      } else {
        wx.showToast({
          title: result.message || '搜索失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.debug('搜索失败:', err);
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMore() {
    if (!this.data.pagination.hasMore || this.data.loading) return;
    
    this.setData({
      'pagination.page': this.data.pagination.page + 1
    });
    
    this.handleSearch();
  },

  // 跳转到详情页
  goToDetail(e) {
    const post = e.currentTarget.dataset.post;
    if (!post?.id) {
      console.debug('跳转详情页失败：未提供帖子ID', post);
      wx.showToast({
        title: '无法打开帖子',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${post.id}`,
      fail: (err) => {
        console.debug('跳转详情页失败:', err);
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
      if (this.data.fullResponse) {
        if (this.data.usePlainText) {
          this.setData({ markdownHtml: '' });
        } else {
          const markdownHtml = parseMarkdown(this.data.fullResponse);
          this.setData({ markdownHtml });
        }
      }
      
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

  // 复制搜索结果
  copyResult() {
    const content = this.data.usePlainText ? this.data.textContent : this.data.fullResponse;
    if (!content) {
      wx.showToast({
        title: '没有可复制的内容',
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
      fullResponse: '',
      searchResults: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        hasMore: true
      }
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
      title: `nkuwiki - ${query}`,
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
    if (this.data.pagination.hasMore) {
      this.loadMore();
    }
  }
}); 