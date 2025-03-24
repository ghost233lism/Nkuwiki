/**
 * 用户管理模块 - 统一管理用户信息获取和存储
 */

const { userAPI, logger } = require('./api/index')

// 存储位置枚举
const STORAGE_KEYS = {
  USER_INFO: '_cached_user_info',
  LATEST_USER_INFO: '_latest_user_info',
  TOKEN: '_auth_token'
};

// 获取app全局配置的base_url
function getBaseUrl() {
  try {
    const app = getApp();
    return (app && app.globalData && app.globalData.config && app.globalData.config.services && app.globalData.config.services.app) 
      ? app.globalData.config.services.app.base_url 
      : 'https://nkuwiki.com';
  } catch (e) {
    return 'https://nkuwiki.com';
  }
}

// 默认值
const DEFAULT_NAME = '游客';
// 获取动态默认头像URL
function getDefaultAvatar() {
  return getBaseUrl() + '/static/default-avatar.png';
}

// 存储用户信息的键名
const USER_INFO_KEY = 'userInfo'
const LOGIN_STATE_KEY = 'loginState'

// 缓存的用户信息
let cachedUserInfo = null
let loginState = false

// 初始化时尝试从缓存中加载用户信息
try {
  const userInfo = wx.getStorageSync(USER_INFO_KEY)
  const state = wx.getStorageSync(LOGIN_STATE_KEY)
  
  if (userInfo) {
    cachedUserInfo = userInfo
    loginState = state || false
    logger.debug('从缓存加载用户信息成功')
  }
} catch (error) {
  logger.error('从缓存加载用户信息失败:', error)
}

/**
 * 用户管理器
 */
