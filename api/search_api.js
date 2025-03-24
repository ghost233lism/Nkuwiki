/**
 * 搜索API模块
 * 
 * 提供文档搜索、索引和相关功能
 */

const { API, logger, request } = require('../utils/api/core');
const userManager = require('../utils/user_manager');

/**
 * 搜索API模块
 */
const searchAPI = {
  /**
   * 为文档建立索引
   * @param {Object} params - 索引参数
   * @param {string} params.file_id - 微信云存储的文件ID
   * @param {string} params.file_name - 文件名称
   * @param {string} [params.openid] - 用户openid，不传则使用当前登录用户
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
    
    // 如果没有openid，尝试获取当前用户
    if (!params.openid) {
      const userInfo = userManager.getCurrentUser();
      params.openid = userInfo ? userInfo.openid : '';
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
  },
  
  /**
   * 搜索文档
   * @param {Object} params - 搜索参数
   * @param {string} params.query - 搜索关键词
   * @param {number} [params.limit=10] - 返回结果数量限制
   * @param {number} [params.offset=0] - 结果偏移量
   * @param {Object} [params.filters] - 搜索过滤条件
   * @returns {Promise<Object>} - 搜索结果
   */
  search: (params = {}) => {
    // 确保必要参数存在
    if (!params.query) {
      logger.error('搜索文档缺少必要参数: query');
      return Promise.reject(new Error('缺少必要参数: query'));
    }
    
    // 准备请求数据
    const requestData = {
      query: params.query,
      limit: params.limit || 10,
      offset: params.offset || 0
    };
    
    // 如果有过滤条件，添加到请求中
    if (params.filters) {
      requestData.filters = params.filters;
    }
    
    logger.debug('开始搜索文档:', requestData);
    
    // 发送搜索请求
    return request({
      url: `${API.PREFIX.WXAPP}/search`,
      method: 'POST',
      data: requestData
    });
  },
  
  /**
   * 搜索帖子
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 搜索关键词
   * @param {number} [params.page=1] - 页码
   * @param {number} [params.page_size=10] - 每页结果数
   * @param {string} [params.sort_by="relevance"] - 排序方式
   * @param {number} [params.status=1] - 帖子状态
   * @param {boolean} [params.include_deleted=false] - 是否包含已删除帖子
   * @returns {Promise<Object>} - 搜索结果
   */
  searchPosts: (params = {}) => {
    // 确保必要参数存在
    if (!params.keyword) {
      logger.error('搜索帖子缺少必要参数: keyword');
      return Promise.reject(new Error('缺少必要参数: keyword'));
    }
    
    logger.debug('开始搜索帖子:', params);
    
    return request({
      url: `${API.PREFIX.WXAPP}/search/posts`,
      method: 'GET',
      params: params
    });
  },
  
  /**
   * 搜索评论
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 搜索关键词
   * @param {number} [params.page=1] - 页码
   * @param {number} [params.page_size=10] - 每页结果数
   * @returns {Promise<Object>} - 搜索结果
   */
  searchComments: (params = {}) => {
    // 确保必要参数存在
    if (!params.keyword) {
      logger.error('搜索评论缺少必要参数: keyword');
      return Promise.reject(new Error('缺少必要参数: keyword'));
    }
    
    logger.debug('开始搜索评论:', params);
    
    return request({
      url: `${API.PREFIX.WXAPP}/search/comments`,
      method: 'GET',
      params: params
    });
  },
  
  /**
   * 搜索用户
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 搜索关键词
   * @param {number} [params.page=1] - 页码
   * @param {number} [params.page_size=10] - 每页结果数
   * @returns {Promise<Object>} - 搜索结果
   */
  searchUsers: (params = {}) => {
    // 确保必要参数存在
    if (!params.keyword) {
      logger.error('搜索用户缺少必要参数: keyword');
      return Promise.reject(new Error('缺少必要参数: keyword'));
    }
    
    logger.debug('开始搜索用户:', params);
    
    return request({
      url: `${API.PREFIX.WXAPP}/search/users`,
      method: 'GET',
      params: params
    });
  }
};

module.exports = searchAPI;