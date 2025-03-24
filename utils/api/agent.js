// agent.js
// 智能体相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

/**
 * 智能体API模块
 */
const agentAPI = {
  /**
   * 智能体对话
   * @param {Object} params - 对话参数
   * @param {string} params.query - 用户问题
   * @param {Array} [params.messages] - 对话历史
   * @param {boolean} [params.stream=false] - 是否流式返回
   * @param {string} [params.format="markdown"] - 返回格式
   * @param {string} [params.openid] - 用户openid，不传则使用当前登录用户
   * @returns {Promise} - 请求Promise
   */
  chat: (params) => {
    // 支持两种调用方式，兼容旧版
    let requestData = {};
    
    if (typeof params === 'string') {
      // 旧版调用方式: chat(query, history)
      const query = params;
      const messages = arguments[1] || [];
      
      requestData = { query, messages };
    } else if (typeof params === 'object') {
      // 新版调用方式: chat({query, messages, stream, format})
      requestData = { ...params };
    } else {
      return Promise.reject(new Error('无效的参数'));
    }
    
    // 确保存在query
    if (!requestData.query) {
      return Promise.reject(new Error('缺少必要参数: query'));
    }
    
    // 如果没有openid，尝试获取当前用户
    if (!requestData.openid) {
      const userInfo = userManager.getCurrentUser();
      if (userInfo && userInfo.openid) {
        requestData.openid = userInfo.openid;
      }
    }
    
    return request({
      url: `${API.PREFIX.AGENT}/chat`,
      method: 'POST',
      data: requestData
    });
  },

  /**
   * 知识搜索
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 搜索关键词
   * @param {number} [params.limit=10] - 返回数量限制
   * @param {number} [params.offset=0] - 结果偏移量
   * @param {string} [params.openid] - 用户openid，不传则使用当前登录用户
   * @param {Array} [params.filters] - 过滤条件
   * @returns {Promise} - 请求Promise
   */
  search: (params) => {
    // 支持两种调用方式，兼容旧版
    let requestData = {};
    
    if (typeof params === 'string') {
      // 旧版调用方式: search(keyword, limit)
      const keyword = params;
      const limit = arguments[1] || 10;
      
      requestData = { keyword, limit };
    } else if (typeof params === 'object') {
      // 新版调用方式: search({keyword, limit, offset, filters})
      requestData = { ...params };
    } else {
      return Promise.reject(new Error('无效的参数'));
    }
    
    // 确保存在keyword
    if (!requestData.keyword) {
      return Promise.reject(new Error('缺少必要参数: keyword'));
    }
    
    // 如果没有openid，尝试获取当前用户
    if (!requestData.openid) {
      const userInfo = userManager.getCurrentUser();
      if (userInfo && userInfo.openid) {
        requestData.openid = userInfo.openid;
      }
    }
    
    return request({
      url: `${API.PREFIX.AGENT}/search`,
      method: 'POST',
      data: requestData
    });
  },

  /**
   * 获取服务状态
   * @returns {Promise} - 请求Promise
   */
  getStatus: () => {
    return request({
      url: `${API.PREFIX.AGENT}/status`,
      method: 'GET'
    });
  },
  
  /**
   * 获取智能体会话历史
   * @param {Object} params - 查询参数
   * @param {string} [params.openid] - 用户openid，不传则使用当前登录用户
   * @param {number} [params.limit=20] - 返回数量限制
   * @param {number} [params.offset=0] - 结果偏移量
   * @returns {Promise} - 请求Promise
   */
  getHistory: (params = {}) => {
    // 如果没有openid，尝试获取当前用户
    if (!params.openid) {
      const userInfo = userManager.getCurrentUser();
      if (userInfo && userInfo.openid) {
        params.openid = userInfo.openid;
      }
    }
    
    return request({
      url: `${API.PREFIX.AGENT}/history`,
      method: 'GET',
      params: params
    });
  },
  
  /**
   * 创建知识条目
   * @param {Object} data - 知识条目数据
   * @param {string} data.title - 标题
   * @param {string} data.content - 内容
   * @param {Array} [data.tags] - 标签
   * @param {string} [data.source] - 来源
   * @param {string} [data.openid] - 用户openid，不传则使用当前登录用户
   * @returns {Promise} - 请求Promise
   */
  createKnowledge: (data) => {
    if (!data.title || !data.content) {
      return Promise.reject(new Error('缺少必要参数: title或content'));
    }
    
    // 如果没有openid，尝试获取当前用户
    if (!data.openid) {
      const userInfo = userManager.getCurrentUser();
      if (userInfo && userInfo.openid) {
        data.openid = userInfo.openid;
      }
    }
    
    return request({
      url: `${API.PREFIX.AGENT}/knowledge`,
      method: 'POST',
      data: data
    });
  },
  
  /**
   * 上传文件到知识库
   * @param {Object} params - 上传参数
   * @param {string} params.filePath - 本地文件路径
   * @param {string} [params.title] - 文件标题，不传则使用文件名
   * @param {Array} [params.tags] - 标签
   * @param {string} [params.openid] - 用户openid，不传则使用当前登录用户
   * @returns {Promise} - 请求Promise
   */
  uploadFile: (params) => {
    return new Promise((resolve, reject) => {
      if (!params.filePath) {
        reject(new Error('缺少必要参数: filePath'));
        return;
      }
      
      // 如果没有openid，尝试获取当前用户
      let openid = params.openid;
      if (!openid) {
        const userInfo = userManager.getCurrentUser();
        if (userInfo && userInfo.openid) {
          openid = userInfo.openid;
        }
      }
      
      // 获取文件名
      const fileName = params.filePath.split('/').pop();
      const title = params.title || fileName;
      
      // 准备表单数据
      const formData = {
        title: title,
        tags: params.tags ? JSON.stringify(params.tags) : '[]',
        openid: openid || ''
      };
      
      wx.uploadFile({
        url: API.BASE_URL + `${API.PREFIX.AGENT}/upload`,
        filePath: params.filePath,
        name: 'file',
        formData: formData,
        success: (res) => {
          try {
            // 微信uploadFile返回的数据是字符串，需要解析
            if (typeof res.data === 'string') {
              const data = JSON.parse(res.data);
              resolve(data);
            } else {
              resolve(res.data);
            }
          } catch (error) {
            logger.error('解析上传响应失败:', error);
            reject(error);
          }
        },
        fail: (error) => {
          logger.error('上传文件失败:', error);
          reject(error);
        }
      });
    });
  },
  
  /**
   * 检索增强生成 (RAG)
   * @param {Object} params - RAG参数
   * @param {string} params.query - 用户查询问题
   * @param {Array} [params.tables=["wxapp_posts"]] - 要检索的表名列表
   * @param {number} [params.max_results=5] - 每个表返回的最大结果数
   * @param {boolean} [params.stream=false] - 是否流式返回
   * @param {string} [params.format="markdown"] - 返回格式
   * @param {string} [params.openid] - 用户openid，不传则使用当前登录用户
   * @param {string} [params.rewrite_bot_id] - 重写机器人ID，可选
   * @param {string} [params.knowledge_bot_id] - 知识机器人ID，可选
   * @returns {Promise} - 请求Promise
   */
  rag: (params) => {
    // 参数类型检查
    if (typeof params === 'string') {
      // 简化调用方式: rag(query)
      params = { query: params };
    } else if (!params || typeof params !== 'object') {
      return Promise.reject(new Error('无效的参数'));
    }
    
    // 检查必要参数
    if (!params.query) {
      return Promise.reject(new Error('缺少必要参数: query'));
    }
    
    // 添加openid
    if (!params.openid) {
      const userInfo = userManager.getCurrentUser();
      if (userInfo && userInfo.openid) {
        params.openid = userInfo.openid;
      }
    }
    
    // 设置默认值
    if (!params.tables) {
      params.tables = ["wxapp_posts"];
    }
    
    // 发送请求
    return request({
      url: `${API.PREFIX.AGENT}/rag`,
      method: 'POST',
      data: params
    });
  }
};

module.exports = agentAPI; 