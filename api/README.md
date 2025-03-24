# 南开百科小程序 API 接口文档

本文档介绍南开百科小程序与后端服务的API交互方式。

## 概述

南开百科小程序通过以下几个模块的API与后端服务交互：

1. **用户 API** - 用户账户管理相关接口
2. **帖子 API** - 帖子发布、查询、点赞等接口
3. **评论 API** - 评论管理相关接口
4. **智能体 API** - AI智能体对话和知识搜索接口

## 使用方法

在小程序中，通过导入`utils/api.js`文件可以使用所有封装好的API调用方法：

```javascript
// 引入API工具
const { userAPI, postAPI, commentAPI, agentAPI } = require('../../utils/api/index');

// 示例：获取帖子列表
async function fetchPosts() {
  try {
    const posts = await postAPI.getPosts({
      limit: 20,
      offset: 0
    });
    return posts;
  } catch (error) {
    console.error('获取帖子失败:', error);
    return [];
  }
}
```

## 接口说明

各模块API详细说明请查看对应文档：

- [用户/帖子/评论 API](./wxapp_api.md) - 微信小程序主要数据交互接口
- [智能体 API](./agent_api.md) - AI智能体对话和知识搜索接口

## 错误处理

API调用可能会出现以下错误状态码：

- **200** - 请求成功
- **400** - 请求参数错误
- **401** - 未授权，需要登录
- **404** - 资源不存在
- **500** - 服务器内部错误

示例错误处理：

```javascript
try {
  const result = await userAPI.getUserInfo(userId);
  // 处理成功响应
} catch (error) {
  if (error.message.includes('未授权')) {
    // 处理未授权错误，如跳转登录页
  } else {
    // 处理其他错误
    wx.showToast({
      title: '操作失败: ' + error.message,
      icon: 'none'
    });
  }
}
```

## 开发说明

1. API接口模块使用Promise风格，建议使用async/await语法处理
2. 所有接口都已封装错误处理，将以友好方式提示用户
3. 授权Token会自动附加到请求头，无需手动处理
4. 日志系统会自动记录所有请求和响应，便于调试
