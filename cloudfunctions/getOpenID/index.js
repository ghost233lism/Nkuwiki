// 云函数入口文件 - 获取OpenID
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    
    // 检查是否成功获取到OPENID
    if (!wxContext.OPENID) {
      console.error('未能获取到OPENID:', wxContext);
      return {
        code: 500,
        message: '获取用户标识失败',
        data: null
      }
    }
    
    // 正确格式返回
    return {
      code: 200,
      message: '获取成功',
      data: {
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID || '',
      }
    }
  } catch (err) {
    console.error('获取用户标识时出错:', err);
    return {
      code: 500,
      message: '获取用户标识时发生错误: ' + err.message,
      data: null
    }
  }
}