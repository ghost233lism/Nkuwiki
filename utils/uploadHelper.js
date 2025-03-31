/**
 * 图片上传工具类
 */

/**
 * 选择图片
 * @param {Object} options - 选择图片配置
 * @returns {Promise<Array>} - 返回选择的图片临时路径数组
 */
function chooseImage(options = {}) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: options.count || 9,
      mediaType: ['image'],
      sourceType: options.sourceType || ['album', 'camera'],
      sizeType: options.sizeType || ['original', 'compressed'],
      success(res) {
        const tempFile = res.tempFiles;
        const tempPath = tempFile.map(file => file.tempFilePath);
        resolve(tempPath);
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

/**
 * 上传单张图片到云存储
 * @param {string} filePath - 图片临时路径
 * @param {string} type - 图片类型：post/comment/avatar
 * @returns {Promise<Object>} - 返回上传结果
 */
function uploadImage(filePath, type = 'common') {
  return new Promise((resolve, reject) => {
    wx.showLoading({
      title: '上传中...',
    });
    
    // 先将本地图片上传到云存储临时目录
    wx.cloud.uploadFile({
      cloudPath: `temp/${Date.now()}_${Math.random().toString(36).substring(2)}.${filePath.split('.').pop()}`,
      filePath: filePath,
      success: res => {
        // 然后调用云函数上传到正式目录
        wx.cloud.callFunction({
          name: 'uploadImage',
          data: {
            fileID: res.fileID,
            type: type
          },
          success: result => {
            wx.hideLoading();
            if (result.result.code === 0) {
              resolve(result.result.data);
            } else {
              reject(new Error(result.result.message || '上传失败'));
            }
          },
          fail: err => {
            wx.hideLoading();
            console.error('调用云函数失败:', err);
            reject(err);
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error('上传临时文件失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 批量上传图片
 * @param {Array} filePath - 图片临时路径数组
 * @param {string} type - 图片类型：post/comment/avatar
 * @returns {Promise<Array>} - 返回所有图片的上传结果
 */
function uploadImage(filePath, type = 'common') {
  if (!filePath || filePath.length === 0) {
    return Promise.resolve([]);
  }
  
  const uploadPromise = filePath.map(path => uploadImage(path, type));
  return Promise.all(uploadPromise);
}

/**
 * 选择并上传图片
 * @param {Object} options - 选择图片配置
 * @param {string} type - 图片类型：post/comment/avatar
 * @returns {Promise<Array>} - 返回上传结果数组
 */
function chooseAndUploadImage(options = {}, type = 'common') {
  return chooseImage(options)
    .then(path => uploadImage(path, type));
}

module.exports = {
  chooseImage,
  uploadImage,
  uploadImage,
  chooseAndUploadImage
}; 