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
const processAvatarUrl = async (url) => {
  // 默认头像路径，使用本地资源
  const DEFAULT_AVATAR = '/assets/icons/default-avatar.png';
  
  if (!url) {
    return DEFAULT_AVATAR;
  }
  
  try {
    // 如果是云存储文件ID，获取临时访问链接
    if (url.startsWith('cloud://')) {
      try {
        const res = await wx.cloud.getTempFileURL({
          fileList: [url]
        });
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          return res.fileList[0].tempFileURL;
        }
      } catch (err) {
        console.error('获取云文件临时链接失败:', err);
        return DEFAULT_AVATAR;
      }
    }
    
    // 如果已经是完整URL，直接返回
    if (url.startsWith('http')) {
      return url;
    }
    
    // 如果是资源路径，直接返回
    if (url.startsWith('/')) {
      return url;
    }
    
    // 如果是相对路径但不带斜杠，加上斜杠
    if (url && !url.startsWith('/') && !url.includes('://')) {
      return '/' + url;
    }
    
    return url;
  } catch (error) {
    console.error('处理头像URL失败:', error);
    return DEFAULT_AVATAR;
  }
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