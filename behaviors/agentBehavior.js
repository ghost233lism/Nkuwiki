/**
 * 智能体行为 - 封装智能体API交互逻辑
 */
const { storage, createApiClient, createStreamApiClient, ui, ToastType } = require('../utils/util');

// 创建常规智能体API客户端
const agentApi = createApiClient('/api/agent', {
  status: { method: 'GET', path: '/status', params: {} },
  chat: { method: 'POST', path: '/chat', params: { openid: true, query: true } },
  rag: { method: 'POST', path: '', params: { openid: true, query: true } }
});

// 创建流式智能体API客户端
const agentStreamApi = createStreamApiClient('/api/agent', {
  chat: { method: 'POST', path: '/chat', params: { openid: true, query: true } },
  rag: { method: 'POST', path: '', params: { openid: true, query: true } }
});


module.exports = Behavior({
  // 属性定义
  properties: {
    // 消息记录
    messages: {
      type: Array,
      value: []
    },
    // 当前会话相关参数
    session: {
      type: Object,
      value: {
        botTag: 'general', // 使用的机器人类型
        format: 'markdown', // 回复格式
        hasMore: false,     // 是否有更多消息
        loading: false      // 是否正在加载
      }
    }
  },

  methods: {
    /**
     * 初始化智能体会话
     * @param {string} botTag - 机器人标识，默认为general
     * @param {string} format - 回复格式，支持markdown和text，默认为markdown
     * @returns {boolean} 初始化结果
     */
    _initAgentSession(botTag = 'general', format = 'markdown') {
      // 检查智能体状态
      this._checkAgentStatus();
      
      // 设置会话参数
      this.setData({
        'session.botTag': botTag,
        'session.format': format,
        'session.loading': false,
        messages: []
      });
      
      console.debug('智能体会话初始化完成:', {botTag, format});
      return true;
    },
    
    /**
     * 检查智能体服务状态
     * @returns {Promise<boolean>} 检查结果
     */
    async _checkAgentStatus() {
      try {
        const res = await agentApi.status();
        if (res.code !== 200) {
          console.debug('智能体服务状态异常:', res);
          return false;
        }
        console.debug('智能体服务状态正常');
        return true;
      } catch (err) {
        console.debug('检查智能体状态失败:', err);
        return false;
      }
    },
    
    /**
     * 发送消息给智能体（普通方式）
     * @param {string} query - 用户问题
     * @returns {Promise<Object>} 智能体回复
     */
    async _sendMessageToAgent(query) {
      if (!query || !query.trim()) {
        ui.showToast('请输入内容', { type: ToastType.ERROR });
        return null;
      }
      
      // 添加用户消息
      const userMessage = {
        role: 'user',
        content: query
      };
      
      const messages = [...this.data.messages, userMessage];
      this.setData({
        messages,
        'session.loading': true
      });
      
      try {
        // 准备请求参数
        const requestData = {
          openid: storage.get('openid'),
          query: query,
          bot_tag: this.data.session.botTag,
          stream: false,
          format: this.data.session.format
        };
        
        // 发送请求
        const res = await agentApi.chat(requestData);
        
        if (res.code !== 200) {
          throw new Error(res.message || '智能体响应异常');
        }
        
        // 添加智能体回复
        const assistantMessage = {
          role: 'assistant',
          content: res.data.message,
          format: res.data.format,
          usage: res.data.usage
        };
        
        messages.push(assistantMessage);
        this.setData({
          messages,
          'session.loading': false
        });
        
        return assistantMessage;
      } catch (err) {
        console.debug('发送消息给智能体失败:', err);
        
        // 添加错误消息
        const errorMessage = {
          role: 'assistant',
          content: '抱歉，我暂时无法回答您的问题，请稍后再试。',
          error: true
        };
        
        messages.push(errorMessage);
        this.setData({
          messages,
          'session.loading': false
        });
        
        ui.showToast(err.message || '发送消息失败', { type: ToastType.ERROR });
        return null;
      }
    },
    
    /**
     * 发送消息给智能体（流式方式）
     * @param {string} query - 用户问题
     * @returns {Promise<boolean>} 发送结果
     */
    async _sendStreamMessageToAgent(query) {
      if (!query || !query.trim()) {
        ui.showToast('请输入内容', { type: ToastType.ERROR });
        return false;
      }
      
      // 添加用户消息
      const userMessage = {
        role: 'user',
        content: query
      };
      
      // 添加智能体的空消息占位符
      const assistantMessage = {
        role: 'assistant',
        content: '',
        loading: true
      };
      
      const messages = [...this.data.messages, userMessage, assistantMessage];
      this.setData({
        messages,
        'session.loading': true
      });
      
      try {
        // 准备请求参数
        const requestData = {
          openid: storage.get('openid'),
          query: query,
          bot_tag: this.data.session.botTag,
          stream: true,
          format: this.data.session.format
        };
        
        // 获取最后一条消息的索引，用于后续更新
        const assistantIndex = messages.length - 1;
        
        // 发起流式请求
        agentStreamApi.chat(
          requestData,
          {
            // 处理流式数据块
            onMessage: (chunks) => {
              chunks.forEach(chunk => {
                try {
                  const data = JSON.parse(chunk);
                  
                  // 处理不同类型的事件
                  if (data.content) {
                    // 更新内容
                    messages[assistantIndex].content += data.content;
                    this.setData({ messages });
                  } else if (data.type === 'error') {
                    // 处理错误
                    messages[assistantIndex].error = true;
                    messages[assistantIndex].content = data.message || '发生错误，请稍后再试';
                    this.setData({ messages });
                  }
                } catch (err) {
                  console.debug('解析流式数据块失败:', err, chunk);
                }
              });
            },
            
            // 处理请求完成
            onComplete: (chunks) => {
              if (chunks && chunks.length) {
                chunks.forEach(chunk => {
                  try {
                    const data = JSON.parse(chunk);
                    
                    // 完成后处理最后的内容块
                    if (data.content) {
                      messages[assistantIndex].content += data.content;
                    } else if (data.type === 'done') {
                      // 标记完成
                      messages[assistantIndex].loading = false;
                    }
                  } catch (err) {
                    console.debug('解析最终数据块失败:', err, chunk);
                  }
                });
              }
              
              // 无论如何，标记为已完成
              messages[assistantIndex].loading = false;
              this.setData({
                messages,
                'session.loading': false
              });
              
              console.debug('流式对话完成');
            },
            
            // 处理错误
            onError: (error) => {
              console.debug('流式请求出错:', error);
              
              // 更新消息为错误状态
              messages[assistantIndex].loading = false;
              messages[assistantIndex].error = true;
              messages[assistantIndex].content = '抱歉，对话出错，请稍后再试';
              
              this.setData({
                messages,
                'session.loading': false
              });
              
              ui.showToast('对话出错，请稍后再试', { type: ToastType.ERROR });
            }
          }
        );
        
        return true;
      } catch (err) {
        console.debug('发起流式对话失败:', err);
        
        // 更新消息为错误状态
        const assistantIndex = messages.length - 1;
        messages[assistantIndex].loading = false;
        messages[assistantIndex].error = true;
        messages[assistantIndex].content = '抱歉，对话出错，请稍后再试';
        
        this.setData({
          messages,
          'session.loading': false
        });
        
        ui.showToast(err.message || '发送消息失败', { type: ToastType.ERROR });
        return false;
      }
    },
    
    /**
     * 发送基于知识库的检索增强生成查询（RAG）
     * @param {string} query - 用户问题
     * @param {Array<string>} tables - 要检索的数据表列表
     * @param {boolean} stream - 是否使用流式返回
     * @returns {Promise<Object|boolean>} 查询结果或发送结果
     */
    async _sendRagQuery(query, tables = ['wxapp_posts', 'website_nku', 'wechat_nku'], stream = true) {
      if (!query || !query.trim()) {
        ui.showToast('请输入内容', { type: ToastType.ERROR });
        return null;
      }
      
      // 添加用户消息
      const userMessage = {
        role: 'user',
        content: query
      };
      
      let messages;
      let assistantIndex;
      
      if (stream) {
        // 流式模式：添加智能体的空消息占位符
        const assistantMessage = {
          role: 'assistant',
          content: '',
          loading: true,
          sources: []
        };
        
        messages = [...this.data.messages, userMessage, assistantMessage];
        assistantIndex = messages.length - 1;
      } else {
        // 非流式模式：只添加用户消息
        messages = [...this.data.messages, userMessage];
      }
      
      this.setData({
        messages,
        'session.loading': true
      });
      
      // 准备请求参数
      const requestData = {
        openid: storage.get('openid'),
        query: query,
        tables: tables,
        max_results: 3,
        stream: stream,
        format: this.data.session.format
      };
      
      if (stream) {
        // 流式请求
        try {
          // 发起流式请求
          agentStreamApi.rag(
            requestData,
            {
              // 处理流式数据块
              onMessage: (chunks) => {
                chunks.forEach(chunk => {
                  try {
                    const data = JSON.parse(chunk);
                    
                    // 处理不同类型的事件
                    if (data.type === 'content' && data.chunk) {
                      // 更新内容
                      messages[assistantIndex].content += data.chunk;
                      this.setData({ messages });
                    } else if (data.type === 'sources' && data.sources) {
                      // 更新知识源
                      messages[assistantIndex].sources = data.sources;
                      this.setData({ messages });
                    } else if (data.type === 'suggested' && data.questions) {
                      // 更新推荐问题
                      messages[assistantIndex].suggested_questions = data.questions;
                      this.setData({ messages });
                    } else if (data.type === 'query') {
                      // 更新查询
                      messages[assistantIndex].original_query = data.original;
                      messages[assistantIndex].rewritten_query = data.rewritten;
                      this.setData({ messages });
                    } else if (data.type === 'error') {
                      // 处理错误
                      messages[assistantIndex].error = true;
                      messages[assistantIndex].content = data.message || '发生错误，请稍后再试';
                      this.setData({ messages });
                    }
                  } catch (err) {
                    console.debug('解析RAG流式数据块失败:', err, chunk);
                  }
                });
              },
              
              // 处理请求完成
              onComplete: (chunks) => {
                if (chunks && chunks.length) {
                  chunks.forEach(chunk => {
                    try {
                      const data = JSON.parse(chunk);
                      
                      // 完成后处理最后的内容块
                      if (data.type === 'content' && data.chunk) {
                        messages[assistantIndex].content += data.chunk;
                      } else if (data.type === 'done') {
                        // 标记完成
                        messages[assistantIndex].loading = false;
                      }
                    } catch (err) {
                      console.debug('解析RAG最终数据块失败:', err, chunk);
                    }
                  });
                }
                
                // 无论如何，标记为已完成
                messages[assistantIndex].loading = false;
                this.setData({
                  messages,
                  'session.loading': false
                });
                
                console.debug('RAG流式查询完成');
              },
              
              // 处理错误
              onError: (error) => {
                console.debug('RAG流式请求出错:', error);
                
                // 更新消息为错误状态
                messages[assistantIndex].loading = false;
                messages[assistantIndex].error = true;
                messages[assistantIndex].content = '抱歉，查询出错，请稍后再试';
                
                this.setData({
                  messages,
                  'session.loading': false
                });
                
                ui.showToast('查询出错，请稍后再试', { type: ToastType.ERROR });
              }
            }
          );
          
          return true;
        } catch (err) {
          console.debug('发起RAG流式查询失败:', err);
          
          // 更新消息为错误状态
          messages[assistantIndex].loading = false;
          messages[assistantIndex].error = true;
          messages[assistantIndex].content = '抱歉，查询出错，请稍后再试';
          
          this.setData({
            messages,
            'session.loading': false
          });
          
          ui.showToast(err.message || '查询失败', { type: ToastType.ERROR });
          return false;
        }
      } else {
        // 非流式请求
        try {
          // 发送请求
          const res = await agentApi.rag(requestData);
          
          if (res.code !== 200) {
            throw new Error(res.message || '查询响应异常');
          }
          
          // 添加智能体回复
          const assistantMessage = {
            role: 'assistant',
            content: res.data.response,
            format: res.data.format,
            sources: res.data.sources || [],
            suggested_questions: res.data.suggested_questions || [],
            original_query: res.data.original_query,
            rewritten_query: res.data.rewritten_query
          };
          
          messages.push(assistantMessage);
          this.setData({
            messages,
            'session.loading': false
          });
          
          return assistantMessage;
        } catch (err) {
          console.debug('发送RAG查询失败:', err);
          
          // 添加错误消息
          const errorMessage = {
            role: 'assistant',
            content: '抱歉，我暂时无法回答您的问题，请稍后再试。',
            error: true
          };
          
          messages.push(errorMessage);
          this.setData({
            messages,
            'session.loading': false
          });
          
          ui.showToast(err.message || '查询失败', { type: ToastType.ERROR });
          return null;
        }
      }
    },
    
    /**
     * 清空当前会话
     */
    _clearAgentSession() {
      this.setData({
        messages: [],
        'session.loading': false
      });
    },

  }
});
