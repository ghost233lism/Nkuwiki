# 南开百科小程序

南开百科是一个知识共享平台，致力于构建南开知识共同体，践行"开源·共治·普惠"三位一体价值体系。

## 项目概述

- 微信小程序端代码
- 与后端API交互获取数据
- 提供用户互动、内容浏览、知识检索等功能

## 技术栈

- 微信小程序原生开发
- 云开发（仅用于登录鉴权）
- Promise / async-await 异步处理

## 目录结构

```plaintext
- pages/ # 页面文件夹
  - index/ # 首页
  - search/ # 搜索页
  - discover/ # 发现页
  - profile/ # 个人中心
  - login/ # 登录页
  - post/ # 发帖页
- api/ # API接口文档
- utils/ # 工具函数
  - api.js # API接口封装
  - util.js # 通用工具函数
- assets/ # 静态资源
- cloudfunctions/ # 云函数(仅用于登录鉴权)
```

## API接口使用说明

### 初始化

项目使用 `utils/api.js` 文件封装了所有后端API调用，在页面中导入即可使用：

```javascript
// 引入API模块
const { userAPI, postAPI, commentAPI, agentAPI, mysqlAPI } = require('../../utils/api/index');
```

### 示例：加载帖子列表

```javascript
async function loadPosts() {
  try {
    const params = {
      limit: 20,
      offset: 0,
      status: 1
    };
    
    const posts = await postAPI.getPosts(params);
    
    // 处理获取到的帖子数据
    this.setData({
      posts: posts
    });
  } catch (error) {
    console.error('加载帖子失败:', error);
    wx.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
}
```

### 示例：创建评论

```javascript
async function createComment(postId, content, images = []) {
  try {
    const userInfo = wx.getStorageSync('userInfo');
    
    const commentData = {
      wxapp_id: `comment_${Date.now()}`,
      post_id: postId,
      author_id: userInfo.id,
      author_name: userInfo.nickname || '用户',
      author_avatar: userInfo.avatar_url,
      content: content,
      images: images
    };
    
    const result = await commentAPI.createComment(commentData);
    return result;
  } catch (error) {
    console.error('创建评论失败:', error);
    throw error;
  }
}
```

### 示例：智能体对话

```javascript
async function chatWithAgent(query, history = []) {
  try {
    const response = await agentAPI.chat(query, history);
    return response;
  } catch (error) {
    console.error('智能体对话失败:', error);
    throw error;
  }
}
```

## 用户登录流程

1. 用户点击"微信一键登录"按钮
2. 调用云函数获取用户openid和基本信息
3. 将用户信息发送到后端API创建/更新用户
4. 存储合并后的用户信息（包含后端用户ID）
5. 用户完成登录

## 开发注意事项

1. API请求会自动处理授权Token，无需手动处理
2. 所有请求返回Promise，建议使用async/await语法处理
3. 页面重要操作应有加载状态和错误处理
4. 日志记录使用debug级别，方便调试

## 相关文档

- [API接口文档](./api/README.md)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
