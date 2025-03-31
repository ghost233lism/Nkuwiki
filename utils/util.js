const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 格式化相对时间
 * @param {any} timestamp - 任何表示时间的值
 * @return {string} 相对时间字符串
 */
function formatRelativeTime(timestamp) {
  // 阻止处理已格式化的字符串
  if (typeof timestamp === 'string' &&
      (timestamp.includes('小时前') ||
       timestamp.includes('分钟前') ||
       timestamp.includes('秒前') ||
       timestamp.includes('天前') ||
       timestamp.includes('月前') ||
       timestamp.includes('年前') ||
       timestamp === '刚刚发布')) {
    return timestamp; // 已经是格式化好的相对时间，直接返回
  }

  // 如果没有传入值，直接返回默认值
  if (!timestamp) {
    return '刚刚发布';
  }

  // 标准化日期对象
  let date;
  try {
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // 尝试解析日期字符串
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      // 对象类型可能是云数据库的时间类型
      console.log('尝试解析复杂时间对象:', JSON.stringify(timestamp));
      if (timestamp.toDate) {
        date = timestamp.toDate(); // Firestore时间戳
      } else {
        console.error('未知时间格式:', timestamp);
        return '刚刚发布';
      }
    }
  } catch (err) {
    console.error('时间格式化错误:', err, timestamp);
    return '刚刚发布'; // 出错时使用默认值
  }

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.error('无效日期:', timestamp);
    return '刚刚发布';
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime(); // 毫秒差

  // 计算时间差
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // 返回相对时间
  if (seconds < 0) {
    return '刚刚发布'; // 未来时间
  } else if (seconds < 60) {
    return seconds < 15 ? '刚刚发布' : `${seconds}秒前`;
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 30) {
    return `${days}天前`;
  } else if (months < 12) {
    return `${months}个月前`;
  } else {
    return `${years}年前`;
  }
}

/**
 * 获取系统信息
 * @returns {Object} 系统信息
 */
function getSystemInfo() {
  try {
    // 使用新的API获取系统信息
    const appBaseInfo = wx.getAppBaseInfo();
    const deviceInfo = wx.getDeviceInfo();
    const windowInfo = wx.getWindowInfo();
    const systemSetting = wx.getSystemSetting();
    const appAuthorizeSetting = wx.getAppAuthorizeSetting();
    
    return {
      // 基础信息
      platform: appBaseInfo.platform,
      language: appBaseInfo.language,
      version: appBaseInfo.version,
      SDKVersion: appBaseInfo.SDKVersion,
      theme: appBaseInfo.theme,
      enableDebug: appBaseInfo.enableDebug,
      host: appBaseInfo.host,
      
      // 设备信息
      brand: deviceInfo.brand,
      model: deviceInfo.model,
      system: deviceInfo.system,
      platform: deviceInfo.platform,
      
      // 窗口信息
      screenWidth: windowInfo.screenWidth,
      screenHeight: windowInfo.screenHeight,
      windowWidth: windowInfo.windowWidth,
      windowHeight: windowInfo.windowHeight,
      statusBarHeight: windowInfo.statusBarHeight,
      safeArea: windowInfo.safeArea,
      pixelRatio: windowInfo.pixelRatio,
      
      // 系统设置
      bluetoothEnabled: systemSetting.bluetoothEnabled,
      locationEnabled: systemSetting.locationEnabled,
      wifiEnabled: systemSetting.wifiEnabled,
      deviceOrientation: systemSetting.deviceOrientation,
      
      // 授权设置
      albumAuthorized: appAuthorizeSetting.albumAuthorized,
      bluetoothAuthorized: appAuthorizeSetting.bluetoothAuthorized,
      cameraAuthorized: appAuthorizeSetting.cameraAuthorized,
      locationAuthorized: appAuthorizeSetting.locationAuthorized,
      locationReducedAccuracy: appAuthorizeSetting.locationReducedAccuracy,
      microphoneAuthorized: appAuthorizeSetting.microphoneAuthorized,
      notificationAuthorized: appAuthorizeSetting.notificationAuthorized,
      notificationAlertAuthorized: appAuthorizeSetting.notificationAlertAuthorized,
      notificationBadgeAuthorized: appAuthorizeSetting.notificationBadgeAuthorized,
      notificationSoundAuthorized: appAuthorizeSetting.notificationSoundAuthorized
    };
  } catch (err) {
    console.error('获取系统信息失败:', err);
    return {};
  }
}

/**
 * 获取Storage的封装函数
 * @param {string} key - 存储的键
 * @returns {any} 存储的值
 */
function getStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    console.debug(`获取Storage失败[${key}]:`, e);
    return null;
  }
}

