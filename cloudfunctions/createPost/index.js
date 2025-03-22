const cloud = require('wx-server-sdk')
cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { content, images = [], title = '', isPublic, authorId, authorName, authorAvatar, loginType } = event
  
  // 在云函数开始时记录所有参数
  console.log('createPost函数参数:', {
    content, 
    images, 
    title, 
    isPublic, 
    authorId, 
    authorName, 
    authorAvatar, 
    loginType,
    OPENID: cloud.getWXContext().OPENID
  })
  
  // 检查标题和内容是否为空
  if (!title.trim()) {
    return {
      code: -1,
      message: '帖子标题不能为空'
    }
  }
  
  if (!content.trim()) {
    return {
      code: -1,
      message: '帖子内容不能为空'
    }
  }
  
  // 尝试列出所有用户，检查是否能找到匹配的ID
  const allUsers = await db.collection('users').get()
  console.log('数据库中的所有用户:', allUsers.data.map(u => ({ 
    id: u._id, 
    name: u.nickName,
    loginType: u.loginType
  })))

  try {
    // 获取用户信息
    const userInfo = (await db.collection('users').where({
      openid: OPENID
    }).get()).data[0]

    if (!userInfo) {
      return {
        success: false,
        message: '用户未登录'
      }
    }

    // 使用当前登录用户的ID作为作者ID，而不是依赖前端传递
    const authorId = userInfo._id
    const authorName = userInfo.nickName || '匿名用户'
    const authorAvatar = userInfo.avatarUrl || '/assets/icons/default-avatar.png'
    const loginType = userInfo.loginType || 'wechat'

    // 打印接收到的数据
    console.log('接收到的数据：', {
      content,
      images,
      title
    })

    // 验证用户身份
    const userCheck = await db.collection('users').doc(authorId).get()
    if (!userCheck.data || userCheck.data.loginType !== loginType) {
      return {
        code: -1,
        message: '用户身份验证失败'
      }
    }

    // 创建帖子
    const result = await db.collection('posts').add({
      data: {
        title,
        content,
        images,
        authorId,
        authorName,
        authorAvatar,
        loginType,  // 存储登录类型
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        isPublic: isPublic !== false,
        status: 'published',
        likes: 0,
        comments: [],
        favoriteUsers: [],
        likedUsers: [],
        tags: [],
        isHot: false,
        isTop: false,
        views: 0,
        category: ''
      }
    })

    console.log('创建帖子结果：', result)

    return {
      code: 0,
      data: result._id,
      message: '发布成功'
    }

  } catch (err) {
    console.error('发布失败：', err)
    return {
      code: -1,
      message: '发布失败'
    }
  }
} 