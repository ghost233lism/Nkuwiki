// search.js
// 搜索相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

const searchAPI = {
  /**
   * 通用搜索
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 搜索关键词
   * @param {string} [params.type='all'] - 搜索类型：all-全部, post-帖子, comment-评论, user-用户
   * @param {number} [params.limit=20] - 返回结果数量限制
   * @param {number} [params.offset=0] - 结果偏移量
   * @returns {Promise<Object>} - 搜索结果
   */
  search: (params = {}) => {
    // 确保必要参数存在
    if (typeof params === 'string') {
      params = { keyword: params };
    }
    
    // 兼容query和keyword参数
    const keyword = params.keyword || params.query;
    if (!keyword) {
      logger.error('搜索缺少必要参数: keyword');
      return Promise.reject(new Error('缺少必要参数: keyword'));
    }
    
    // 准备请求参数
    const requestParams = {
      keyword: keyword,
      limit: params.limit || 20,
      offset: params.offset || 0
    };
    
    // 如果有类型参数，添加到请求中
    if (params.type && params.type !== 'all') {
      requestParams.type = params.type;
    }
    
    logger.debug('开始搜索:', requestParams);
    
    // 发送搜索请求
    return request({
      url: `${API.PREFIX.WXAPP}/search`,
      method: 'GET',
      data: requestParams
    }).then(res => {
      logger.debug('搜索结果:', res);
      
      // 标准化响应格式
      if (res.code === 200 && res.data) {
        return res;
      } else if (res.results) {
        // 旧版API兼容
        return {
          code: 200,
          message: 'success',
          data: {
            results: res.results,
            keyword: keyword,
            total: res.total || res.results.length,
            type: params.type || 'all'
          }
        };
      } else {
        return res;
      }
    }).catch(err => {
      logger.error('搜索失败:', err);
      return {
        code: err.code || 500,
        message: err.message || '搜索失败',
        data: {
          results: [],
          keyword: keyword,
          total: 0,
          type: params.type || 'all'
        }
      };
    });
  },
  
  /**
   * 搜索帖子
   * @param {string|Object} keyword - 搜索关键词或参数对象
   * @param {Object} [options] - 可选参数
   * @returns {Promise<Object>} - 搜索结果
   */
  searchPosts: (keyword, options = {}) => {
    // 处理参数格式
    let params = typeof keyword === 'string' ? { keyword } : keyword;
    params = { ...params, ...options, type: 'post' };
    
    return searchAPI.search(params);
  },
  
  /**
   * 搜索评论
   * @param {string|Object} keyword - 搜索关键词或参数对象
   * @param {Object} [options] - 可选参数
   * @returns {Promise<Object>} - 搜索结果
   */
  searchComments: (keyword, options = {}) => {
    // 处理参数格式
    let params = typeof keyword === 'string' ? { keyword } : keyword;
    params = { ...params, ...options, type: 'comment' };
    
    return searchAPI.search(params);
  },
  
  /**
   * 搜索用户
   * @param {string|Object} keyword - 搜索关键词或参数对象
   * @param {Object} [options] - 可选参数
   * @returns {Promise<Object>} - 搜索结果
   */
  searchUsers: (keyword, options = {}) => {
    // 处理参数格式
    let params = typeof keyword === 'string' ? { keyword } : keyword;
    params = { ...params, ...options, type: 'user' };
    
    return searchAPI.search(params);
  },
  
  /**
   * 为文档建立索引
   * @param {Object} params - 索引参数
   * @param {string} params.file_id - 微信云存储的文件ID
   * @param {string} params.file_name - 文件名称
   * @param {string} params.openid - 用户openid
   * @param {Object} [params.custom_metadata] - 自定义元数据
   * @returns {Promise<Object>} - 索引结果
   */
  indexDocument: (params = {}) => {
    // 确保必要参数存在
    if (!params.file_id) {
      logger.error('索引文档缺少必要参数: file_id');
      return Promise.reject(new Error('缺少必要参数: file_id'));
    }
    
    if (!params.file_name) {
      logger.error('索引文档缺少必要参数: file_name');
      return Promise.reject(new Error('缺少必要参数: file_name'));
    }
    
    if (!params.openid) {
      logger.error('索引文档缺少必要参数: openid');
      return Promise.reject(new Error('缺少必要参数: openid'));
    }
    
    // 准备请求数据
    const requestData = {
      file_id: params.file_id,
      file_name: params.file_name,
      openid: params.openid
    };
    
    // 如果有自定义元数据，添加到请求中
    if (params.custom_metadata) {
      requestData.custom_metadata = params.custom_metadata;
    }
    
    logger.debug('开始索引文档:', requestData);
    
    // 发送索引请求
    return request({
      url: `${API.PREFIX.WXAPP}/index-document`,
      method: 'POST',
      data: requestData
    });
  }
};

module.exports = searchAPI;