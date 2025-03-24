// feedback.js
// 意见反馈相关API

const { API, logger, request } = require('./core');
const userManager = require('../../utils/user_manager');

const feedbackAPI = {
  /**
   * 提交意见反馈
   * @param {Object} feedbackData 反馈数据
   * @returns {Promise<Object>} 提交结果
   */
  submitFeedback: (feedbackData) => {
    // 提取openid到查询参数
    let openid = '';
    if (feedbackData.openid) {
      openid = feedbackData.openid;
      delete feedbackData.openid; // 从请求体中移除
    } else {
      const userInfo = userManager.getCurrentUser();
      if (userInfo && userInfo.openid) {
        openid = userInfo.openid;
      }
    }
    
    if (!openid) {
      logger.error('submitFeedback: 缺少必需的openid参数');
      return Promise.reject(new Error('缺少必需的openid参数'));
    }
    
    // 确保发送正确的字段
    const safeFeedbackData = {
      content: feedbackData.content,
      type: feedbackData.type || 'suggestion',
      contact: feedbackData.contact || '',
      images: feedbackData.images || []
    };
    
    // 设备信息，可以是字符串或对象
    if (feedbackData.device_info) {
      if (typeof feedbackData.device_info === 'string') {
        safeFeedbackData.device_info = feedbackData.device_info;
      } else if (typeof feedbackData.device_info === 'object') {
        // 确保设备信息包含必要字段
        safeFeedbackData.device_info = {
          model: feedbackData.device_info.model || '',
          system: feedbackData.device_info.system || '',
          platform: feedbackData.device_info.platform || ''
        };
      }
    } else {
      // 如果未提供，尝试获取当前设备信息
      try {
        const systemInfo = wx.getSystemInfoSync();
        safeFeedbackData.device_info = {
          model: systemInfo.model || '',
          system: systemInfo.system || '',
          platform: systemInfo.platform || ''
        };
      } catch (error) {
        logger.error('获取设备信息失败:', error);
        safeFeedbackData.device_info = {};
      }
    }
    
    // 额外信息
    if (feedbackData.extra) {
      safeFeedbackData.extra = feedbackData.extra;
    }
    
    logger.debug('提交反馈数据:', JSON.stringify(safeFeedbackData));
    logger.debug('查询参数 openid:', openid);
    
    return request({
      url: `${API.PREFIX.WXAPP}/feedback`,
      method: 'POST',
      data: safeFeedbackData,
      params: { openid } // 将openid添加到查询参数
    });
  },
  
  /**
   * 获取用户的反馈列表
   * @param {string} openid 用户openid
   * @param {Object} params 查询参数
   * @returns {Promise<Object>} 反馈列表
   */
  getUserFeedback: (openid, params = {}) => {
    if (!openid) {
      const userInfo = userManager.getCurrentUser();
      openid = userInfo.openid;
    }
    
    return request({
      url: `${API.PREFIX.WXAPP}/users/${openid}/feedback`,
      method: 'GET',
      params
    });
  },
  
  /**
   * 获取反馈详情
   * @param {number} feedbackId 反馈ID
   * @returns {Promise<Object>} 反馈详情
   */
  getFeedbackDetail: (feedbackId) => {
    return request({
      url: `${API.PREFIX.WXAPP}/feedback/${feedbackId}`,
      method: 'GET'
    });
  },

  /**
   * 更新反馈
   * @param {number} feedbackId 反馈ID
   * @param {Object} feedbackData 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  updateFeedback: (feedbackId, feedbackData) => {
    // 获取当前用户openid
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('updateFeedback: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }
    
    const openid = userInfo.openid;
    
    // 确保只更新允许的字段
    const allowedFields = ['content', 'status', 'admin_reply', 'extra'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (feedbackData[field] !== undefined) {
        updateData[field] = feedbackData[field];
      }
    });

    return request({
      url: `${API.PREFIX.WXAPP}/feedback/${feedbackId}`,
      method: 'PUT',
      data: updateData,
      params: { openid } // 添加openid作为查询参数
    });
  },

  /**
   * 删除反馈
   * @param {number} feedbackId 反馈ID
   * @returns {Promise<Object>} 操作结果
   */
  deleteFeedback: (feedbackId) => {
    // 获取当前用户openid
    const userInfo = userManager.getCurrentUser();
    if (!userInfo || !userInfo.openid) {
      logger.error('deleteFeedback: 用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }
    
    const openid = userInfo.openid;
    
    return request({
      url: `${API.PREFIX.WXAPP}/feedback/${feedbackId}`,
      method: 'DELETE',
      params: { openid } // 添加openid作为查询参数
    });
  }
};

module.exports = feedbackAPI; 