// 获取用户帖子云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('调用getUserPosts云函数:', {
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
    
    if (userResult.data && userResult.data.length > 0) {
      // 使用 _id 作为 authorId
      authorId = userResult.data[0]._id || openid
      console.log('找到用户ID:', authorId)
    } else {
      console.log('未找到用户，尝试使用openid作为authorId')
    }
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
  
  // 获取统计数据模式
  if (event.countOnly) {
    try {
      // 尝试多种可能的author字段查询
      console.log('尝试使用authorId查询:', authorId)
      
      const countResult = await db.collection('posts')
        .where({
          authorId: authorId
        })
        .count()
      
      console.log('统计结果:', countResult)
      
      return {
        success: true,
        count: countResult.total
      }
    } catch (err) {
      console.error('获取帖子数量失败：', err)
      return {
        success: false,
        message: '获取数据失败'
      }
    }
  } else {
    // 获取帖子列表模式
    try {
      const { page = 1, pageSize = 10 } = event
      const skip = (page - 1) * pageSize
      
      console.log('开始获取帖子列表, 查询条件:', { 
        authorId: authorId,
        页码: page,
        每页数量: pageSize
      })
      
      const postsResult = await db.collection('posts')
        .where({
          authorId: authorId
        })
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()
      
      console.log('查询结果:', postsResult)
      
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
  }
} 