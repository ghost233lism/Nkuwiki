// about.js
// 关于我们相关API

const { API, logger, request } = require('./core');

const aboutAPI = {
  /**
   * 获取平台信息
   * @returns {Promise<Object>} 平台信息
   */
  getPlatformInfo: async () => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/about`,
        method: 'GET'
      });
      
      if (res && res.data) {
        return res.data;
      }
      
      return res || {};
    } catch (error) {
      logger.error('获取平台信息失败:', error);
      return { error: error.message };
    }
  },
  
  /**
   * 获取版本更新历史
   * @param {number} limit 限制返回数量
   * @returns {Promise<Object>} 版本更新历史
   */
  getVersionHistory: async (limit = 10) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/versions`,
        method: 'GET',
        data: { limit }
      });
      
      if (res && res.data) {
        return res.data;
      }
      
      return res || { versions: [] };
    } catch (error) {
      logger.error('获取版本历史失败:', error);
      return { versions: [], error: error.message };
    }
  },
  
  /**
   * 获取用户协议或隐私政策
   * @param {string} type 协议类型：user-用户协议, privacy-隐私政策
   * @returns {Promise<Object>} 协议内容
   */
  getAgreement: async (type) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/agreement/${type}`,
        method: 'GET'
      });
      
      if (res && res.data) {
        return res.data;
      }
      
      return res || { content: '' };
    } catch (error) {
      logger.error(`获取${type}协议失败:`, error);
      return { content: '', error: error.message };
    }
  }
};

module.exports = aboutAPI; 