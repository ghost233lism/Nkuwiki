// feedback.js
// 意见反馈相关API

const { API, logger, request } = require('./core');

const feedbackAPI = {
  /**
   * 提交意见反馈
   * @param {Object} feedbackData 反馈数据
   * @returns {Promise<Object>} 提交结果
   */
  submitFeedback: async (feedbackData) => {
    return request({
      url: `${API.PREFIX.WXAPP}/feedback`,
      method: 'POST',
      data: feedbackData
    });
  },
  
  /**
   * 获取用户的反馈列表
   * @param {string} userId 用户ID
   * @param {Object} params 查询参数
   * @returns {Promise<Object>} 反馈列表
   */
  getUserFeedback: async (userId, params = {}) => {
    try {
      const res = await request({
        url: `${API.PREFIX.WXAPP}/users/${userId}/feedback`,
        method: 'GET',
        data: params
      });
      
      if (res && res.feedbacks) {
        return res;
      } else if (res && res.data && res.data.feedbacks) {
        return res.data;
      }
      
      logger.debug('获取反馈列表返回格式不符合预期:', res);
      return { feedbacks: [], total: 0 };
    } catch (error) {
      logger.error('获取用户反馈列表失败:', error);
      return { feedbacks: [], total: 0, error: error.message };
    }
  },
  
  /**
   * 获取反馈详情
   * @param {number} feedbackId 反馈ID
   * @returns {Promise<Object>} 反馈详情
   */
  getFeedbackDetail: async (feedbackId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/feedback/${feedbackId}`,
      method: 'GET'
    });
  }
};

module.exports = feedbackAPI; 