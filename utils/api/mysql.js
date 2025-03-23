// mysql.js
// MySQL数据库相关API

const { API, logger, request } = require('./core');

const mysqlAPI = {
  /**
   * 自定义SQL查询
   * @param {string} query - SQL查询语句
   * @param {Array} params - 查询参数
   * @param {boolean} fetch - 是否获取结果
   * @returns {Promise} - 请求Promise
   */
  customQuery: (query, params = [], fetch = true) => {
    return request({
      url: `${API.PREFIX.MYSQL}/custom_query`,
      method: 'POST',
      data: { query, params, fetch }
    });
  },
  
  /**
   * 查询数据
   * @param {string} tableName - 表名
   * @param {Object} conditions - 查询条件
   * @param {string} orderBy - 排序字段
   * @param {number} limit - 返回数量限制
   * @param {number} offset - 分页偏移量
   * @returns {Promise} - 请求Promise
   */
  query: (tableName, conditions = {}, orderBy = '', limit = 100, offset = 0) => {
    return request({
      url: `${API.PREFIX.MYSQL}/query`,
      method: 'POST',
      data: {
        table_name: tableName,
        conditions,
        order_by: orderBy,
        limit,
        offset
      }
    });
  },

  /**
   * 统计记录数量
   * @param {string} tableName - 表名
   * @param {Object} conditions - 统计条件
   * @returns {Promise} - 请求Promise
   */
  count: (tableName, conditions = {}) => {
    return request({
      url: `${API.PREFIX.MYSQL}/count`,
      method: 'POST',
      data: {
        table_name: tableName,
        conditions
      }
    });
  },

  /**
   * 获取所有表列表
   * @param {string} database - 数据库名称，默认为当前数据库
   * @returns {Promise} - 请求Promise
   */
  getTables: (database = '') => {
    return request({
      url: `${API.PREFIX.MYSQL}/tables`,
      method: 'GET',
      params: database ? { database } : {}
    });
  },

  /**
   * 获取表结构
   * @param {string} tableName - 表名
   * @returns {Promise} - 请求Promise 
   */
  getTableStructure: (tableName) => {
    return request({
      url: `${API.PREFIX.MYSQL}/table/${tableName}/structure`,
      method: 'GET'
    });
  }
};

module.exports = mysqlAPI; 