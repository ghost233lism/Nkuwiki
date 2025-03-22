// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // const openid = event.openid ||  wxContext.OPENID
  // // 点赞无法记录用户id，只能记录openid
  const openid = wxContext.OPENID
  const like_fav_comment = event.type
  console.log('like_fav_comment : ', like_fav_comment)
  
  console.log('调用getUserlike_fav_comment云函数:', {
    用户openid: openid,
    事件参数: event
  })
  
  // 检查 users 集合，找到对应的 authorId
  let authorId = openid
  try {
    // 尝试查询用户记录，获取实际的 authorId
    const userResult = await db.collection('users').where({
      openid: openid
    }).get()
    
    console.log('用户查询结果:', userResult)
    
    // if (userResult.data && userResult.data.length > 0) {
    //   // 使用 _id 作为 authorId
    //   authorId = userResult.data[0]._id || openid
    //   console.log('找到用户ID:', authorId)
    // } else {
    //   console.log('未找到用户，尝试使用openid作为authorId')
    // }
    authorId = openid
    // 点赞无法记录用户id，只能记录openid
  } catch (err) {
    console.error('查询用户信息失败:', err)
  }
  
  // 查询第一条帖子，了解字段结构
  try {
    const samplePost = await db.collection('posts').limit(1).get()
    if (samplePost.data && samplePost.data.length > 0) {
      console.log('帖子示例数据字段:', Object.keys(samplePost.data[0]))
      console.log('帖子authorId字段值:', samplePost.data[0].authorId)
    }
  } catch (err) {
    console.error('获取示例帖子失败:', err)
  }
  
  // 获取帖子列表模式
  try {
    const { page = 1, pageSize = 10 } = event
    const skip = (page - 1) * pageSize
    
    console.log('开始获取帖子列表, 查询条件:', { 
      authorId: authorId,
      页码: page,
      每页数量: pageSize
    })

    let postsResult = null
    if (event.type === 'like'){
      postsResult = await db.collection('posts')
      .where({
        likedUsers: authorId
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    }
    if (event.type === 'star'){
      postsResult = await db.collection('posts')
      .where({
        favoriteUsers: authorId
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    }
    if (event.type === 'comment'){
      postsResult = await db.collection('posts')
      .where({
        'comments.authorId': authorId
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    }

    return {
      success: true,
      posts: postsResult.data,
      total: postsResult.data.length
    }
  } catch (err) {
    console.error('获取用户帖子列表失败：', err)
    return {
      success: false,
      message: '获取帖子列表失败'
    }
  }

  // return {
  //   event,
  //   openid: wxContext.OPENID,
  //   appid: wxContext.APPID,
  //   unionid: wxContext.UNIONID,
  // }
}