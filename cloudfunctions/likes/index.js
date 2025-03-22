// 优化点赞云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

const db = cloud.database()
const _ = db.command

// 切换点赞状态
async function toggleLike(openid, postId) {
  console.log('处理点赞请求:', { openid, postId });
  
  if (!openid || !postId) {
    console.log('参数错误:', { openid, postId });
    return {
      success: false,
      message: '参数错误'
    };
  }

  try {
    // 先检查帖子是否存在
    const postQuery = await db.collection('posts').where({
      _id: postId
    }).get();
    
    if (!postQuery.data || postQuery.data.length === 0) {
      console.log('帖子不存在:', postId);
      return {
        success: false,
        message: '帖子不存在或已被删除'
      };
    }

    const post = postQuery.data[0];
    const likedUsers = post.likedUsers || [];
    const hasLiked = likedUsers.includes(openid);
    
    console.log('当前点赞状态:', {
      postId,
      likes: post.likes || 0,
      hasLiked,
      likedUsersCount: likedUsers.length
    });

    // 更新点赞状态
    await db.collection('posts').doc(postId).update({
      data: {
        likes: hasLiked ? _.inc(-1) : _.inc(1),
        likedUsers: hasLiked ? _.pull(openid) : _.addToSet(openid), // 使用addToSet防止重复添加
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      hasLiked: !hasLiked,
      message: hasLiked ? '取消点赞成功' : '点赞成功'
    };
  } catch (err) {
    console.error('点赞操作失败:', err);
    return {
      success: false,
      message: '操作失败：' + err.message
    };
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { type, postId } = event;
  
  console.log('接收到的请求:', {
    type,
    postId,
    openid: wxContext.OPENID
  });

  if (!wxContext.OPENID) {
    return {
      success: false,
      message: '未获取到用户身份'
    };
  }

  try {
    switch (type) {
      case 'toggleLike':
        return await toggleLike(wxContext.OPENID, postId);
      default:
        return {
          success: false,
          message: '未知操作类型'
        };
    }
  } catch (err) {
    console.error('云函数执行错误:', err);
    return {
      success: false,
      message: '服务器错误：' + err.message
    };
  }
};

// 更新用户获赞统计
async function updateUserLikeStats(userId, delta) {
  try {
    if (!userId) return
    
    await db.collection('users').doc(userId).update({
      data: {
        likes: _.inc(delta)
      }
    })
  } catch (err) {
    console.error('更新用户获赞数失败：', err)
  }
}