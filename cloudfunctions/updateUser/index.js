const cloud = require('wx-server-sdk')
cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { nickName, status, avatarUrl, userId, loginType } = event

  try {
    let query = {}
    
    // 根据登录类型构建查询条件
    if (loginType === 'email') {
      query._id = userId  // 邮箱登录用户使用 _id 查询
    } else {
      query.openid = OPENID  // 微信登录用户使用 openid 查询
    }

    // 构建更新数据对象，只包含实际需要更新的字段
    const updateData = {
      updateTime: db.serverDate()
    }
    
    // 只有当字段有值时才更新该字段
    if (nickName !== undefined) updateData.nickName = nickName
    if (status !== undefined) updateData.status = status
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

    const res = await db.collection('users')
      .where(query)
      .update({
        data: updateData
      })

    return {
      code: 0,
      success: true,
      message: '更新成功',
      data: res
    }
  } catch (err) {
    console.error('[updateUser] 错误：', err)
    return {
      code: -1,
      success: false,
      message: err.message || '更新失败'
    }
  }
} 