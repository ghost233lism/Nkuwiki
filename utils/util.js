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
 * 简单深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的新对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('深拷贝对象失败:', e);
    return {};
  }
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间(ms)
 * @returns {Function} 节流后的函数
 */
function throttle(fn, delay = 500) {
  let timer = null;
  let startTime = Date.now();
  
  return function(...args) {
    const curTime = Date.now();
    const remaining = delay - (curTime - startTime);
    const context = this;
    
    clearTimeout(timer);
    
    if (remaining <= 0) {
      fn.apply(context, args);
      startTime = Date.now();
    } else {
      timer = setTimeout(() => {
        fn.apply(context, args);
      }, remaining);
    }
  };
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间(ms)
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay = 500) {
  let timer = null;
  
  return function(...args) {
    const context = this;
    
    clearTimeout(timer);
    
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}

/**
 * 检查并更新小程序
 */
function checkForUpdate() {
  if (wx.canIUse('getUpdateManager')) {
    const updateManager = wx.getUpdateManager();
    
    updateManager.onCheckForUpdate(function(res) {
      if (res.hasUpdate) {
        updateManager.onUpdateReady(function() {
          wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，重启应用以使用新版本',
            showCancel: false,
            success: function(res) {
              if (res.confirm) {
                updateManager.applyUpdate();
              }
            }
          });
        });
        
        updateManager.onUpdateFailed(function() {
          wx.showModal({
            title: '更新提示',
            content: '新版本下载失败，请检查网络后重试',
            showCancel: false
          });
        });
      }
    });
  }
}

module.exports = {
  formatTime,
  formatRelativeTime,
  deepClone,
  randomString,
  throttle,
  debounce,
  checkForUpdate
}
