// 登录云函数 - 只保留微信登录
const cloud = require('wx-server-sdk')
// 引入网络请求模块
const axios = require('axios')
// 引入crypto模块用于openid处理
const crypto = require('crypto')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

// 设置更长的超时时间
cloud.timeout = 15000; // 15秒超时

const db = cloud.database()

// 主服务器API地址
const API_BASE_URL = 'https://nkuwiki.com'

/**
 * 将微信原始openid转换为十六进制字符串格式
 * @param {string} openid - 微信原始openid
 * @returns {string} - 转换后的十六进制字符串
 */
function formatOpenid(openid) {
  if (!openid) return '';
  
  // 使用md5将openid转换为一致的十六进制字符串
  return crypto.createHash('md5').update(openid).digest('hex');
}

// 将用户信息同步到主服务器
async function syncUserToMainServer(userData) {
  console.log('====== 开始同步用户到主服务器 ======')
  console.log('输入用户数据:', JSON.stringify(userData))
  
  if (!userData || !userData._id || !userData.openid) {
    console.error('用户数据不完整，无法同步')
    return {
      success: false,
      error: '用户数据不完整，无法同步'
    }
  }
  
  try {
    // 使用userData._id作为格式化后的openid
    const formattedOpenid = userData._id;
    console.log('原始openid:', userData.openid);
    console.log('使用_id作为格式化openid:', formattedOpenid);
    
    // 严格按照API文档中的UserSyncRequest模型构造数据
    const syncRequest = {
      // 必填字段
      "openid": formattedOpenid,
      "unionid": userData.unionid || "",
      "nick_name": userData.nickName || ('用户' + formattedOpenid.slice(-4)),
      "avatar": userData.avatarUrl || "/assets/icons/default-avatar.png",
      "gender": userData.gender || 0,
      "country": userData.country || "",
      "province": userData.province || "",
      "city": userData.city || "",
      "language": userData.language || "",
      "university": userData.university || "南开大学",
      "login_type": "wechat"
    };
    
    // 打印请求信息（减少日志量）
    console.log('请求URL:', `${API_BASE_URL}/wxapp/users/sync`)
    console.log('请求方法: POST')
    
    // 发送到主服务器
    console.log('开始发送请求...')
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/wxapp/users/sync`,
      data: syncRequest,
      timeout: 10000, // 10秒超时
      headers: {
        'Content-Type': 'application/json',
        'X-Cloud-Source': 'wxapp',
        'X-Prefer-Cloud-ID': 'false'
      }
    })
    
    // 简化日志输出
    console.log('同步请求完成，状态码:', response.status)
    
    if (response.status >= 200 && response.status < 300) {
      console.log('用户同步到主服务器成功')
      
      // 返回主服务器的用户信息
      return {
        success: true,
        status: response.status,
        data: response.data.data || response.data,
        message: '用户同步成功'
      }
    } else {
      console.error(`同步用户到主服务器返回非成功状态码: ${response.status}`)
      return {
        success: false,
        status: response.status,
        error: '服务器返回错误状态码'
      }
    }
  } catch (error) {
    // 简化错误日志
    console.error('同步用户到主服务器失败:', error.message)
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('======= 云函数开始执行 =======')
  
  const wxContext = cloud.getWXContext()
  
  try {
    const now = db.serverDate()

    // 微信登录 - 快速路径：先尝试只获取必要字段
    const userResult = await db.collection('users')
      .where({ openid: wxContext.OPENID })
      .field({ _id: true, openid: true, loginType: true, nickName: true, avatarUrl: true })
      .get();

    let userData = null
    let isNewUser = false

    if (userResult.data.length === 0) {
      // 用户不存在，创建新用户（使用最小化数据）
      const newUser = {
        openid: wxContext.OPENID,
        loginType: 'wechat',
        nickName: '用户' + wxContext.OPENID.slice(-4),
        avatarUrl: '/assets/icons/default-avatar.png',
        gender: 0,
        university: '南开大学',
        createTime: now,
        updateTime: now
      }

      const addResult = await db.collection('users').add({
        data: newUser
      })

      userData = {
        ...newUser,
        _id: addResult._id
      }
      isNewUser = true
    } else {
      // 用户存在，获取基本信息
      userData = userResult.data[0]

      // 如果需要，异步更新loginType（不等待结果）
      if (!userData.loginType) {
        db.collection('users').doc(userData._id).update({
          data: {
            loginType: 'wechat',
            updateTime: now
          }
        }).catch(err => {
          console.error('更新loginType失败:', err.message)
        });
        userData.loginType = 'wechat'
      }
    }

    // 同步用户到主服务器 (精简版本)
    const formattedOpenid = userData._id;
    
    // 构造最小化请求数据
    const syncRequest = {
      "openid": formattedOpenid,
      "nick_name": userData.nickName || ('用户' + formattedOpenid.slice(-4)),
      "avatar": userData.avatarUrl || "/assets/icons/default-avatar.png",
      "gender": 0,
      "university": userData.university || "南开大学",
      "login_type": "wechat"
    };
    
    // 发送到主服务器 (使用Promise.race添加额外超时保护)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('同步请求超时')), 2000)
    );
    
    const syncPromise = axios({
      method: 'POST',
      url: `${API_BASE_URL}/wxapp/users/sync`,
      data: syncRequest,
      timeout: 2000, // 降低到2秒
      headers: {
        'Content-Type': 'application/json',
        'X-Cloud-Source': 'wxapp'
      }
    });
    
    // 首先准备返回对象（默认不同步）
    const resultData = {
      // 用户基本信息
      _id: userData._id,
      openid: userData._id,
      wx_openid: userData.openid,
      nick_name: userData.nickName || ('用户' + userData._id.slice(-4)),
      avatar: userData.avatarUrl || '/assets/icons/default-avatar.png',
      gender: userData.gender || 0,
      university: userData.university || '南开大学',
      
      // 额外信息
      login_type: 'wechat',
      cloud_id: userData._id,
      server_synced: false
    };
    
    // 尝试同步，但不让它阻止返回
    Promise.race([syncPromise, timeoutPromise])
      .then(response => {
        if (response.status >= 200 && response.status < 300) {
          console.log('用户同步成功');
          
          // 异步更新云数据库
          const resultUserData = response.data.data || response.data;
          db.collection('users').doc(userData._id).update({
            data: {
              server_synced: true,
              server_sync_time: db.serverDate(),
              formatted_openid: userData._id,
              nickName: resultUserData.nick_name || userData.nickName,
              avatarUrl: resultUserData.avatar || userData.avatarUrl,
              gender: resultUserData.gender || 0,
              university: resultUserData.university || '南开大学',
              updateTime: db.serverDate()
            }
          }).catch(err => {
            console.error('用户数据异步更新失败:', err.message);
          });
        }
      })
      .catch(err => {
        console.error('同步用户失败:', err.message);
      });
    
    // 直接返回结果，不等待同步完成
    return {
      code: 0,
      data: resultData,
      message: isNewUser ? '新用户创建成功' : '登录成功',
      syncResult: '异步同步中' // 同步结果将异步处理
    };

  } catch (err) {
    console.error('登录失败：', err.message)
    return {
      code: -1,
      message: '登录失败：' + err.message
    }
  } finally {
    console.log('======= 云函数执行结束 =======')
  }
}