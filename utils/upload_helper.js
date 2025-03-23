/**
 * 统一的文件上传工具函数
 * 
 * 提供统一的图片/文件上传、压缩等功能
 */

const { API, logger, request } = require('./api/core');

/**
 * 检查云开发环境是否已初始化
 * @returns {Boolean} 云开发是否可用
 */
function checkCloudEnv() {
  if (!wx.cloud) {
    logger.error('云开发SDK未找到，请确认是否在app.js中初始化云开发');
    return false;
  }
  
  try {
    // 尝试获取云环境信息
    const env = wx.cloud.DYNAMIC_CURRENT_ENV || wx.cloud.env || null;
    if (!env) {
      logger.warn('未检测到有效的云环境配置');
      // 获取app实例，尝试从全局配置获取环境ID
      try {
        const app = getApp();
        if (app && app.globalData && app.globalData.cloudEnvId) {
          logger.debug('从全局配置获取到云环境ID:', app.globalData.cloudEnvId);
          return true;
        }
      } catch (e) {
        logger.error('获取App实例失败:', e);
      }
      return false;
    }
    logger.debug('检测到有效的云环境配置:', env);
    return true;
  } catch (error) {
    logger.error('检查云环境时发生错误:', error);
    return false;
  }
}

/**
 * 使用HTTP API上传图片到服务器
 * @param {String} filePath 图片本地路径
 * @param {String} module 模块名称
 * @param {String} openid 用户openid
 * @returns {Promise<String>} 返回服务器上的文件URL
 */
async function uploadViaHttpApi(filePath, module, openid = 'anonymous') {
  return new Promise((resolve, reject) => {
    logger.debug(`开始通过HTTP API上传图片: ${filePath}`);
    
    // 获取用户登录态
    const token = wx.getStorageSync('token');
    if (!token) {
      reject(new Error('用户未登录，无法上传文件'));
      return;
    }
    
    wx.uploadFile({
      url: `${API.BASE_URL}${API.PREFIX.WXAPP}/upload/${module}`,
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': `Bearer ${token}`
      },
      formData: {
        'openid': openid,
        'module': module
      },
      success: function(res) {
        try {
          // 尝试解析服务器返回的JSON
          let result;
          if (typeof res.data === 'string') {
            result = JSON.parse(res.data);
          } else {
            result = res.data;
          }
          
          // 检查状态码
          if (res.statusCode !== 200) {
            logger.error(`上传图片失败，状态码: ${res.statusCode}`, result);
            reject(new Error(result.message || '上传失败'));
            return;
          }
          
          // 检查API返回
          if (result.code === 200) {
            const fileUrl = result.data && result.data.url;
            if (!fileUrl) {
              reject(new Error('服务器未返回文件URL'));
              return;
            }
            
            logger.debug(`HTTP API上传图片成功: ${fileUrl}`);
            resolve(fileUrl);
          } else {
            logger.error('API返回错误:', result);
            reject(new Error(result.message || '上传失败'));
          }
        } catch (error) {
          logger.error('解析上传响应失败:', error, res.data);
          reject(error);
        }
      },
      fail: function(err) {
        logger.error('HTTP API上传图片失败:', err);
        reject(err);
      }
    });
  });
}

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
      // 输入检查
      if (!filePath) {
        logger.error('上传图片失败: 文件路径为空');
        throw new Error('文件路径不能为空');
      }
      
      if (!module) {
        module = 'images'; // 设置默认模块
      }
      
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
      
      // 检查是否可以使用云开发
      const cloudAvailable = checkCloudEnv();
      
      if (!cloudAvailable) {
        const errorMsg = '云开发环境未初始化，无法上传文件';
        logger.error(errorMsg);
        throw new Error(errorMsg);
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
            logger.error('云存储上传失败:', err);
            reject(new Error(`云存储上传失败: ${err.errMsg || JSON.stringify(err)}`));
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
          
          try {
            // 创建离屏Canvas进行压缩
            const canvas = wx.createOffscreenCanvas({ type: '2d', width: canvasWidth, height: canvasHeight });
            const ctx = canvas.getContext('2d');
            
            // 创建图片对象
            const img = canvas.createImage();
            img.onload = () => {
              try {
                // 绘制图片到Canvas
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                
                // 离屏Canvas应该使用toDataURL获取base64数据
                // 然后转为临时文件
                const base64 = canvas.toDataURL(`image/jpeg`, quality / 100);
                
                // 将base64转为临时文件
                const fsm = wx.getFileSystemManager();
                const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_${Date.now()}.jpg`;
                
                fsm.writeFile({
                  filePath: tempFilePath,
                  data: base64.replace(/^data:image\/\w+;base64,/, ''),
                  encoding: 'base64',
                  success: () => {
                    resolve(tempFilePath);
                  },
                  fail: err => {
                    logger.error('写入临时文件失败:', err);
                    // 失败时直接返回原图
                    resolve(filePath);
                  }
                });
              } catch (error) {
                logger.error('处理压缩图像数据失败:', error);
                // 错误时返回原图
                resolve(filePath);
              }
            };
            img.onerror = (err) => {
              logger.error('图片加载失败:', err);
              // 错误时返回原图
              resolve(filePath);
            };
            img.src = filePath;
          } catch (error) {
            logger.error('创建离屏Canvas失败，返回原图:', error);
            resolve(filePath);
          }
        },
        fail: err => {
          logger.error('获取图片信息失败:', err);
          // 错误时返回原图
          resolve(filePath);
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
        // 检查云环境是否可用
        if (!checkCloudEnv()) {
          reject(new Error('云开发环境未初始化，无法上传文件'));
          return;
        }
        
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
            reject(new Error(`文件上传失败: ${err.errMsg || JSON.stringify(err)}`));
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
      
      // 检查云环境是否可用
      if (!checkCloudEnv()) {
        reject(new Error('云开发环境未初始化，无法删除文件'));
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
    
    // 检查云环境是否可用
    if (!checkCloudEnv()) {
      throw new Error('云开发环境未初始化，无法删除文件');
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