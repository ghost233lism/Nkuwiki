// 登录云函数 - 只保留微信登录
const cloud = require('wx-server-sdk')
// 引入网络请求模块
const axios = require('axios')
// 引入crypto模块用于openid处理
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 设置超时时间，单位为毫秒
const TIMEOUT = 10000

// 数据库引用
const db = cloud.database()
const userCollection = db.collection('users')
const _ = db.command

// 主服务器API地址
const API_BASE_URL = 'https://nkuwiki.com'

/**
 * 将微信原始openid转换为十六进制字符串格式
 * @param {string} openid - 微信原始openid
 * @returns {string} - 转换后的十六进制字符串
 */
function formatOpenid(wxOpenid) {
  // 如果wxOpenid包含特殊字符，或长度不正确，则需要特殊处理
  if (!wxOpenid || typeof wxOpenid !== 'string') {
    console.error('Invalid wxOpenid format:', wxOpenid)
    return null
  }
  
  return wxOpenid.trim()
}

// 异步函数：同步用户数据到主服务器
async function syncUserToServer(userData) {
  try {
    // 服务器地址从环境变量获取，如果没有设置则使用默认值
    const serverUrl = process.env.SERVER_URL || 'https://nkuwiki.com'
    
    // 构建同步请求数据
    const syncData = {
      openid: userData.openid,
      nickname: userData.nickName || userData.nickname || '',
      avatar_url: userData.avatarUrl || userData.avatar_url || '',
      gender: userData.gender || 0,
      country: userData.country || '',
      province: userData.province || '',
      city: userData.city || '',
      language: userData.language || 'zh_CN',
      last_login: new Date().toISOString()
    }
    
    console.log('Syncing user data to server:', JSON.stringify(syncData))
    
    // 发送同步请求到主服务器，使用更新的API路径
    const response = await axios({
      method: 'post',
      url: `${serverUrl}/api/wxapp/users/sync`,
      data: syncData,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Server sync response:', JSON.stringify(response.data))
    
    if (response.data && response.data.code === 0) {
      // 成功同步
      return {
        success: true,
        data: response.data.data || {},
        message: '用户数据同步成功'
      }
    } else {
      // 同步失败，但是API访问成功，返回服务器的错误信息
      console.error('Server sync failed with response:', response.data)
      return {
        success: false,
        message: response.data.message || '用户数据同步失败',
        error: response.data
      }
    }
  } catch (error) {
    // 异常情况，比如网络错误、超时等
    console.error('Error syncing user to server:', error)
    return {
      success: false,
      message: '同步用户数据时发生错误',
      error: error.message || error
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = formatOpenid(wxContext.OPENID)
  
  if (!openid) {
    return {
      code: -1,
      message: '获取用户标识失败',
      data: null
    }
  }
  
  try {
    // 查询是否已存在该用户
    const userResult = await userCollection.where({
      openid: openid
    }).get()
    
    const now = new Date()
    let userData = null
    let isNewUser = false
    
    if (userResult.data.length === 0) {
      // 新用户，创建记录
      isNewUser = true
      userData = {
        openid: openid,
        unionid: wxContext.UNIONID || '',
        appid: wxContext.APPID || '',
        nickName: event.nickName || '',
        avatarUrl: event.avatarUrl || '',
        gender: event.gender || 0,
        country: event.country || '',
        province: event.province || '',
        city: event.city || '',
        language: event.language || 'zh_CN',
        created_at: now,
        last_login: now,
        // 更多用户字段可以在这里添加
        visit_count: 1
      }
      
      // 创建新用户
      await userCollection.add({
        data: userData
      })
      
      console.log('Created new user:', openid)
    } else {
      // 已存在的用户，更新数据
      userData = userResult.data[0]
      isNewUser = false
      
      // 更新登录信息
      await userCollection.where({
        openid: openid
      }).update({
        data: {
          last_login: now,
          visit_count: _.inc(1)
        }
      })
      
      console.log('Updated existing user:', openid)
    }
    
    // 异步同步到主服务器，不阻塞响应
    let syncPromise = syncUserToServer({
      openid: openid,
      nickName: userData.nickName || event.nickName || '',
      avatarUrl: userData.avatarUrl || event.avatarUrl || '',
      gender: userData.gender || event.gender || 0,
      country: userData.country || event.country || '',
      province: userData.province || event.province || '',
      city: userData.city || event.city || '',
      language: userData.language || event.language || 'zh_CN'
    })
    
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sync timeout')), TIMEOUT)
    )
    
    // 不等待同步完成，只记录日志
    Promise.race([syncPromise, timeoutPromise])
      .then(result => {
        console.log('User sync completed:', JSON.stringify(result))
      })
      .catch(error => {
        console.error('User sync failed:', error)
        // 同步失败不影响登录流程
      })
    
    // 立即返回登录成功
    return {
      code: 0,
      message: isNewUser ? '新用户创建成功' : '用户登录成功',
      data: {
        openid: openid,
        isNewUser: isNewUser,
        userData: userData
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      code: -1,
      message: '用户登录失败：' + (error.message || error),
      data: null
    }
  }
}