const userManager = {
  /**
   * 将微信原始openid转换为十六进制字符串格式
   * @param {string} openid - 微信原始openid
   * @returns {string} - 转换后的十六进制字符串
   */
  formatOpenid(openid) {
    if (!openid) return '';
    
    // 已经是MD5格式的直接返回
    if (/^[0-9a-f]{32}$/.test(openid)) {
      return openid;
    }
    
    try {
      // 使用简单的字符串哈希代替crypto.createHash（小程序环境不支持）
      let hash = 0;
      for (let i = 0; i < openid.length; i++) {
        const char = openid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      
      // 转换为16进制字符串并补齐前导0
      const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
      
      // 重复到32位长度
      return (hashHex.repeat(4)).substring(0, 32);
    } catch (e) {
      console.error('openid格式化失败:', e);
      // 返回一个备用值
      return openid.replace(/[^a-zA-Z0-9]/g, '').padEnd(32, '0').substring(0, 32);
    }
  },

  /**
   * 调试用户ID问题
   * @returns {Object} 从所有可能的来源获取的用户ID信息
   */
  debugUserId() {
    try {
      // 从各种存储中获取用户ID
      const sources = {};
      
      // 从主存储获取
      try {
        const userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {};
        sources.main_storage = {
          id: userInfo.id,
          _id: userInfo._id,
          openid: userInfo.openid,
          formatted_openid: this.formatOpenid(userInfo.openid)
        };
      } catch (e) {
        sources.main_storage = { error: e.message };
      }
      
      // 从最新存储获取
      try {
        const latestUserInfo = wx.getStorageSync(STORAGE_KEYS.LATEST_USER_INFO) || {};
        sources.latest_storage = {
          id: latestUserInfo.id,
          _id: latestUserInfo._id,
          openid: latestUserInfo.openid,
          formatted_openid: this.formatOpenid(latestUserInfo.openid)
        };
      } catch (e) {
        sources.latest_storage = { error: e.message };
      }
      
      // 从全局状态获取
      try {
        const app = getApp();
        if (app && app.globalData && app.globalData.userInfo) {
          const globalUserInfo = app.globalData.userInfo;
          sources.global_data = {
            id: globalUserInfo.id,
            _id: globalUserInfo._id,
            openid: globalUserInfo.openid,
            formatted_openid: this.formatOpenid(globalUserInfo.openid)
          };
        } else {
          sources.global_data = { error: '全局用户数据不可用' };
        }
      } catch (e) {
        sources.global_data = { error: e.message };
      }
      
      // 从token获取
      try {
        const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
        sources.token = { token: token ? '存在' : '不存在' };
      } catch (e) {
        sources.token = { error: e.message };
      }
      
      console.debug('用户ID调试信息:', JSON.stringify(sources, null, 2));
      return sources;
    } catch (error) {
      console.error('调试用户ID出错:', error);
      return { error: error.message };
    }
  },

  /**
   * 获取当前用户信息，整合多个来源确保信息完整
   * @returns {Object} 用户信息
   */
  getCurrentUser() {
    return cachedUserInfo
  },
  
  /**
   * 获取用户信息用于API请求
   * @returns {Object} 包含openid的用户信息对象
   */
  getUserInfoForAPI() {
    const userInfo = this.getCurrentUser();
    // getCurrentUser方法已确保返回格式化的openid
    return {
      openid: userInfo.openid,
      nickname: userInfo.nickname || userInfo.nickName || DEFAULT_NAME,
      nick_name: userInfo.nickname || userInfo.nickName || DEFAULT_NAME,  // 为了兼容性同时提供两种格式
      avatar: userInfo.avatar || userInfo.avatarUrl || getDefaultAvatar(),
      bio: userInfo.bio || ''  // 添加个人简介字段
    };
  },
  
  /**
   * 检查用户信息是否完整
   * @param {Object} userInfo 用户信息对象
   * @returns {Boolean} 是否完整
   */
  isUserInfoComplete(userInfo) {
    // 必须有ID和昵称
    if (!userInfo) return false;
    
    // 增强日志以协助调试
    console.debug('检查用户信息完整性:', JSON.stringify(userInfo));
    
    // 检查用户ID (可能存在于多个字段)
    const hasUserId = !!(userInfo.id || userInfo._id || userInfo.openid);
    
    // 检查用户昵称 (可能存在于多个字段)
    const hasNickname = !!(userInfo.nickname || userInfo.nickName || userInfo.author_name);
    
    // 检查头像 (可能存在于多个字段)
    const hasAvatar = !!(userInfo.avatar_url || userInfo.avatarUrl || userInfo.author_avatar);
    
    // 记录详细的检查结果
    console.debug(`用户信息字段检查结果: ID=${hasUserId}, 昵称=${hasNickname}, 头像=${hasAvatar}`);
    
    // 返回综合检查结果
    return hasUserId && hasNickname;
  },
  
  /**
   * 合并多个用户信息对象，后面的覆盖前面的
   * @param {Array<Object>} infoArray - 用户信息对象数组
   * @returns {Object} 合并后的用户信息
   */
  mergeUserInfo(infoArray) {
    const result = {};
    
    // 处理字段别名映射
    const fieldMap = {
      '_id': 'id',
      'nickName': 'nickname',
      'avatarUrl': 'avatar_url'
    };
    
    // 合并所有信息
    infoArray.forEach(info => {
      if (!info) return;
      
      Object.keys(info).forEach(key => {
        // 检查是否需要规范化字段名
        const normalizedKey = fieldMap[key] || key;
        
        // 只有在值存在且非空时才覆盖
        if (info[key] !== undefined && info[key] !== null && info[key] !== '') {
          result[normalizedKey] = info[key];
        }
      });
    });
    
    return result;
  },
  
  /**
   * 保存用户信息到本地存储
   * @param {Object} userInfo - 用户信息
   * @param {Boolean} updateLatest - 是否同时更新最新用户信息
   */
  saveUserInfo(userInfo) {
    if (!userInfo) {
      console.error('保存的用户信息为空');
      
      return false;
    }
    
    console.info('保存用户信息，原始数据:', JSON.stringify(userInfo));
    
    try {
      if (typeof userInfo !== 'object') {
        console.error('用户信息格式错误，期望对象类型');
        return false;
      }
      
      // 标准化用户信息
      const finalUserInfo = {
        ...userInfo,
        // 确保关键字段存在
        openid: userInfo.openid || userInfo.wxapp_id || userInfo.open_id || `user_${userInfo.id || Date.now()}`,
        nickname: userInfo.nickname || userInfo.nickName || userInfo.nick_name || '南开大学用户',
        nickName: userInfo.nickname || userInfo.nickName || userInfo.nick_name || '南开大学用户',
        nick_name: userInfo.nickname || userInfo.nickName || userInfo.nick_name || '南开大学用户',
        bio: userInfo.bio || userInfo.signature || userInfo.description || userInfo.status || '这个人很懒，什么都没留下',
        avatar: userInfo.avatar || userInfo.avatarUrl || userInfo.avatar_url || getDefaultAvatar(),
        avatar_url: userInfo.avatar_url || userInfo.avatarUrl || userInfo.avatar || getDefaultAvatar(),
        avatarUrl: userInfo.avatarUrl || userInfo.avatar_url || userInfo.avatar || getDefaultAvatar(),
        school: userInfo.school || userInfo.university || '南开大学',
        update_time: new Date().toISOString()
      };
      
      // 更新内存中的用户信息和登录状态
      cachedUserInfo = finalUserInfo;
      loginState = true;
      
      // 保存到本地存储
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, finalUserInfo);
      wx.setStorageSync(LOGIN_STATE_KEY, true);
      wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, finalUserInfo);
      
      // 更新全局状态
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = finalUserInfo;
        app.globalData.hasLogin = true;
        if (app.globalDataChanged && typeof app.globalDataChanged === 'function') {
          app.globalDataChanged('userInfo', finalUserInfo);
        }
      }
      
      // 设置刷新标记
      wx.removeStorageSync('_cached_user_info');
      wx.setStorageSync('needRefreshUserInfo', true);
      
      console.info('用户信息和登录状态已成功保存');
      return true;
    } catch (error) {
      console.error('保存用户信息失败:', error);
      return false;
    }
  },
  
  /**
   * 更新用户信息
   * @param {Object} newInfo - 新的用户信息
   * @returns {Boolean} 是否更新成功
   */
  updateUserInfo(newInfo) {
    console.debug('更新用户信息:', JSON.stringify(newInfo));
    
    try {
      if (!newInfo) {
        console.error('更新信息为空');
        return false;
      }
      
      // 获取当前用户信息
      const currentUserInfo = this.getCurrentUser();
      if (!currentUserInfo || !currentUserInfo.openid) {
        console.error('当前无用户信息或无有效openid，无法更新');
        return false;
      }
      
      // 合并新信息到现有用户信息
      const updatedUserInfo = { ...currentUserInfo };
      
      // 只复制有值的字段
      Object.keys(newInfo).forEach(key => {
        if (newInfo[key] !== undefined && newInfo[key] !== null) {
          updatedUserInfo[key] = newInfo[key];
        }
      });
      
      // 简化字段处理，统一处理常用字段别名
      const fieldMappings = {
        // 头像字段别名
        'avatar': ['avatar_url', 'avatarUrl'],
        // 昵称字段别名
        'nickname': ['nickName', 'nick_name'],
        // 个人简介字段别名
        'bio': ['personal_bio', 'biography']
      };
      
      // 处理字段别名
      Object.entries(fieldMappings).forEach(([mainField, aliases]) => {
        if (newInfo[mainField]) {
          // 将主字段值同步到所有别名
          aliases.forEach(alias => {
            updatedUserInfo[alias] = newInfo[mainField];
          });
        } else {
          // 检查是否有别名字段更新
          for (const alias of aliases) {
            if (newInfo[alias]) {
              updatedUserInfo[mainField] = newInfo[alias];
              // 同步到其他别名
              aliases.forEach(otherAlias => {
                if (otherAlias !== alias) {
                  updatedUserInfo[otherAlias] = newInfo[alias];
                }
              });
              break;
            }
          }
        }
      });
      
      // 确保昵称和个性签名有默认值
      updatedUserInfo.nickname = updatedUserInfo.nickname || '南开大学用户';
      updatedUserInfo.bio = updatedUserInfo.bio || '这个人很懒，什么都没留下';
      
      // 更新时间戳
      updatedUserInfo.update_time = new Date().toISOString();
      
      // 保存更新后的用户信息
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, updatedUserInfo);
      wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, updatedUserInfo);
      
      // 更新全局状态
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = updatedUserInfo;
        if (app.globalDataChanged && typeof app.globalDataChanged === 'function') {
          app.globalDataChanged('userInfo', updatedUserInfo);
        }
      }
      
      // 设置刷新标记
      wx.removeStorageSync('_cached_user_info');
      wx.setStorageSync('needRefreshUserInfo', true);
      
      console.debug('用户信息已成功更新');
      return true;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return false;
    }
  },
  
  /**
   * 获取默认用户信息
   * @returns {Object} 默认用户信息
   */
  getDefaultUserInfo() {
    return {
      id: '0',
      wxapp_id: 'guest',
      nickname: DEFAULT_NAME,
      avatar_url: getDefaultAvatar(),
    };
  },
  
  /**
   * 检查用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    return !!cachedUserInfo && loginState
  },
  
  /**
   * 清除用户登录状态
   */
  logout() {
    // 清除缓存的用户信息
    cachedUserInfo = null
    loginState = false
    
    // 清除本地存储
    try {
      wx.removeStorageSync(USER_INFO_KEY)
      wx.removeStorageSync(LOGIN_STATE_KEY)
    } catch (error) {
      logger.error('清除用户信息缓存失败:', error)
    }
    
    logger.debug('用户已登出')
    return true
  },
  
  /**
   * 获取微信云fileID的临时链接
   * @param {string} fileID - 微信云存储fileID
   * @returns {Promise<string>} 临时链接
   */
  getTempFileURL: async function(fileID) {
    if (!fileID || !fileID.startsWith('cloud://')) {
      console.debug('不是有效的云存储fileID:', fileID);
      return fileID; // 如果不是云存储fileID，直接返回原值
    }
    
    try {
      const res = await wx.cloud.getTempFileURL({
        fileList: [fileID]
      });
      
      if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
        console.debug('获取临时链接成功:', res.fileList[0].tempFileURL);
        return res.fileList[0].tempFileURL;
      } else {
        console.error('获取临时链接失败:', res);
        return fileID; // 获取失败时返回原fileID
      }
    } catch (error) {
      console.error('获取临时链接异常:', error);
      return fileID; // 发生异常时返回原fileID
    }
  },
  
  /**
   * 临时保存云函数获取的用户信息（不作为主要用户信息）
   * @param {Object} tempUserInfo - 临时用户信息
   * @returns {Object} 保存后的临时用户信息
   */
  updateTempUserInfo(tempUserInfo) {
    try {
      // 仅保存到最新用户信息中，不覆盖主要用户信息
      if (tempUserInfo) {
        wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, tempUserInfo);
      }
      return tempUserInfo;
    } catch (e) {
      console.error('保存临时用户信息失败', e);
      return null;
    }
  },

  // 获取用户openid
  getOpenid: function() {
    return cachedUserInfo ? (cachedUserInfo.openid || cachedUserInfo._id || cachedUserInfo.id) : null
  },
  
  // 获取用户ID
  getUserId: function() {
    return cachedUserInfo ? (cachedUserInfo.id || cachedUserInfo._id || cachedUserInfo.openid) : null
  },
  
  // 登录
  login: function(wxUserInfo) {
    logger.debug('开始登录流程:', wxUserInfo)
    
    // 保证传入了用户信息
    if (!wxUserInfo) {
      return Promise.reject(new Error('未提供用户信息'))
    }
    
    return new Promise((resolve, reject) => {
      // 调用云函数进行登录
      wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName: wxUserInfo.nickName,
          avatarUrl: wxUserInfo.avatarUrl,
          gender: wxUserInfo.gender,
          country: wxUserInfo.country,
          province: wxUserInfo.province,
          city: wxUserInfo.city,
          language: wxUserInfo.language
        }
      })
      .then(res => {
        // 检查云函数返回结果
        if (res.result && res.result.code === 0 && res.result.data) {
          // 获取用户信息
          const userData = res.result.data.userData || {}
          
          // 记录用户信息
          cachedUserInfo = {
            openid: userData.openid,
            _id: userData._id || userData.openid,
            id: userData.id || userData._id || userData.openid,
            nickName: userData.nickName || userData.nick_name || wxUserInfo.nickName,
            avatarUrl: userData.avatarUrl || userData.avatar_url || wxUserInfo.avatarUrl,
            gender: userData.gender || wxUserInfo.gender || 0,
            country: userData.country || wxUserInfo.country || '',
            province: userData.province || wxUserInfo.province || '',
            city: userData.city || wxUserInfo.city || '',
            language: userData.language || wxUserInfo.language || 'zh_CN',
            isNewUser: res.result.data.isNewUser || false
          }
          
          // 保存登录状态
          loginState = true
          
          // 保存到本地存储
          try {
            wx.setStorageSync(USER_INFO_KEY, cachedUserInfo)
            wx.setStorageSync(LOGIN_STATE_KEY, true)
            logger.debug('保存用户信息到缓存成功')
          } catch (error) {
            logger.error('保存用户信息到缓存失败:', error)
          }
          
          logger.debug('登录成功:', cachedUserInfo)
          resolve(cachedUserInfo)
        } else {
          const errorMsg = res.result.message || '登录失败，未知错误'
          logger.error('登录失败:', errorMsg)
          reject(new Error(errorMsg))
        }
      })
      .catch(error => {
        logger.error('调用登录云函数失败:', error)
        reject(error)
      })
    })
  },
  
  // 使用openid直接登录（无需用户授权）
  loginWithOpenid: function() {
    return new Promise((resolve, reject) => {
      // 调用云函数获取openid
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      })
      .then(res => {
        if (res.result && res.result.code === 0 && res.result.data) {
          // 获取用户信息
          const userData = res.result.data.userData || {}
          
          // 记录用户信息
          cachedUserInfo = {
            openid: userData.openid,
            _id: userData._id || userData.openid,
            id: userData.id || userData._id || userData.openid,
            nickName: userData.nickName || userData.nick_name || '用户' + userData.openid.substr(-4),
            avatarUrl: userData.avatarUrl || userData.avatar_url || getDefaultAvatar(),
            gender: userData.gender || 0,
            isNewUser: res.result.data.isNewUser || false
          }
          
          // 保存登录状态
          loginState = true
          
          // 保存到本地存储
          try {
            wx.setStorageSync(USER_INFO_KEY, cachedUserInfo)
            wx.setStorageSync(LOGIN_STATE_KEY, true)
          } catch (error) {
            logger.error('保存用户信息到缓存失败:', error)
          }
          
          logger.debug('使用Openid登录成功:', cachedUserInfo)
          resolve(cachedUserInfo)
        } else {
          const errorMsg = res.result ? res.result.message : '登录失败'
          logger.error('使用Openid登录失败:', errorMsg)
          reject(new Error(errorMsg))
        }
      })
      .catch(error => {
        logger.error('调用登录云函数失败:', error)
        reject(error)
      })
    })
  },
  
  // 更新用户信息
  updateUserInfo: function(userData) {
    // 确保有用户ID
    const userId = this.getUserId()
    if (!userId) {
      return Promise.reject(new Error('用户未登录或无法获取用户ID'))
    }
    
    // 准备更新数据
    const updateData = {
      nickname: userData.nickName || userData.nickname,
      avatar_url: userData.avatarUrl || userData.avatar_url,
      gender: userData.gender,
      country: userData.country,
      province: userData.province,
      city: userData.city,
      language: userData.language
    }
    
    // 移除空值
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key]
      }
    })
    
    // 调用API更新用户信息
    return userAPI.updateUser(userId, updateData)
      .then(result => {
        if (result && result.success) {
          // 更新缓存的用户信息
          cachedUserInfo = {
            ...cachedUserInfo,
            ...result.user
          }
          
          // 更新本地存储
          try {
            wx.setStorageSync(USER_INFO_KEY, cachedUserInfo)
          } catch (error) {
            logger.error('更新用户信息到缓存失败:', error)
          }
          
          return cachedUserInfo
        } else {
          throw new Error('更新用户信息失败')
        }
      })
  },
  
  // 获取最新的用户信息
  refreshUserInfo: function() {
    const userId = this.getUserId()
    if (!userId) {
      return Promise.reject(new Error('用户未登录或无法获取用户ID'))
    }
    
    // 调用API获取用户信息
    return userAPI.getUser(userId)
      .then(result => {
        if (result && result.user) {
          // 更新缓存的用户信息
          cachedUserInfo = {
            ...cachedUserInfo,
            ...result.user
          }
          
          // 更新本地存储
          try {
            wx.setStorageSync(USER_INFO_KEY, cachedUserInfo)
          } catch (error) {
            logger.error('保存用户信息到缓存失败:', error)
          }
          
          return cachedUserInfo
        } else {
          throw new Error('获取用户信息失败')
        }
      })
  },

  // 格式化用户数据，兼容老版本
  formatUserData(userData) {
    if (!userData) return null;
    
    return {
      id: userData.id || userData._id,
      openid: userData.openid || userData._openid,
      nickname: userData.nickname || userData.nick_name || DEFAULT_NAME,
      avatar_url: userData.avatar_url || userData.avatar || userData.avatarUrl || getDefaultAvatar(),
      avatarUrl: userData.avatarUrl || userData.avatar_url || getDefaultAvatar(),
      gender: userData.gender || 0,
    };
  },
};

module.exports = userManager; 