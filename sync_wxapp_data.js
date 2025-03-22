// sync_wxapp_data.js
// 微信小程序数据同步到南开Wiki后端

// 引入API工具
const { request, logger } = require('./utils/api');

// 配置信息
const config = {
  // 最大同步记录数
  maxRecords: 100,
  // 同步的集合
  collections: ['posts', 'users', 'comments']
};

/**
 * 从云数据库获取数据
 * @param {string} collection - 集合名称
 * @param {number} limit - 限制记录数
 * @returns {Promise<Array>} - 查询结果
 */
async function getCloudData(collection, limit = config.maxRecords) {
  try {
    logger.debug(`正在从云数据库获取${collection}数据`);
    const db = wx.cloud.database();
    const result = await db.collection(collection)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();
    
    logger.debug(`已获取${result.data.length}条${collection}数据`);
    return result.data;
  } catch (error) {
    logger.error(`获取云数据库${collection}数据失败:`, error);
    return [];
  }
}

/**
 * 将云数据转换为API格式
 * @param {string} collection - 集合名称 
 * @param {Array} data - 云数据
 * @returns {Array} - 转换后的数据
 */
function transformData(collection, data) {
  if (!data || !data.length) return [];
  
  switch (collection) {
    case 'posts':
      return data.map(item => ({
        wxapp_id: item._id,
        user_id: item.authorId,
        author_name: item.authorName || '',
        author_avatar: item.authorAvatar || '',
        content: item.content || '',
        title: item.title || '',
        images: item.images || [],
        tags: item.tags || []
      }));
      
    case 'users':
      return data.map(item => ({
        wxapp_id: item._id,
        openid: item.openid || item._openid || '',
        unionid: item.unionid || '',
        nickname: item.nickName || '',
        avatar_url: item.avatarUrl || '',
        gender: item.gender || 0,
        country: item.country || '',
        province: item.province || '',
        city: item.city || '',
        language: item.language || ''
      }));
      
    case 'comments':
      return data.map(item => ({
        wxapp_id: item._id,
        post_id: item.postId,
        user_id: item.authorId,
        author_name: item.authorName || '',
        author_avatar: item.authorAvatar || '',
        content: item.content || '',
        images: item.images || []
      }));
      
    default:
      return [];
  }
}

/**
 * 发送数据到后端API
 * @param {string} collection - 集合名称
 * @param {Array} data - 要发送的数据
 * @returns {Promise<Object>} - 服务器响应
 */
async function sendToAPI(collection, data) {
  try {
    if (!data || !data.length) {
      logger.warn(`没有${collection}数据需要发送`);
      return { success: false, message: '没有数据' };
    }

    logger.info(`准备发送${data.length}条${collection}数据到服务器`);
    
    // 转换数据格式
    const transformedData = transformData(collection, data);
    
    if (!transformedData.length) {
      logger.warn(`${collection}数据转换后为空`);
      return { success: false, message: '数据转换失败' };
    }
    
    // 批量创建API请求
    const requests = [];
    
    switch (collection) {
      case 'posts':
        // 批量创建帖子
        for (const post of transformedData) {
          requests.push(request('/wxapp/posts', 'POST', post, {}, false));
        }
        break;
        
      case 'users':
        // 批量创建用户
        for (const user of transformedData) {
          requests.push(request('/wxapp/users', 'POST', user, {}, false));
        }
        break;
        
      case 'comments':
        // 批量创建评论
        for (const comment of transformedData) {
          requests.push(request('/wxapp/comments', 'POST', comment, {}, false));
        }
        break;
        
      default:
        return { success: false, message: '未知集合类型' };
    }
    
    // 批量发送请求
    logger.info(`开始批量发送${requests.length}个${collection}请求`);
    const results = await Promise.allSettled(requests);
    
    // 统计结果
    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`${collection}数据发送完成: 成功${fulfilled}条，失败${rejected}条`);
    
    return {
      success: fulfilled > 0,
      message: `成功${fulfilled}条，失败${rejected}条`,
      details: {
        total: transformedData.length,
        success: fulfilled,
        failed: rejected
      }
    };
  } catch (error) {
    logger.error(`发送${collection}数据时发生异常:`, error);
    return { success: false, message: error.message };
  }
}

/**
 * 同步单个集合数据
 * @param {string} collection - 集合名称
 * @returns {Promise<Object>} - 同步结果
 */
async function syncCollection(collection) {
  try {
    // 获取云数据库中的最新数据
    const data = await getCloudData(collection);
    
    // 发送数据到服务器
    return await sendToAPI(collection, data);
  } catch (error) {
    logger.error(`同步${collection}集合失败:`, error);
    return { success: false, message: error.message };
  }
}

/**
 * 同步所有数据
 * @returns {Promise<Object>} - 同步结果统计
 */
async function syncAllData() {
  logger.info('开始同步数据到南开Wiki服务器');
  
  wx.showLoading({
    title: '同步数据中...',
  });
  
  const startTime = Date.now();
  const results = {};
  
  // 同步所有集合
  for (const collection of config.collections) {
    results[collection] = await syncCollection(collection);
  }
  
  // 统计成功和失败的数量
  results.stats = {
    totalSuccess: Object.values(results).filter(r => r.success).length,
    totalFailed: Object.values(results).filter(r => !r.success).length
  };
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`数据同步完成，耗时${duration}秒`);
  logger.info(`同步结果: 成功${results.stats.totalSuccess}，失败${results.stats.totalFailed}`);
  
  wx.hideLoading();
  
  wx.showToast({
    title: `同步完成: ${results.stats.totalSuccess}/${config.collections.length}`,
    icon: 'success'
  });
  
  return results;
}

/**
 * 增量同步数据
 * @param {string} startTime - 开始时间，ISO8601格式
 * @returns {Promise<Object>} - 同步结果统计
 */
async function incrementalSync(startTime) {
  logger.info(`开始增量同步数据，起始时间: ${startTime}`);
  
  wx.showLoading({
    title: '增量同步中...',
  });
  
  // 获取要增量同步的数据
  const db = wx.cloud.database();
  const _ = db.command;
  const results = {};
  
  try {
    for (const collection of config.collections) {
      // 获取指定时间后的数据
      const dataResult = await db.collection(collection)
        .where({
          createTime: _.gte(startTime)
        })
        .get();
      
      // 发送数据到API
      results[collection] = await sendToAPI(collection, dataResult.data);
    }
    
    // 统计结果
    results.stats = {
      totalSuccess: Object.values(results).filter(r => r.success).length,
      totalFailed: Object.values(results).filter(r => !r.success).length,
      totalRecords: Object.values(results).reduce((acc, cur) => acc + (cur.details?.total || 0), 0)
    };
    
    logger.info(`增量同步完成，共同步${results.stats.totalRecords}条记录`);
    
    wx.hideLoading();
    
    wx.showToast({
      title: `同步${results.stats.totalRecords}条数据`,
      icon: 'success'
    });
    
    return results;
  } catch (error) {
    logger.error(`增量同步失败:`, error);
    
    wx.hideLoading();
    
    wx.showToast({
      title: '同步失败',
      icon: 'none'
    });
    
    return {
      success: false,
      message: error.message,
      stats: {
        totalSuccess: 0,
        totalFailed: config.collections.length,
        totalRecords: 0
      }
    };
  }
}

/**
 * 导出同步函数
 */
module.exports = {
  syncAllData,
  incrementalSync,
  syncCollection,
  getCloudData
}; 