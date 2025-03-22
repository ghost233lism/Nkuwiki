// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command  // 这是关键！需要使用指令操作

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  console.log('添加评论:', {
    postId: event.postId,
    content: event.content,
    openid: openid
  })
  
  if (!event.postId) {
    return {
      success: false,
      message: '帖子ID不能为空'
    }
  }
  
  if (!event.content && (!event.images || event.images.length === 0)) {
    return {
      success: false,
      message: '评论内容不能为空'
    }
  }
  
  try {
    // 查询用户集合
    let userInfo = null;
    
    // 打印当前用户openid方便调试
    console.log(`准备查询用户，openid: ${openid}`);
    
    // 尝试使用多个可能的字段查询用户
    try {
      // 尝试方法1: 使用openid字段查询
      const userRes1 = await db.collection('users').where({
        openid: openid
      }).get();
      
      if (userRes1.data && userRes1.data.length > 0) {
        userInfo = userRes1.data[0];
        console.log(`通过openid字段找到用户: ${userInfo.nickName || userInfo.userName || 'unknown'}`);
      } else {
        // 尝试方法2: 使用_openid字段查询
        const userRes2 = await db.collection('users').where({
          _openid: openid
        }).get();
        
        if (userRes2.data && userRes2.data.length > 0) {
          userInfo = userRes2.data[0];
          console.log(`通过_openid字段找到用户: ${userInfo.nickName || userInfo.userName || 'unknown'}`);
        } else {
          // 尝试方法3: 使用_id作为openid查询
          const userRes3 = await db.collection('users').doc(openid).get()
            .catch(err => ({ data: null }));
            
          if (userRes3.data) {
            userInfo = userRes3.data;
            console.log(`通过_id字段找到用户: ${userInfo.nickName || userInfo.userName || 'unknown'}`);
          } else {
            console.log('未找到用户记录');
          }
        }
      }
    } catch (err) {
      console.error('查询用户出错:', err);
    }
    
    // 查看用户集合结构
    console.log('调试用户集合结构');
    try {
      const allUsers = await db.collection('users').limit(1).get();
      if (allUsers.data && allUsers.data.length > 0) {
        const sampleUser = allUsers.data[0];
        console.log('用户集合示例数据结构:', Object.keys(sampleUser));
        console.log('用户标识字段:', {
          _id: sampleUser._id,
          openid: sampleUser.openid || '无',
          _openid: sampleUser._openid || '无',
          nickname字段: sampleUser.nickName || sampleUser.nickname || sampleUser.userName || '无'
        });
      }
    } catch (err) {
      console.error('获取用户集合示例失败:', err);
    }
    
    // 处理评论图片
    const images = event.images || [];
    
    // 确保图片URL是云存储路径
    const validImages = images.filter(img => 
      typeof img === 'string' && 
      (img.startsWith('cloud://') || img.startsWith('https://'))
    );
    
    // 创建评论数据，使用找到的用户信息或默认值
    // 修复：定义now变量
    const now = new Date();
    const userName = userInfo ? 
      (userInfo.nickName || userInfo.nickname || userInfo.userName || '用户') : 
      '用户';
    
    const userAvatar = userInfo ? 
      (userInfo.avatarUrl || userInfo.avatar || '/assets/icons/default-avatar.png') : 
      '/assets/icons/default-avatar.png';
    
    const comment = {
      _id: 'comment_' + now.getTime() + '_' + Math.random().toString(36).substr(2, 8),
      authorId: openid,
      authorName: userName,
      authorAvatar: userAvatar,
      content: event.content || '',
      images: validImages,  // 使用验证后的图片URL数组
      createTime: now.toISOString(),
      timestamp: now.getTime()
    }
    
    console.log('创建的评论对象:', comment);
    
    // 使用原子操作添加评论
    const updateResult = await db.collection('posts').doc(event.postId).update({
      data: {
        comments: _.push(comment)
      }
    })
    
    console.log('评论添加结果:', updateResult);
    
    if (!updateResult.stats || updateResult.stats.updated !== 1) {
      return {
        success: false,
        message: '添加评论失败'
      }
    }
    
    return {
      success: true,
      comment: comment
    }
  } catch (err) {
    console.error('添加评论出错:', err);
    return {
      success: false,
      message: err.message || '添加评论失败'
    }
  }
} 