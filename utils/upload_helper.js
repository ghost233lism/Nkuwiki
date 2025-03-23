/**
 * 统一的文件上传工具函数
 * 
 * 提供统一的图片/文件上传、压缩等功能
 */

const logger = require('./logger');
const { showToast } = require('./ui');

/**
 * 统一图片上传工具类
 * 提供图片压缩、批量上传和资源删除功能
 */
const uploadHelper = {
  /**
   * 上传单张图片
   * @param {String} filePath 图片本地路径
   * @param {String} module 模块名称（如avatars, posts, feedback等）
   * @param {String} openid 用户openid，用于权限隔离，匿名用户传anonymous
   * @param {Boolean} compress 是否需要压缩
   * @param {Number} quality 压缩质量(0-100)
   * @param {Number} maxWidth 最大宽度(px)
   * @returns {Promise<String>} 返回云文件ID
   */
  async uploadImage(filePath, module, openid = 'anonymous', compress = true, quality = 80, maxWidth = 800) {
    try {
      let path = filePath;
      
      // 如果需要压缩图片
      if (compress) {
        try {
          path = await this.compressImage(filePath, quality, maxWidth);
          logger.debug('图片压缩成功');
        } catch (error) {
          logger.error('图片压缩失败，使用原图上传', error);
          path = filePath;
        }
      }
      
      // 生成标准云存储路径
      // 格式：模块名/用户openid/时间戳_随机数.扩展名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extName = path.substring(path.lastIndexOf('.'));
      const cloudPath = `${module}/${openid}/${timestamp}_${randomStr}${extName}`;
      
      logger.debug(`开始上传图片到云存储: ${cloudPath}`);
      
      // 调用微信上传接口
      return new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: path,
          success: res => {
            const fileID = res.fileID;
            logger.debug(`图片上传成功: ${fileID}`);
            resolve(fileID);
          },
          fail: err => {
            logger.error('图片上传失败:', err);
            reject(err);
          }
        });
      });
    } catch (error) {
      logger.error('上传图片异常:', error);
      throw error;
    }
  },
  
  /**
   * 压缩图片
   * @param {String} filePath 图片路径
   * @param {Number} quality 压缩质量(0-100)
   * @param {Number} maxWidth 最大宽度(px)
   * @returns {Promise<String>} 压缩后的临时文件路径
   */
  compressImage(filePath, quality = 80, maxWidth = 800) {
    return new Promise((resolve, reject) => {
      // 获取图片信息
      wx.getImageInfo({
        src: filePath,
        success: info => {
          // 计算压缩比例
          let canvasWidth = info.width;
          let canvasHeight = info.height;
          
          if (canvasWidth > maxWidth) {
            const ratio = maxWidth / canvasWidth;
            canvasWidth = maxWidth;
            canvasHeight = Math.floor(canvasHeight * ratio);
          }
          
          // 创建离屏Canvas进行压缩
          const canvas = wx.createOffscreenCanvas({ type: '2d', width: canvasWidth, height: canvasHeight });
          const ctx = canvas.getContext('2d');
          
          // 创建图片对象
          const img = canvas.createImage();
          img.onload = () => {
            // 绘制图片到Canvas
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            
            // 导出为临时文件
            canvas.toTempFilePath({
              destWidth: canvasWidth,
              destHeight: canvasHeight,
              quality: quality / 100,
              success: res => {
                resolve(res.tempFilePath);
              },
              fail: err => {
                logger.error('图片压缩失败:', err);
                reject(err);
              }
            });
          };
          img.onerror = (err) => {
            logger.error('图片加载失败:', err);
            reject(err);
          };
          img.src = filePath;
        },
        fail: err => {
          logger.error('获取图片信息失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 批量上传图片
   * @param {Array<String>} filePaths 图片路径数组
   * @param {String} module 模块名称
   * @param {String} openid 用户openid
   * @param {Boolean} compress 是否压缩
   * @param {Number} quality 压缩质量
   * @returns {Promise<Array<String>>} 云文件ID数组
   */
  async batchUploadImages(filePaths, module, openid = 'anonymous', compress = true, quality = 80) {
    if (!filePaths || filePaths.length === 0) {
      return [];
    }
    
    try {
      const uploadPromises = filePaths.map(path => 
        this.uploadImage(path, module, openid, compress, quality)
      );
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('批量上传图片失败:', error);
      throw error;
    }
  },
  
  /**
   * 上传普通文件（不压缩）
   * @param {String} filePath 文件路径
   * @param {String} module 模块名称
   * @param {String} openid 用户openid
   * @param {Boolean} useOriginalName 是否使用原始文件名
   * @returns {Promise<String>} 云文件ID
   */
  uploadFile(filePath, module, openid = 'anonymous', useOriginalName = false) {
    return new Promise((resolve, reject) => {
      try {
        // 提取文件名
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        
        // 生成云存储路径
        let cloudPath;
        if (useOriginalName) {
          cloudPath = `${module}/${openid}/${fileName}`;
        } else {
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const extName = fileName.substring(fileName.lastIndexOf('.'));
          cloudPath = `${module}/${openid}/${timestamp}_${randomStr}${extName}`;
        }
        
        logger.debug(`开始上传文件到云存储: ${cloudPath}`);
        
        // 调用微信上传接口
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: filePath,
          success: res => {
            const fileID = res.fileID;
            logger.debug(`文件上传成功: ${fileID}`);
            resolve(fileID);
          },
          fail: err => {
            logger.error('文件上传失败:', err);
            reject(err);
          }
        });
      } catch (error) {
        logger.error('上传文件异常:', error);
        reject(error);
      }
    });
  },
  
  /**
   * 删除云存储资源
   * @param {String} fileID 云文件ID
   * @returns {Promise<Boolean>} 是否删除成功
   */
  deleteFile(fileID) {
    return new Promise((resolve, reject) => {
      if (!fileID) {
        resolve(true);
        return;
      }
      
      wx.cloud.deleteFile({
        fileList: [fileID],
        success: res => {
          const result = res.fileList[0];
          if (result.status === 0) {
            logger.debug(`文件删除成功: ${fileID}`);
            resolve(true);
          } else {
            logger.error(`文件删除失败: ${result.errMsg}`);
            resolve(false);
          }
        },
        fail: err => {
          logger.error('删除文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 批量删除云存储资源
   * @param {Array<String>} fileIDs 云文件ID数组
   * @returns {Promise<Boolean>} 是否全部删除成功
   */
  async batchDeleteFiles(fileIDs) {
    if (!fileIDs || fileIDs.length === 0) {
      return true;
    }
    
    return new Promise((resolve, reject) => {
      wx.cloud.deleteFile({
        fileList: fileIDs,
        success: res => {
          // 检查结果
          let allSuccess = true;
          const results = res.fileList || [];
          
          logger.debug(`批量删除结果: ${JSON.stringify(results)}`);
          
          for (let i = 0; i < results.length; i++) {
            if (results[i].status !== 0) {
              allSuccess = false;
              logger.error(`删除文件失败: ${results[i].fileID}, 错误: ${results[i].errMsg}`);
            }
          }
          
          resolve(allSuccess);
        },
        fail: err => {
          logger.error('批量删除文件失败:', err);
          reject(err);
        }
      });
    });
  }
};

module.exports = uploadHelper; 