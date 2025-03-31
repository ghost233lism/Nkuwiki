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
 * 获取用户OpenID
 * @param {boolean} showLoading - 是否显示加载中提示，默认为true
 * @returns {Promise<string>} 用户OpenID
 */
const getOpenID = async (showLoading = true) => {
  try {
    // 先尝试从本地获取openid
    let openid = wx.getStorageSync('openid');
    if (openid) {
      console.debug('从本地获取到openid:', openid);
      return openid;
    }
    
    // 调用云函数获取openid
    console.debug('本地无openid，准备调用getOpenID云函数');
    
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
    
    // 最多尝试3次
    let retryCount = 0;
    let wxCloudResult = null;
    
    while (retryCount < 3 && !wxCloudResult) {
      try {
        wxCloudResult = await wx.cloud.callFunction({
          name: 'getOpenID',
          timeout: 10000 // 设置超时时间为10秒
        });
        break; // 成功获取，跳出循环
      } catch (err) {
        retryCount++;
        console.error(`调用getOpenID云函数失败，第${retryCount}次尝试:`, err);
        
        if (retryCount >= 3) {
          if (showLoading) wx.hideLoading();
          
          // 只在显示loading的模式下显示错误提示
          if (showLoading) {
            wx.showToast({
              title: '获取用户信息失败，请重试',
              icon: 'none',
              duration: 2000
            });
          }
          return null;
        }
        
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 隐藏loading
    if (showLoading) wx.hideLoading();
    
    console.debug('getOpenID云函数调用结果:', wxCloudResult);
    
    if (wxCloudResult && wxCloudResult.result && 
        wxCloudResult.result.code === 0 && 
        wxCloudResult.result.data && 
        wxCloudResult.result.data.openid) {
      
      openid = wxCloudResult.result.data.openid;
      // 存储到本地
      wx.setStorageSync('openid', openid);
      console.debug('成功获取并存储openid:', openid);
      return openid;
    } else {
      console.error('getOpenID云函数返回格式不正确:', wxCloudResult);
      
      // 只在显示loading的模式下显示错误提示
      if (showLoading) {
        wx.showToast({
          title: '获取用户标识失败',
          icon: 'none',
          duration: 2000
        });
      }
      return null;
    }
  } catch (err) {
    // 确保隐藏loading
    if (showLoading) wx.hideLoading();
    
    console.error('获取OpenID失败:', err);
    
    // 只在显示loading的模式下显示错误提示
    if (showLoading) {
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
    return null;
  }
};

module.exports = {
  formatTime,
  formatRelativeTime,
  getOpenID
}
