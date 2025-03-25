// 获取用户帖子云函数 - 改为后端API调用
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('调用getUserPosts云函数:', {
    用户openid: openid,
    事件参数: event
  })
  
  // 获取统计数据模式
  if (event.countOnly) {
    try {
      // 调用统计API
      const apiUrl = `/api/wxapp/users/posts/count?openid=${openid}`;
      
      // 使用云函数http请求能力访问API
      const result = await cloud.httpApi.invoke({
        method: 'GET',
        url: 'https://nkuwiki.com' + apiUrl,
        headers: {
          'X-User-OpenID': openid
        }
      });

      // 处理API响应
      if (result.statusCode === 200) {
        const responseData = JSON.parse(result.body);
        console.log('统计结果:', responseData);
        
        return {
          success: true,
          count: responseData.data.count
        }
      } else {
        console.error('获取帖子统计API调用失败:', result);
        throw new Error('获取统计数据失败');
      }
      
    } catch (err) {
      console.error('获取帖子数量失败：', err);
      return {
        success: false,
        message: '获取数据失败'
      }
    }
  } else {
    // 获取帖子列表模式
    try {
      const { page = 1, pageSize = 10 } = event;
      
      console.log('开始获取帖子列表, 请求参数:', { 
        openid: openid,
        页码: page,
        每页数量: pageSize
      });
      
      // 调用后端API获取用户帖子列表
      const apiUrl = `/api/wxapp/users/posts?openid=${openid}&page=${page}&limit=${pageSize}`;
      
      // 使用云函数http请求能力访问API
      const result = await cloud.httpApi.invoke({
        method: 'GET',
        url: 'https://nkuwiki.com' + apiUrl,
        headers: {
          'X-User-OpenID': openid
        }
      });

      // 处理API响应
      if (result.statusCode === 200) {
        const responseData = JSON.parse(result.body);
        console.log('查询结果:', responseData);
        
        return {
          success: true,
          posts: responseData.data.posts,
          total: responseData.data.total
        }
      } else {
        console.error('获取用户帖子API调用失败:', result);
        throw new Error('获取用户帖子列表失败');
      }
      
    } catch (err) {
      console.error('获取用户帖子列表失败：', err);
      return {
        success: false,
        message: '获取帖子列表失败'
      }
    }
  }
} 