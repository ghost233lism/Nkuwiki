// 登录云函数 - 只保留微信登录
const cloud = require('wx-server-sdk')
cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const now = db.serverDate()

    // 微信登录
    const userResult = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()

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

      return {
        code: 0,
        data: {
          ...newUser,
          _id: addResult._id
        },
        message: '新用户创建成功'
      }
    }

    const user = userResult.data[0]

    // 更新或添加loginType
    if (!user.loginType) {
      await db.collection('users').doc(user._id).update({
        data: {
          loginType: 'wechat',
          updateTime: now
        }
      })
    }

    return {
      code: 0,
      data: {
        ...user,
        loginType: 'wechat'
      },
      message: '登录成功'
    }

  } catch (err) {
    console.error('登录失败：', err)
    return {
      code: -1,
      message: '登录失败：' + err.message
    }
  }
}