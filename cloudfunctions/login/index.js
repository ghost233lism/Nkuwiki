// 登录云函数 - 只保留微信登录
const cloud = require('wx-server-sdk')
// 引入网络请求模块
const request = require('request-promise')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})
const db = cloud.database()

// 主服务器API地址
const API_BASE_URL = 'https://nkuwiki.com'

// 将用户信息同步到主服务器
async function syncUserToMainServer(userData) {
  try {
    console.log('开始同步用户到主服务器:', userData)
    
    // 构建用户数据
    const userPayload = {
      id: userData._id,          // 明确指定用户ID为云数据库ID
      _id: userData._id,         // 同时提供_id字段保证兼容性
      wxapp_id: userData.openid,
      openid: userData.openid,
      nickname: userData.nickName,
      avatar_url: userData.avatarUrl,
      university: userData.university || '南开大学',
      login_type: 'wechat',
      cloud_source: true,        // 标记来源为云数据库
      use_cloud_id: true         // 明确告知服务器使用传入的ID
    }
    
    // 发送到主服务器
    const response = await request({
      method: 'POST',
      url: `${API_BASE_URL}/wxapp/users/sync`,
      body: userPayload,
      json: true,
      timeout: 10000,
      headers: {
        'X-Cloud-Source': 'wxapp',     // 标记来源
        'X-Prefer-Cloud-ID': 'true'    // 标记优先使用云ID
      }
    })
    
    console.log('用户同步到主服务器成功:', response)
    
    // 返回主服务器的用户信息
    return {
      success: true,
      data: response.data || response,
      message: '用户同步成功'
    }
  } catch (error) {
    console.error('同步用户到主服务器失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const now = db.serverDate()

    // 微信登录
    const userResult = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()

    let userData = null
    let isNewUser = false

    if (userResult.data.length === 0) {
      const newUser = {
        openid: wxContext.OPENID,
        loginType: 'wechat',
        nickName: '用户' + wxContext.OPENID.slice(-4),
        avatarUrl: '/assets/icons/default-avatar.png',
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
    const syncResult = await syncUserToMainServer(userData)
    
    // 如果同步成功，使用服务器返回的用户信息
    if (syncResult.success && syncResult.data) {
      // 记录服务器的数据同步情况，但不覆盖我们的云ID
      // 确保客户端和服务器使用同一个ID
      userData.server_synced = true
      userData.server_sync_time = new Date().toISOString()
      
      // 更新云数据库中的用户，添加同步状态
      await db.collection('users').doc(userData._id).update({
        data: {
          server_synced: true,
          server_sync_time: now,
          updateTime: now
        }
      })
    } else {
      console.warn('用户同步失败，仅使用云数据库用户信息')
    }

    return {
      code: 0,
      data: userData,
      message: isNewUser ? '新用户创建成功' : '登录成功',
      syncResult: syncResult.success ? '同步成功' : '同步失败'
    }

  } catch (err) {
    console.error('登录失败：', err)
    return {
      code: -1,
      message: '登录失败：' + err.message
    }
  }
}