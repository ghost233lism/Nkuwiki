// API索引文件，汇总导出所有API

const { API, logger } = require('./core');
const userAPI = require('./user');
const postAPI = require('./post');
const commentAPI = require('./comment');
const searchAPI = require('./search');
const notificationAPI = require('./notification');
const feedbackAPI = require('./feedback');
const agentAPI = require('./agent');

// 工具函数
const processAvatarUrl = (url) => {
  // 如果已经是完整URL或以/开头的资源路径，直接返回
  if (!url || url.startsWith('http') || url.startsWith('/')) {
    return url || '/assets/icons/default-avatar.png';
  }
  
  // 否则，添加云存储前缀
  return url;
};

// 导出所有API
module.exports = {
  API,           // API配置
  logger,        // 日志工具
  userAPI,       // 用户API
  postAPI,       // 帖子API
  commentAPI,    // 评论API
  searchAPI,     // 搜索API
  notificationAPI, // 通知API
  feedbackAPI,   // 反馈API
  agentAPI,      // 智能体API
  processAvatarUrl // 头像处理函数
}; 