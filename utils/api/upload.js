/**
 * 统一上传功能封装
 * 合并原upload.js和uploadHelper.js功能
 */

const { post, get, API_PREFIXES } = require('../request');
const { getStorage } = require('../util');

// 核心上传方法
const core = {
  /**
   * 选择媒体文件
   * @param {Object} options - 配置项 {count, type, source}
   * @returns {Promise<Array>} 临时文件路径数组
   */
  choose: (options = {}) => new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: options.count || 9,
      mediaType: [options.type === 'video' ? 'video' : 'image'],
      sourceType: options.source || ['album', 'camera'],
      sizeType: ['original', 'compressed'],
      success: res => resolve(res.tempFiles.map(f => f.tempFilePath)),
      fail: reject
    });
  }),

  /**
   * 服务器上传（带token验证）
   * @param {string} filePath 临时路径
   * @param {string} type 文件类型
   * @returns {Promise<{url: string}>}
   */
  serverUpload: async (filePath, type = 'image') => {
    const openid = getStorage('openid');
    if (!openid) throw new Error('USER_NOT_LOGIN');

    // 获取上传token
    const tokenRes = await get(API_PREFIXES.wxapp + '/upload/token');
    if (!tokenRes.success) throw new Error('GET_TOKEN_FAIL');

    // 执行上传
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${API_BASE_URL}/api${buildApiPath(WXAPP_PREFIX, '/upload')}`,
        filePath,
        name: 'file',
        formData: { type, token: tokenRes.data.token },
        header: { 'X-User-OpenID': openid },
        success: res => {
          try {
            const data = JSON.parse(res.data);
            data.success ? resolve(data) : reject(data);
          } catch(e) {
            reject(new Error('INVALID_JSON_RESPONSE'));
          }
        },
        fail: err => reject(new Error(`UPLOAD_FAIL: ${err.errMsg}`))
      });
    });
  },

  /**
   * 云存储直传（优化版）
   * @param {string} filePath 临时路径
   * @param {string} cloudPath 云路径
   * @returns {Promise<{fileID: string}>}
   */
  cloudUpload: (filePath, cloudPath) => new Promise((resolve, reject) => {
    const extMatch = filePath.match(/\.([^\.]+)$/);
    const ext = extMatch ? extMatch[1] : 'jpg';
    const finalCloudPath = cloudPath || `direct_upload/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    
    wx.cloud.uploadFile({
      cloudPath: finalCloudPath,
      filePath,
      success: res => resolve({ 
        fileID: res.fileID, 
        cloudPath: finalCloudPath,
        url: `https://${res.fileID}.tcb.qcloud.la/${finalCloudPath}`
      }),
      fail: err => reject(new Error(`云上传失败: ${err.errMsg}`))
    });
  }),
};

// 高级封装方法
const uploader = {
  // 选择并上传（类型自动判断）
  chooseAndUpload: async (options = {}) => {
    const paths = await core.choose(options);
    return this.server.batch(paths, options.type);
  },

  // 服务器上传相关
  server: {
    single: (path, type) => core.serverUpload(path, type),
    batch: (paths, type) => Promise.all(paths.map(p => core.serverUpload(p, type))),
    getToken: () => get(buildApiPath('wxapp', '/upload/token'))
  },

  // 添加云存储上传方式
  cloud: {
    single: core.cloudUpload,
    batch: (paths) => Promise.all(paths.map(p => core.cloudUpload(p)))
  },
};

module.exports = {
  uploader
}; 