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
      // 尝试从主存储获取
      let userInfo = null;
      try {
        userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {};
        console.debug('从主存储获取的用户信息:', JSON.stringify(userInfo));
      } catch (storageError) {
        console.debug('从主存储获取用户信息失败:', storageError.message);
        userInfo = {};
      }
      
      // 尝试获取最新存储的用户信息
      let latestUserInfo = {};
      try {
        latestUserInfo = wx.getStorageSync(STORAGE_KEYS.LATEST_USER_INFO) || {};
        console.debug('从最新存储获取的用户信息:', JSON.stringify(latestUserInfo));
      } catch (latestError) {
        console.debug('从最新存储获取用户信息失败:', latestError.message);
      }
      
      // 尝试从全局状态获取
      const app = getApp();
      let globalUserInfo = {};
      if (app && app.globalData) {
        globalUserInfo = app.globalData.userInfo || {};
        console.debug('从全局状态获取的用户信息:', JSON.stringify(globalUserInfo));
      } else {
        console.debug('全局状态不可用或无用户信息');
      }
      
      // 合并信息，优先使用最新存储，然后是主存储，最后是全局状态
      // 修改合并优先级：最新存储 > 主存储 > 全局状态
      const mergedUserInfo = {
        ...globalUserInfo,
        ...userInfo,
        ...latestUserInfo
      };
      
      // 设置必要的默认值并更新
      userInfo = {
        ...mergedUserInfo,
        avatar: mergedUserInfo.avatar || mergedUserInfo.avatarUrl || mergedUserInfo.avatar_url || DEFAULT_AVATAR,
        avatar_url: mergedUserInfo.avatar_url || mergedUserInfo.avatarUrl || mergedUserInfo.avatar || DEFAULT_AVATAR,
        nickname: mergedUserInfo.nickname || mergedUserInfo.nickName || DEFAULT_NAME,
        // 兼容字段
        nickName: mergedUserInfo.nickname || mergedUserInfo.nickName || DEFAULT_NAME,
        avatarUrl: mergedUserInfo.avatar || mergedUserInfo.avatarUrl || mergedUserInfo.avatar_url || DEFAULT_AVATAR
      };
      
      // 确保openid被格式化
      if (userInfo.openid) {
        // 如果有原始openid但没有格式化openid，添加格式化的版本
        if (!userInfo.formatted_openid) {
          userInfo.formatted_openid = this.formatOpenid(userInfo.openid);
        }
        
        // 总是确保返回的openid是格式化的
        userInfo.openid = this.formatOpenid(userInfo.openid);
      }
      
      return userInfo;
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      // 返回最小可用的用户信息
      return {
        avatar: DEFAULT_AVATAR,
        avatar_url: DEFAULT_AVATAR,
        nickname: DEFAULT_NAME,
        nickName: DEFAULT_NAME,
        avatarUrl: DEFAULT_AVATAR
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
      avatar: userInfo.avatar || userInfo.avatarUrl || DEFAULT_AVATAR
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
  saveUserInfo(userInfo, updateLatest = true) {
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
      const standardUserInfo = {
        id: userInfo.id || userInfo._id,
        openid: userInfo.openid || userInfo.wxapp_id || userInfo.open_id || `user_${userInfo.id || Date.now()}`,
        wxapp_id: userInfo.wxapp_id || userInfo.openid || `user_${userInfo.id || Date.now()}`,
        nickname: userInfo.nickname || userInfo.nickName || userInfo.nick_name || '南开大学用户',
        // 确保三个昵称字段保持一致
        nickName: userInfo.nickname || userInfo.nickName || userInfo.nick_name || '南开大学用户',
        nick_name: userInfo.nickname || userInfo.nickName || userInfo.nick_name || '南开大学用户',
        bio: userInfo.bio || userInfo.signature || userInfo.description || userInfo.status || '这个人很懒，什么都没留下',
        // 确保三个头像字段保持一致
        avatar: userInfo.avatar || userInfo.avatarUrl || userInfo.avatar_url || 'https://nkuwiki.com/static/avatar/default.png',
        avatar_url: userInfo.avatar_url || userInfo.avatarUrl || userInfo.avatar || 'https://nkuwiki.com/static/avatar/default.png',
        avatarUrl: userInfo.avatarUrl || userInfo.avatar_url || userInfo.avatar || 'https://nkuwiki.com/static/avatar/default.png',
        school: userInfo.school || userInfo.university || '南开大学',
        update_time: new Date().toISOString()
      };
      
      // 保留已有字段
      const finalUserInfo = {
        ...userInfo,
        ...standardUserInfo
      };
      
      // 添加调试日志
      console.info('标准化后的用户信息:', JSON.stringify({
        nickname: finalUserInfo.nickname,
        nickName: finalUserInfo.nickName,
        nick_name: finalUserInfo.nick_name,
        bio: finalUserInfo.bio,
        avatar: finalUserInfo.avatar,
        avatar_url: finalUserInfo.avatar_url,
        avatarUrl: finalUserInfo.avatarUrl
      }));
      
      // 保存到本地存储
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, finalUserInfo);
      wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, finalUserInfo);
      
      // 更新全局状态
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = finalUserInfo;
        app.globalData.hasLogin = true;
        // 触发全局更新事件
        if (app.globalDataChanged && typeof app.globalDataChanged === 'function') {
          app.globalDataChanged('userInfo', finalUserInfo);
        }
      }
      
      console.info('用户信息已成功保存');
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
    console.info('更新用户信息:', JSON.stringify(newInfo));
    
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
      
      // 检查传入对象中是否有昵称和个性签名字段
      const hasNickname = !!(newInfo.nickname || newInfo.nickName || newInfo.nick_name);
      const hasBio = !!(newInfo.bio || newInfo.signature || newInfo.description || newInfo.status);
      
      console.info('更新用户信息，包含昵称:', hasNickname, '包含个性签名:', hasBio);
      
      // 合并新信息到现有用户信息
      const updatedUserInfo = { ...currentUserInfo };
      
      // 只复制有值的字段
      Object.keys(newInfo).forEach(key => {
        if (newInfo[key] !== undefined && newInfo[key] !== null) {
          updatedUserInfo[key] = newInfo[key];
        }
      });
      
      // 特殊处理头像字段，确保avatar、avatarUrl和avatar_url保持一致
      if (newInfo.avatar) {
        updatedUserInfo.avatar_url = newInfo.avatar;
        updatedUserInfo.avatarUrl = newInfo.avatar;
      } else if (newInfo.avatarUrl) {
        updatedUserInfo.avatar = newInfo.avatarUrl;
        updatedUserInfo.avatar_url = newInfo.avatarUrl;
      } else if (newInfo.avatar_url) {
        updatedUserInfo.avatar = newInfo.avatar_url;
        updatedUserInfo.avatarUrl = newInfo.avatar_url;
      }
      
      // 特殊处理昵称字段，确保nickname、nickName和nick_name保持一致
      if (newInfo.nickname) {
        updatedUserInfo.nickName = newInfo.nickname;
        updatedUserInfo.nick_name = newInfo.nickname;
      } else if (newInfo.nickName) {
        updatedUserInfo.nickname = newInfo.nickName;
        updatedUserInfo.nick_name = newInfo.nickName;
      } else if (newInfo.nick_name) {
        updatedUserInfo.nickname = newInfo.nick_name;
        updatedUserInfo.nickName = newInfo.nick_name;
      }
      
      // 特殊处理个性签名字段
      if (newInfo.bio) {
        updatedUserInfo.bio = newInfo.bio;
      } else if (newInfo.signature) {
        updatedUserInfo.bio = newInfo.signature;
      } else if (newInfo.description) {
        updatedUserInfo.bio = newInfo.description;
      } else if (newInfo.status) {
        updatedUserInfo.bio = newInfo.status;
      }
      
      // 确保昵称和个性签名有默认值
      updatedUserInfo.nickname = updatedUserInfo.nickname || updatedUserInfo.nickName || updatedUserInfo.nick_name || '南开大学用户';
      updatedUserInfo.nickName = updatedUserInfo.nickname;
      updatedUserInfo.nick_name = updatedUserInfo.nickname;
      
      updatedUserInfo.bio = updatedUserInfo.bio || '这个人很懒，什么都没留下';
      
      // 更新时间戳
      updatedUserInfo.update_time = new Date().toISOString();
      
      // 保存更新后的用户信息到所有存储位置
      console.info('保存更新后的用户信息:', JSON.stringify({
        ...updatedUserInfo,
        // 突出显示以下关键字段
        nickname: updatedUserInfo.nickname,
        bio: updatedUserInfo.bio
      }));
      
      wx.setStorageSync(STORAGE_KEYS.USER_INFO, updatedUserInfo);
      wx.setStorageSync(STORAGE_KEYS.LATEST_USER_INFO, updatedUserInfo);
      
      // 更新全局状态
      const app = getApp();
      if (app && app.globalData) {
        console.info('更新全局用户信息状态');
        app.globalData.userInfo = updatedUserInfo;
        // 触发全局更新事件
        if (app.globalDataChanged && typeof app.globalDataChanged === 'function') {
          app.globalDataChanged('userInfo', updatedUserInfo);
        }
      }
      
      // 强制清理缓存的用户信息
      wx.removeStorageSync('_cached_user_info');
      
      // 设置刷新标记
      wx.setStorageSync('needRefreshUserInfo', true);
      
      console.info('用户信息已成功更新');
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
      
      // 详细日志记录
      console.debug('登录检查 - 用户信息:', userInfo ? JSON.stringify(userInfo) : '不存在');
      console.debug('登录检查 - Token:', token ? '存在' : '不存在');
      
      // 检查用户ID (可能存在于多个字段)
      const openid = userInfo?.openid || userInfo?.id || userInfo?._id;
      console.debug('登录检查 - 解析后的用户openid:', openid || '无ID');
      
      // 验证token
      let tokenValid = false;
      if (token) {
        try {
          // 检查token是否包含有效结构
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            // 简单检查token是否包含有效payload
            const payload = JSON.parse(atob(tokenParts[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            // 检查是否过期
            tokenValid = payload.exp ? (payload.exp > currentTime) : true;
            console.debug('Token验证 - 结构有效, 过期状态:', tokenValid ? '未过期' : '已过期');
          } else {
            console.debug('Token验证 - 结构无效');
          }
        } catch (e) {
          console.debug('Token验证失败，可能是非JWT格式:', e.message);
          // 非标准JWT格式，但仍然有token
          tokenValid = true;
        }
      }
      console.debug('Token有效性验证结果:', tokenValid);
      
      // 登录判断逻辑
      // 1. 必须有用户信息
      // 2. 用户ID必须存在且不为'0'
      // 3. 最佳情况有token且有效，但临时允许无token也算登录
      const isLoggedIn = !!(userInfo && openid && openid !== '0');
      
      console.debug('登录状态判断最终结果:', isLoggedIn);
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