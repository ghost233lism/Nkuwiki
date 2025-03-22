// index.js
// 统一导出所有API模块

// 导入核心模块
const { API, logger, request, processAvatarUrl } = require('./core');

// 导入各个API模块
const userAPI = require('./user');
const postAPI = require('./post');
const commentAPI = require('./comment');
const agentAPI = require('./agent');
const mysqlAPI = require('./mysql');
const notificationAPI = require('./notification');
const feedbackAPI = require('./feedback');
const aboutAPI = require('./about');

// 统一导出所有模块
module.exports = {
  // 基础请求函数和工具
  API,
  logger,
  request,
  processAvatarUrl,
  
  // 各功能模块API
  userAPI,
  postAPI,
  commentAPI,
  agentAPI,
  mysqlAPI,
  notificationAPI,
  feedbackAPI,
  aboutAPI
}; 