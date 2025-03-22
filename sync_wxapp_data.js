// sync_wxapp_data.js
// 微信小程序数据同步到南开Wiki后端

// 配置信息
const config = {
  // 南开Wiki服务器API地址
  apiUrl: 'https://api.nkuwiki.com/api/wxapp/export_data',
  // API密钥，需要与服务器端配置一致
  apiKey: 'your_secret_key',
  // 最大同步记录数
  maxRecords: 100,
  // 日志级别：debug, info, warn, error
  logLevel: 'info'
};

// 日志工具
const logger = {
  debug: (msg) => {
    if (config.logLevel === 'debug') {
      console.log(`[DEBUG] ${msg}`);
    }
  },
  info: (msg) => {
    if (['debug', 'info'].includes(config.logLevel)) {
      console.log(`[INFO] ${msg}`);
    }
  },
  warn: (msg) => {
    if (['debug', 'info', 'warn'].includes(config.logLevel)) {
      console.log(`[WARN] ${msg}`);
    }
  },
  error: (msg) => {
    console.log(`[ERROR] ${msg}`);
  }
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
    logger.error(`获取云数据库${collection}数据失败: ${error.message}`);
    return [];
  }
}

/**
 * 发送数据到南开Wiki服务器
 * @param {string} collection - 集合名称
 * @param {Array} data - 要发送的数据
 * @returns {Promise<Object>} - 服务器响应
 */
async function sendToServer(collection, data) {
  try {
    if (!data || !data.length) {
      logger.warn(`没有${collection}数据需要发送`);
      return { success: false, message: '没有数据' };
    }

    logger.info(`准备发送${data.length}条${collection}数据到服务器`);
    
    const response = await wx.request({
      url: config.apiUrl,
      method: 'POST',
      data: {
        collection: collection,
        api_key: config.apiKey,
        data: data
      },
      header: {
        'content-type': 'application/json'
      }
    });

    if (response.statusCode === 200 && response.data.success) {
      logger.info(`${collection}数据发送成功: ${response.data.message}`);
      return response.data;
    } else {
      logger.error(`${collection}数据发送失败: ${response.data.message || '未知错误'}`);
      return { success: false, message: response.data.message || '服务器响应错误' };
    }
  } catch (error) {
    logger.error(`发送${collection}数据时发生异常: ${error.message}`);
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
    return await sendToServer(collection, data);
  } catch (error) {
    logger.error(`同步${collection}集合失败: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * 同步所有数据
 * @returns {Promise<Object>} - 同步结果统计
 */
async function syncAllData() {
  logger.info('开始同步数据到南开Wiki服务器');
  
  const startTime = Date.now();
  const results = {
    posts: await syncCollection('posts'),
    users: await syncCollection('users'),
    stats: {
      totalSuccess: 0,
      totalFailed: 0
    }
  };
  
  // 统计成功和失败的数量
  Object.keys(results).forEach(key => {
    if (key !== 'stats' && results[key].success) {
      results.stats.totalSuccess++;
    } else if (key !== 'stats') {
      results.stats.totalFailed++;
    }
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`数据同步完成，耗时${duration}秒`);
  logger.info(`同步结果: 成功${results.stats.totalSuccess}，失败${results.stats.totalFailed}`);
  
  return results;
}

/**
 * 增量同步数据
 * @param {string} startTime - 开始时间，ISO8601格式
 * @returns {Promise<Object>} - 同步结果统计
 */
async function incrementalSync(startTime) {
  logger.info(`开始增量同步数据，起始时间: ${startTime}`);
  
  // 获取要增量同步的数据
  const db = wx.cloud.database();
  const _ = db.command;
  
  try {
    // 获取指定时间后的帖子数据
    const postsResult = await db.collection('posts')
      .where({
        createTime: _.gte(startTime)
      })
      .get();
    
    // 获取指定时间后的用户数据
    const usersResult = await db.collection('users')
      .where({
        createTime: _.gte(startTime)
      })
      .get();
    
    // 发送数据到服务器
    const results = {
      posts: await sendToServer('posts', postsResult.data),
      users: await sendToServer('users', usersResult.data),
      stats: {
        totalSuccess: 0,
        totalFailed: 0,
        totalRecords: postsResult.data.length + usersResult.data.length
      }
    };
    
    // 统计成功和失败的数量
    Object.keys(results).forEach(key => {
      if (key !== 'stats' && results[key].success) {
        results.stats.totalSuccess++;
      } else if (key !== 'stats') {
        results.stats.totalFailed++;
      }
    });
    
    logger.info(`增量同步完成，共同步${results.stats.totalRecords}条记录`);
    return results;
  } catch (error) {
    logger.error(`增量同步失败: ${error.message}`);
    return {
      success: false,
      message: error.message,
      stats: {
        totalSuccess: 0,
        totalFailed: 2,
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