/**
 * 设置Storage的封装函数
 * @param {string} key - 存储的键
 * @param {any} data - 存储的数据
 * @returns {boolean} 是否设置成功
 */
function setStorage(key, data) {
  try {
    wx.setStorageSync(key, data);
    return true;
  } catch (e) {
    console.debug(`设置Storage失败[${key}]:`, e);
    return false;
  }
}

/**
 * 移除Storage的封装函数
 * @param {string} key - 存储的键
 * @returns {boolean} 是否移除成功
 */
function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    console.debug(`移除Storage失败[${key}]:`, e);
    return false;
  }
}

/**
 * 获取用户OpenID
 * @param {boolean} showLoading - 是否显示加载中提示，默认为true
 * @returns {Promise<string>} 用户OpenID
 */
async function getOpenID(showLoading = true) {
  try {
    // 先检查本地存储中是否已有openid
    const cachedOpenID = getStorage('openid');
    if (cachedOpenID) {
      console.debug('从缓存获取openid:', cachedOpenID);
      
      // 保存到全局变量
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.openid = cachedOpenID;
      }
      
      return cachedOpenID;
    }
    
    // 再检查全局变量中是否已有openid
    const app = getApp();
    if (app && app.globalData && app.globalData.openid) {
      console.debug('从全局变量获取到openid:', app.globalData.openid);
      return app.globalData.openid;
    }
    
    // 添加Loading提示，根据参数决定是否显示
    if (showLoading) {
      wx.showLoading({
        title: '登录中...',
        mask: true
      });
    } else {
      // 确保关闭任何现有loading
      wx.hideLoading();
    }
    
    // 确保云环境初始化
    if (!wx.cloud) {
      console.error('云开发环境未初始化');
      if (showLoading) wx.hideLoading();
      return null;
    }
    
    // 尝试通过wx.login获取临时凭证code
    try {
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: res => resolve(res),
          fail: err => reject(err)
        });
      });
      
      if (loginResult && loginResult.code) {
        console.debug('获取到wx.login的code:', loginResult.code);
        
        // 调用云函数获取openid
        const wxCloudResult = await wx.cloud.callFunction({
          name: 'getOpenID',
          data: { code: loginResult.code },
          timeout: 10000 // 设置超时时间为10秒
        });
        
        // 只处理新格式
        if (wxCloudResult && wxCloudResult.result && 
            wxCloudResult.result.data && wxCloudResult.result.data.openid) {
          const openid = wxCloudResult.result.data.openid;
          console.debug('通过云函数获取到openid:', openid);
          
          // 保存到全局变量
          if (app && app.globalData) {
            app.globalData.openid = openid;
          }
          
          // 保存到本地存储
          setStorage('openid', openid);
          
          // 隐藏Loading
          if (showLoading) wx.hideLoading();
          
          return openid;
        } else {
          console.error('云函数返回结果不包含openid:', wxCloudResult);
          if (showLoading) wx.hideLoading();
          return null;
        }
      } else {
        console.error('wx.login获取code失败:', loginResult);
        if (showLoading) wx.hideLoading();
        return null;
      }
    } catch (err) {
      console.error('登录过程出错:', err);
      if (showLoading) wx.hideLoading();
      return null;
    }
  } catch (err) {
    console.error('获取openid过程中出错:', err);
    if (showLoading) wx.hideLoading();
    return null;
  }
}

function processCloudUrl(url) {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  if (url.startsWith('cloud://')) {
    const matches = url.match(/cloud:\/\/(.*?)\.(.*?)\/(.*)/);
    return matches?.length === 4 ? `https://${matches[2]}.tcb.qcloud.la/${matches[3]}` : '';
  }
  return url;
}

function processPostData(post) {
  if (!post) return null;
  
  const images = (post.image || post.images || '').toString();
  const tags = (post.tag || post.tags || '').toString();
  const likedUsers = (post.liked_user || post.liked_users || '').toString();
  const favoriteUsers = (post.favorite_user || post.favorite_users || '').toString();

  return {
    ...post,
    image: safeParseJSON(images).map(processCloudUrl),
    tag: safeParseJSON(tags),
    liked_user: safeParseJSON(likedUsers),
    favorite_user: safeParseJSON(favoriteUsers),
    avatar: processCloudUrl(post.avatar)
  };
}

function safeParseJSON(str) {
  try {
    return JSON.parse(str || '[]');
  } catch {
    return [];
  }
}

module.exports = {
  formatTime,
  formatRelativeTime,
  getOpenID,
  getSystemInfo,
  getStorage,
  setStorage,
  removeStorage,
  processCloudUrl,
  processPostData,
  safeParseJSON
};
