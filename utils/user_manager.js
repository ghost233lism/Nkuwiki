/**
 * 用户管理模块 - 统一管理用户信息获取和存储
 */

const { logger } = require('./api/index')
// 不在顶部导入userAPI，避免循环依赖
// const { userAPI } = require('./api/index')

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
    try {
      // 调试日志
      console.log('获取当前用户信息，缓存状态:', cachedUserInfo ? '有缓存' : '无缓存');
      
      // 首先尝试从内存中获取
      if (cachedUserInfo && cachedUserInfo.openid) {
        return cachedUserInfo;
      }
      
      // 从本地存储获取
      try {
        const storedUserInfo = wx.getStorageSync(USER_INFO_KEY);
        if (storedUserInfo && storedUserInfo.openid) {
          console.log('从存储中获取到用户信息:', storedUserInfo.openid);
          cachedUserInfo = storedUserInfo;
          loginState = true;
          return storedUserInfo;
        }
      } catch (storageError) {
        console.error('从存储获取用户信息失败:', storageError);
      }
      
      // 从最新缓存获取
      try {
        const latestUserInfo = wx.getStorageSync(STORAGE_KEYS.LATEST_USER_INFO);
        if (latestUserInfo && latestUserInfo.openid) {
          console.log('从最新缓存获取到用户信息:', latestUserInfo.openid);
          return latestUserInfo;
        }
      } catch (latestError) {
        console.error('从最新缓存获取用户信息失败:', latestError);
      }
      
      // 从全局状态获取
      try {
        const app = getApp();
        if (app && app.globalData && app.globalData.userInfo && app.globalData.userInfo.openid) {
          console.log('从全局状态获取到用户信息:', app.globalData.userInfo.openid);
          return app.globalData.userInfo;
        }
      } catch (appError) {
        console.error('从全局状态获取用户信息失败:', appError);
      }
      
      // 如果所有来源都没有获取到有效用户信息，返回一个默认的访客信息
      console.warn('无法获取有效用户信息，返回默认访客信息');
      return {
        openid: 'guest_' + Date.now(),
        nick_name: DEFAULT_NAME,
        avatar: getDefaultAvatar(),
        isGuest: true
      };
    } catch (error) {
      console.error('获取用户信息时发生异常:', error);
      // 返回一个安全的默认值
      return {
        openid: 'error_' + Date.now(),
        nick_name: DEFAULT_NAME,
        avatar: getDefaultAvatar(),
        isError: true
      };
    }
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
      nick_name: userInfo.nick_name || userInfo.nickName || DEFAULT_NAME,
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
    const hasNickname = !!(userInfo.nick_name || userInfo.nickName || userInfo.author_name);
    
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
      'nickName': 'nick_name',
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
   * @param {Boolean} updateGlobal - 是否更新全局状态和触发刷新
   */
  saveUserInfo(userInfo, updateGlobal = true) {
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
      
      // 检查是否存在已更新的用户信息，防止覆盖
      let shouldPreserveUpdates = false;
      let existingUserInfo = null;
      let userInfoUpdated = false;
      let updateTime = 0;
      
      try {
        userInfoUpdated = wx.getStorageSync('userInfoUpdated') || false;
        existingUserInfo = wx.getStorageSync('userInfo');
        updateTime = wx.getStorageSync('userInfoUpdateTime') || 0;
        
        const now = new Date().getTime();
        const thirtyMinutesInMs = 30 * 60 * 1000;
        
        // 如果在最近30分钟内用户信息被更新过，且当前调用不是从编辑页面来的
        shouldPreserveUpdates = userInfoUpdated && 
                               existingUserInfo && 
                               (now - updateTime) < thirtyMinutesInMs && 
                               !userInfo.fromEditor;
        
        if (shouldPreserveUpdates) {
          console.info('检测到已更新的用户信息，将保留用户编辑字段');
        }
      } catch (e) {
        console.error('检查用户信息更新状态失败:', e);
      }
      
      // 保留原有的统计数据，确保不会被覆盖
      const preserveStatsFields = {};
      if (existingUserInfo) {
        // 保留重要的统计数据字段
        ['posts_count', 'likes_count', 'comments_count', 'favorites_count', 
         'following_count', 'followers_count', 'token_count'].forEach(field => {
          if (existingUserInfo[field] !== undefined && 
              (userInfo[field] === undefined || userInfo[field] === null)) {
            preserveStatsFields[field] = existingUserInfo[field];
          }
        });
      }
      
      // 标准化用户信息
      let finalUserInfo = {
        ...preserveStatsFields,  // 先添加保留的统计数据
        ...userInfo,             // 然后是新的用户信息
        // 确保关键字段存在
        openid: userInfo.openid || userInfo.wxapp_id || userInfo.open_id || `user_${userInfo.id || Date.now()}`,
        nick_name: userInfo.nick_name || userInfo.nickName || '南开大学用户',
        bio: userInfo.bio || userInfo.signature || userInfo.description || userInfo.status || '这个人很懒，什么都没留下',
        avatar: userInfo.avatar || userInfo.avatarUrl || userInfo.avatar_url || getDefaultAvatar(),
        avatar_url: userInfo.avatar_url || userInfo.avatarUrl || userInfo.avatar || getDefaultAvatar(),
        avatarUrl: userInfo.avatarUrl || userInfo.avatar_url || userInfo.avatar || getDefaultAvatar(),
        school: userInfo.school || userInfo.university || '南开大学',
        update_time: new Date().toISOString()
      };
      
      // 如果新数据中有统计数据，确保转换为数字类型
      ['posts_count', 'likes_count', 'comments_count', 'favorites_count', 
       'following_count', 'followers_count', 'token_count'].forEach(field => {
        if (finalUserInfo[field] !== undefined) {
          finalUserInfo[field] = parseInt(finalUserInfo[field]) || 0;
        }
      });
      
      // 如果需要保留用户编辑的信息
      if (shouldPreserveUpdates && existingUserInfo) {
        // 将编辑过的字段合并到新数据中
        finalUserInfo = {
          ...finalUserInfo,
          // 保留用户编辑的字段
          nick_name: existingUserInfo.nick_name || finalUserInfo.nick_name,
          bio: existingUserInfo.bio || finalUserInfo.bio,
          birthday: existingUserInfo.birthday || finalUserInfo.birthday,
          wechatId: existingUserInfo.wechatId || finalUserInfo.wechatId,
          qqId: existingUserInfo.qqId || finalUserInfo.qqId,
          // 如果头像是用户自己上传的，也应保留
          avatar: existingUserInfo.avatar || finalUserInfo.avatar,
          avatar_url: existingUserInfo.avatar_url || finalUserInfo.avatar_url,
          avatarUrl: existingUserInfo.avatarUrl || finalUserInfo.avatarUrl
        };
        
        console.info('已保留用户编辑的信息');
      }
      
      // 移除旧的nickname字段，确保只使用nick_name
      if (finalUserInfo.hasOwnProperty('nickname')) {
        delete finalUserInfo.nickname;
      }
      
      // 更新内存中的用户信息和登录状态
      cachedUserInfo = finalUserInfo;
      loginState = true;
      
      // 保存到本地存储
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, finalUserInfo);
      wx.setStorageSync(LOGIN_STATE_KEY, true);
      wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, finalUserInfo);
      
      // 仅在需要时更新全局状态和触发刷新
      if (updateGlobal) {
        // 更新全局状态
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = finalUserInfo;
          app.globalData.hasLogin = true;
          
          // 设置需要刷新首页和个人资料页的标记
          app.globalData.needRefreshIndexPosts = true;
          app.globalData.needRefreshUserInfo = true;
          
          if (app.globalDataChanged && typeof app.globalDataChanged === 'function') {
            app.globalDataChanged('userInfo', finalUserInfo);
          }
        }
        
        // 设置刷新标记
        wx.removeStorageSync('_cached_user_info');
        wx.setStorageSync('needRefreshUserInfo', true);
      }
      
      console.info('用户信息和登录状态已成功保存');
      return true;
    } catch (error) {
      console.error('保存用户信息失败:', error);
      return false;
    }
  },
  
  /**
   * 更新用户信息
   * @param {Object} userData - 新的用户信息
   * @returns {Promise<Object>} 更新后的用户信息
   */
  updateUserInfo: function(userData) {
    // 确保有用户ID和更新数据
    let userId;
    let updateData = {};
    
    console.debug('更新用户信息，原始数据:', userData);
    
    // 检查参数类型并适当处理
    if (typeof userData === 'object' && userData !== null) {
      if (userData.openid || userData._id || userData.id) {
        // 如果传入的是用户对象，提取用户ID
        userId = userData.openid || userData._id || userData.id;
        // 复制所有有效字段作为更新数据
        updateData = { ...userData };
        // 删除ID字段，避免API冲突
        delete updateData.openid;
        delete updateData._id;
        delete updateData.id;
      } else {
        // 如果只传入更新数据（不包含ID），使用当前用户ID
        userId = this.getUserId();
        updateData = userData;
      }
    } else if (userData) {
      // 如果传入的是ID值本身（字符串或其他类型）
      userId = userData;
    } else {
      // 未提供参数，使用当前用户ID
      userId = this.getUserId();
    }
    
    // 确保有用户ID
    if (!userId) {
      console.error('用户未登录或无法获取用户ID');
      return Promise.reject(new Error('用户未登录或无法获取用户ID'));
    }
    
    // 确保userId是字符串类型
    userId = String(userId);
    
    // 准备更新数据，移除空值
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });
    
    console.debug('准备更新用户数据:', { userId, updateData });
    
    // 动态导入userAPI以避免循环依赖
    try {
      const { userAPI } = require('./api/index');
      
      if (!userAPI || typeof userAPI.updateUser !== 'function') {
        console.error('userAPI未正确加载或updateUser方法不存在');
        return Promise.reject(new Error('API模块加载失败'));
      }
      
      // 调用API更新用户信息，确保userId是字符串
      return userAPI.updateUser(userId, updateData)
        .then(result => {
          console.debug('API更新用户信息响应:', result);
          
          // 处理标准API响应格式
          // API文档响应格式: { code: 200, message: "success", data: {...用户数据...}, details: null, timestamp: "..." }
          let userData = null;
          
          if (result) {
            // 标准API响应格式处理
            if (result.code === 200) {
              console.debug('收到标准API响应格式，状态码200');
              userData = result.data;
            } 
            // 如果API直接返回了用户对象(包含openid)
            else if (result.openid) {
              console.debug('API直接返回用户对象');
              userData = result;
            }
            // 如果是简单成功标志或旧版返回格式
            else if (result.success || result.user) {
              console.debug('API返回了简单成功标志或user对象');
              userData = result.user || (result.openid ? result : null);
            }
          }
          
          // 检查是否成功获取到用户数据
          if (!userData) {
            console.error('无法从API响应中提取有效用户数据:', result);
            throw new Error('更新用户信息失败：响应中无有效用户数据');
          }
          
          // 确保用户对象有ID字段
          if (!userData.openid && !userData.id && !userData._id) {
            // 如果API返回的用户对象没有ID，使用当前用户的ID
            userData.openid = userId;
          }
          
          // 更新缓存的用户信息
          cachedUserInfo = {
            ...cachedUserInfo,
            ...userData,
            // 确保关键字段存在
            openid: userData.openid || cachedUserInfo.openid || userId,
            update_time: userData.update_time || new Date().toISOString()
          };
          
          // 更新本地存储
          try {
            wx.setStorageSync(USER_INFO_KEY, cachedUserInfo);
            wx.setStorageSync('needRefreshUserInfo', true);
            wx.removeStorageSync('_cached_user_info');
          } catch (error) {
            console.error('更新用户信息到缓存失败:', error);
          }
          
          return cachedUserInfo;
        });
    } catch (error) {
      console.error('加载userAPI模块失败:', error);
      return Promise.reject(error);
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
      nick_name: DEFAULT_NAME,
      avatar_url: getDefaultAvatar(),
    };
  },
  
  /**
   * 检查用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    try {
      console.log('检查用户登录状态');
      
      // 首先检查内存中的状态
      if (loginState && cachedUserInfo && cachedUserInfo.openid) {
        console.log('用户已登录(内存状态):', cachedUserInfo.openid);
        return true;
      }
      
      // 检查存储中的状态
      try {
        const storedLoginState = wx.getStorageSync(LOGIN_STATE_KEY);
        const storedUserInfo = wx.getStorageSync(USER_INFO_KEY);
        
        if (storedLoginState && storedUserInfo && storedUserInfo.openid) {
          console.log('用户已登录(存储状态):', storedUserInfo.openid);
          // 更新内存中的状态
          loginState = true;
          cachedUserInfo = storedUserInfo;
          return true;
        }
      } catch (storageError) {
        console.error('检查存储登录状态失败:', storageError);
      }
      
      // 检查全局状态
      try {
        const app = getApp();
        if (app && app.globalData && app.globalData.hasLogin && app.globalData.userInfo && app.globalData.userInfo.openid) {
          console.log('用户已登录(全局状态):', app.globalData.userInfo.openid);
          // 更新内存中的状态
          loginState = true;
          cachedUserInfo = app.globalData.userInfo;
          return true;
        }
      } catch (appError) {
        console.error('检查全局登录状态失败:', appError);
      }
      
      // 不再通过token接口验证登录状态，因为该接口不存在
      // 而是根据用户信息是否存在判断
      const userInfo = this.getCurrentUser();
      if (userInfo && userInfo.openid && !userInfo.isGuest && !userInfo.isError) {
        // 如果能获取到有效的用户信息，认为用户已登录
        console.log('用户已登录(有用户信息):', userInfo.openid);
        return true;
      }
      
      console.log('用户未登录');
      return false;
    } catch (error) {
      console.error('检查登录状态发生异常:', error);
      return false;
    }
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
  
  // 获取最新的用户信息
  refreshUserInfo: function() {
    // 获取用户openid
    const openid = this.getOpenid();
    if (!openid) {
      return Promise.reject(new Error('用户未登录或无法获取用户openid'));
    }
    
    // 动态导入userAPI
    const { userAPI } = require('./api/index');
    
    console.debug(`刷新用户信息，使用openid: ${openid}`);
    
    // 调用API获取用户信息，禁用缓存
    return userAPI.getUserInfo(openid)
      .then(result => {
        // 提取用户数据 - API文档标准格式: {code: 200, message: "success", data: {...}}
        const userData = result.code === 200 ? result.data : result;
        
        // 更新缓存的用户信息
        cachedUserInfo = {
          ...cachedUserInfo,
          ...userData
        };
        
        // 更新本地存储
        wx.setStorageSync(USER_INFO_KEY, cachedUserInfo);
        wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, cachedUserInfo);
        
        return cachedUserInfo;
      });
  },

  /**
   * 格式化用户数据用于显示
   * @param {Object} userData - 原始用户数据
   * @returns {Object} 格式化后的用户数据
   */
  formatUserData(userData) {
    // 确保用户数据存在
    if (!userData) return null;
    
    // 返回标准化的用户数据
    return {
      ...userData,
      nick_name: userData.nick_name || userData.nickName || DEFAULT_NAME,
      avatar: userData.avatar || userData.avatarUrl || getDefaultAvatar(),
    };
  },
};

module.exports = userManager; 