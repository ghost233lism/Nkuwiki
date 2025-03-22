/**
 * 用户管理模块 - 统一管理用户信息获取和存储
 */

// 存储位置枚举
const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  LATEST_USER_INFO: 'latestUserInfo',
  TOKEN: 'token'
};

// 默认值
const DEFAULT_AVATAR = '/assets/icons/default-avatar.png';
const DEFAULT_NAME = '南开大学用户';

/**
 * 用户管理器
 */
const userManager = {
  /**
   * 获取当前用户信息，整合多个来源确保信息完整
   * @returns {Object} 用户信息
   */
  getCurrentUser() {
    try {
      // 尝试从主存储获取
      let userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {};
      
      // 检查信息是否完整
      if (!this.isUserInfoComplete(userInfo)) {
        console.debug('用户信息不完整，尝试获取更多来源...');
        
        // 尝试获取最新存储的用户信息
        const latestUserInfo = wx.getStorageSync(STORAGE_KEYS.LATEST_USER_INFO) || {};
        
        // 尝试从全局状态获取
        const app = getApp();
        const globalUserInfo = (app && app.globalData && app.globalData.userInfo) || {};
        
        // 合并信息，优先使用最新的信息
        userInfo = this.mergeUserInfo([userInfo, latestUserInfo, globalUserInfo]);
        
        // 更新存储
        if (this.isUserInfoComplete(userInfo)) {
          console.debug('已获取完整用户信息，更新存储');
          this.saveUserInfo(userInfo);
        }
      }
      
      return userInfo;
    } catch (error) {
      console.error('获取用户信息出错:', error);
      return this.getDefaultUserInfo();
    }
  },
  
  /**
   * 获取用于API请求的用户信息
   * @returns {Object} 用于API的用户信息
   */
  getUserInfoForAPI() {
    const userInfo = this.getCurrentUser();
    return {
      id: userInfo.id || userInfo._id || '0',  // 确保有ID
      user_id: userInfo.id || userInfo._id || '0',
      wxapp_id: userInfo.wxapp_id || `user_${Date.now()}`,
      author_name: userInfo.nickname || userInfo.nickName || DEFAULT_NAME,
      nickname: userInfo.nickname || userInfo.nickName || DEFAULT_NAME,
      author_avatar: userInfo.avatar_url || userInfo.avatarUrl || DEFAULT_AVATAR,
      avatar_url: userInfo.avatar_url || userInfo.avatarUrl || DEFAULT_AVATAR,
    };
  },
  
  /**
   * 检查用户信息是否完整
   * @param {Object} userInfo - 用户信息对象
   * @returns {boolean} 是否完整
   */
  isUserInfoComplete(userInfo) {
    // 至少要有ID和昵称
    return userInfo && 
           (userInfo.id || userInfo._id) && 
           (userInfo.nickname || userInfo.nickName);
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
   */
  saveUserInfo(userInfo) {
    if (!userInfo) return;
    
    try {
      // 确保字段命名一致性
      const standardUserInfo = {
        id: userInfo.id || userInfo._id,
        wxapp_id: userInfo.wxapp_id || userInfo.openid || `user_${userInfo.id || Date.now()}`,
        nickname: userInfo.nickname || userInfo.nickName,
        avatar_url: userInfo.avatar_url || userInfo.avatarUrl,
        openid: userInfo.openid,
        unionid: userInfo.unionid,
        gender: userInfo.gender,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city,
        language: userInfo.language,
        create_time: userInfo.create_time,
        update_time: userInfo.update_time,
        last_login: userInfo.last_login || new Date().toISOString()
      };
      
      // 保存到主存储
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, standardUserInfo);
      
      // 更新最新信息
      wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, standardUserInfo);
      
      // 更新全局状态
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = standardUserInfo;
      }
      
      console.debug('用户信息已保存', standardUserInfo);
    } catch (error) {
      console.error('保存用户信息失败:', error);
    }
  },
  
  /**
   * 更新用户信息
   * @param {Object} newInfo - 新的用户信息
   */
  updateUserInfo(newInfo) {
    console.debug('更新用户信息:', newInfo);
    
    try {
      // 获取当前用户信息
      const currentUserInfo = this.getCurrentUser();
      if (!currentUserInfo) {
        console.error('当前无用户信息，无法更新');
        return false;
      }
      
      // 合并新信息到现有用户信息
      const updatedUserInfo = { ...currentUserInfo, ...newInfo };
      
      // 特殊处理头像字段，确保avatarUrl和avatar_url保持一致
      if (newInfo.avatarUrl && !newInfo.avatar_url) {
        updatedUserInfo.avatar_url = newInfo.avatarUrl;
      } else if (newInfo.avatar_url && !newInfo.avatarUrl) {
        updatedUserInfo.avatarUrl = newInfo.avatar_url;
      }
      
      // 保存更新后的用户信息
      console.debug('保存更新后的用户信息:', updatedUserInfo);
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, updatedUserInfo);
      wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, updatedUserInfo);
      
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
      avatar_url: DEFAULT_AVATAR,
    };
  },
  
  /**
   * 检查用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    try {
      const userInfo = this.getCurrentUser();
      const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
      
      console.debug('登录检查 - 用户信息:', userInfo ? '存在' : '不存在');
      console.debug('登录检查 - Token:', token ? '存在' : '不存在');
      
      if (userInfo && userInfo.id) {
        console.debug('登录检查 - 用户ID:', userInfo.id);
      }
      
      // 判断条件：
      // 1. 必须有用户信息
      // 2. 用户ID必须存在且不为'0'
      // 3. 最好有token，但临时允许没有token也算登录
      const isLoggedIn = !!(userInfo && userInfo.id && userInfo.id !== '0');
      
      console.debug('登录状态判断结果:', isLoggedIn);
      return isLoggedIn;
    } catch (error) {
      console.error('登录状态检查出错:', error);
      return false;
    }
  },
  
  /**
   * 清除用户登录状态
   */
  logout() {
    wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
    wx.removeStorageSync(STORAGE_KEYS.LATEST_USER_INFO);
    wx.removeStorageSync(STORAGE_KEYS.TOKEN);
    
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = null;
    }
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
  }
};

module.exports = userManager; 