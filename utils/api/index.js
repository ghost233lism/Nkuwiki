/**
 * API模块主入口
 * 将云函数功能迁移到客户端，避开云函数3秒超时限制
 * 
 * 通过该模块可以访问所有API子模块功能:
 * - user: 用户相关API（登录、用户信息更新等）
 * - post: 帖子相关API（获取帖子、点赞、收藏等）
 * - comment: 评论相关API
 * - upload: 上传相关API
 * - category: 分类和标签相关API
 * - agent: 智能体相关API
 * - notification: 通知相关API
 * - search: 搜索相关API
 */

// 导入子模块
const user = require('./user');
const post = require('./post');
const comment = require('./comment');
const upload = require('./upload');
const category = require('./category');
const agent = require('./agent');
const notification = require('./notification');
const search = require('./search');

// 导出所有API模块
module.exports = {
  user,     // 用户相关API
  post,     // 帖子相关API
  comment,  // 评论相关API
  upload,   // 上传相关API
  category, // 分类和标签相关API
  agent,    // 智能体相关API
  notification, // 通知相关API
  search    // 搜索相关API
}; 