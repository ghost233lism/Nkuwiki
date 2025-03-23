// 登录云函数 - 只保留微信登录
const cloud = require('wx-server-sdk')
// 引入网络请求模块
const axios = require('axios')
// 引入crypto模块用于openid处理
const crypto = require('crypto')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})
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
    // 转换微信原始openid为十六进制格式
    const formattedOpenid = formatOpenid(userData.openid);
    console.log('原始openid:', userData.openid);
    console.log('格式化后的openid:', formattedOpenid);
    
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
    
    // 打印完整的请求信息
    console.log('完整请求URL:', `${API_BASE_URL}/wxapp/users/sync`)
    console.log('请求方法: POST')
    console.log('最终请求体:', JSON.stringify(syncRequest))
    
    // 发送到主服务器
    console.log('开始发送请求...')
    
    const response = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/wxapp/users/sync`,
      data: syncRequest,
      timeout: 15000, // 增加超时时间到15秒
      headers: {
        'Content-Type': 'application/json',
        'X-Cloud-Source': 'wxapp',
        'X-Prefer-Cloud-ID': 'false'
      }
    })
    
    // 详细记录响应
    console.log('同步请求完成')
    console.log('状态码:', response.status)
    console.log('响应头:', JSON.stringify(response.headers))
    console.log('响应数据:', JSON.stringify(response.data))
    
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
    // 详细记录错误信息
    console.error('同步用户到主服务器失败:', error.message)
    
    if (error.response) {
      // 服务器响应了，但状态码不在2xx范围
      console.error('服务器响应状态码:', error.response.status)
      console.error('响应数据:', JSON.stringify(error.response.data))
      console.error('请求URL:', error.config.url)
      console.error('请求方法:', error.config.method)
      console.error('请求头:', JSON.stringify(error.config.headers))
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到服务器响应，请检查网络或服务器状态')
      console.error('请求详情:', error.request._currentUrl || error.request.responseURL || '未知')
    } else {
      // 设置请求时发生错误
      console.error('请求设置错误:', error.message)
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null,
      requestInfo: error.config ? {
        url: error.config.url,
        method: error.config.method
      } : null
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('======= 云函数开始执行 =======')
  console.log('事件参数:', JSON.stringify(event))
  console.log('上下文:', JSON.stringify(context))
  
  const wxContext = cloud.getWXContext()
  console.log('wxContext:', JSON.stringify(wxContext))
  
  try {
    const now = db.serverDate()
    console.log('开始查询用户数据...')

    // 微信登录
    const userResult = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()
    console.log('用户查询结果:', JSON.stringify(userResult))

    let userData = null
    let isNewUser = false

    if (userResult.data.length === 0) {
      const newUser = {
        openid: wxContext.OPENID,
        loginType: 'wechat',
        nickName: '用户' + wxContext.OPENID.slice(-4),
        avatarUrl: '/assets/icons/default-avatar.png',
        gender: 0,
        country: '',
        province: '',
        city: '',
        language: '',
        status: '这个人很懒，什么都没写~',
        university: '南开大学',
        posts: 0,
        likes: 0,
        following: 0,
        followers: 0,
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
      userData = userResult.data[0]

      // 更新或添加loginType
      if (!userData.loginType) {
        await db.collection('users').doc(userData._id).update({
          data: {
            loginType: 'wechat',
            updateTime: now
          }
        })
        userData.loginType = 'wechat'
      }
    }

    // 同步用户到主服务器
    console.log('准备同步用户到主服务器...')
    console.log('用户数据:', JSON.stringify(userData))
    const syncResult = await syncUserToMainServer(userData)
    console.log('同步用户完成，结果:', JSON.stringify(syncResult))
    
    // 如果同步成功，使用服务器返回的用户信息
    let resultUserData = userData;
    
    if (syncResult.success && syncResult.data) {
      // 使用服务器返回的用户信息，更加完整
      resultUserData = syncResult.data;
      
      // 确保将云数据库ID一并返回
      resultUserData._id = userData._id;
      
      // 更新云数据库中的用户，添加同步状态和服务器返回的信息
      await db.collection('users').doc(userData._id).update({
        data: {
          server_synced: true,
          server_sync_time: now,
          formatted_openid: formatOpenid(userData.openid), // 存储格式化的openid
          nickName: resultUserData.nick_name,
          avatarUrl: resultUserData.avatar,
          gender: resultUserData.gender || 0,
          country: resultUserData.country || '',
          province: resultUserData.province || '',
          city: resultUserData.city || '',
          language: resultUserData.language || '',
          university: resultUserData.university || '南开大学',
          updateTime: now
        }
      })
    } else {
      console.warn('用户同步失败，仅使用云数据库用户信息，原因:', syncResult.error || '未知错误')
    }

    // 返回结果
    return {
      code: 0,
      data: {
        // 用户基本信息
        _id: resultUserData._id,
        openid: formatOpenid(userData.openid), // 返回格式化的openid
        wx_openid: userData.openid, // 原始微信openid
        unionid: resultUserData.unionid || '',
        nick_name: resultUserData.nick_name || resultUserData.nickName,
        avatar: resultUserData.avatar || resultUserData.avatarUrl,
        gender: resultUserData.gender || 0,
        country: resultUserData.country || '',
        province: resultUserData.province || '',
        city: resultUserData.city || '',
        language: resultUserData.language || '',
        university: resultUserData.university || '南开大学',
        
        // 额外信息
        login_type: 'wechat',
        cloud_id: resultUserData._id,
        server_synced: syncResult.success
      },
      message: isNewUser ? '新用户创建成功' : '登录成功',
      syncResult: syncResult.success ? '同步成功' : '同步失败:' + (syncResult.error || '未知错误')
    }

  } catch (err) {
    console.error('登录失败：', err)
    console.error('错误堆栈：', err.stack)
    return {
      code: -1,
      message: '登录失败：' + err.message,
      stack: err.stack
    }
  } finally {
    console.log('======= 云函数执行结束 =======')
  }
}