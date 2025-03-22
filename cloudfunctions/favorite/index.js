// 收藏功能云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

const db = cloud.database()
const _ = db.command

// 切换收藏状态 
async function toggleFavorite(openid, postId) {
  console.log('处理收藏请求:', { openid, postId });
  
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
    const favoriteUsers = post.favoriteUsers || [];
    const hasFavorited = favoriteUsers.includes(openid);
    
    console.log('当前收藏状态:', {
      postId,
      hasFavorited,
      favoriteUsersCount: favoriteUsers.length
    });

    // 更新收藏状态
    await db.collection('posts').doc(postId).update({
      data: {
        favoriteUsers: hasFavorited ? _.pull(openid) : _.addToSet(openid), // 使用addToSet防止重复添加
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      hasFavorited: !hasFavorited,
      message: hasFavorited ? '取消收藏成功' : '收藏成功'
    };
  } catch (err) {
    console.error('收藏操作失败:', err);
    return {
      success: false,
      message: '操作失败：' + err.message
    };
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { postId } = event;
  
  console.log('接收到的收藏请求:', {
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
    return await toggleFavorite(wxContext.OPENID, postId);
  } catch (err) {
    console.error('云函数执行错误:', err);
    return {
      success: false,
      message: '服务器错误：' + err.message
    };
  }
}; 