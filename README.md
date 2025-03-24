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
  - api/ # API接口模块封装
    - index.js # API模块汇总导出
    - core.js # API核心功能
    - user.js # 用户相关API
    - post.js # 帖子相关API
    - comment.js # 评论相关API
    - notification.js # 通知相关API
    - feedback.js # 反馈相关API
    - agent.js # 智能体相关API
    - search.js # 搜索相关API
    - about.js # 关于信息API
  - util.js # 通用工具函数
- assets/ # 静态资源
- cloudfunctions/ # 云函数(仅用于登录鉴权)
```

## API文档使用指南

### API文档概述

项目的API文档位于 `api_docs.md` 文件中，详细描述了所有后端接口的使用方法、参数和返回格式。API文档主要包含以下几个部分：

1. 接口前缀说明
2. 响应格式标准
3. 详细API接口列表（用户、帖子、评论、通知、反馈等）
4. 错误代码列表

开发时建议先通过API文档了解接口的参数和返回值格式，再使用封装好的API模块进行调用。

### API模块概述

项目的API调用封装在 `utils/api/` 目录下的多个模块中，主要包括：

- `index.js` - 汇总导出所有API模块
- `core.js` - 核心请求功能和配置
- `user.js` - 用户相关API
- `post.js` - 帖子相关API
- `comment.js` - 评论相关API
- `notification.js` - 通知相关API
- `feedback.js` - 反馈相关API
- `agent.js` - 智能体对话API
- `search.js` - 搜索相关API
- `about.js` - 关于信息API

这些模块封装了与后端API的所有交互，处理了请求、错误处理、数据转换等逻辑，使前端开发更加高效。

### API模块导入方式

在页面或组件中导入API模块有两种方式：

1. 导入全部API模块：

```javascript
const api = require('../../utils/api/index');
// 使用方式: api.userAPI.syncUser(), api.postAPI.getPosts()
```

2. 按需导入特定API模块：

```javascript
const { userAPI, postAPI } = require('../../utils/api/index');
// 使用方式: userAPI.syncUser(), postAPI.getPosts()
```

### API通用功能

API模块中封装了一些通用功能：

- 自动处理授权Token
- 统一的错误处理和日志
- 请求失败自动重试
- 响应数据预处理

例如，设置API请求基础URL和超时时间：

```javascript
const { API } = require('../../utils/api/index');
// 查看API配置
console.log(API.BASE_URL); // 输出API基础URL
```

## API模块详细使用指南

下面是各API模块的主要功能和使用示例：

### 用户API (userAPI)

用户相关接口，包括登录、获取用户信息、更新用户信息等。

```javascript
const { userAPI } = require('../../utils/api/index');

// 用户登录/同步信息
async function loginUser(userInfo) {
  try {
    // 同步微信用户信息到后端
    const userData = {
      openid: userInfo.openid,
      nick_name: userInfo.nickName,
      avatar: userInfo.avatarUrl,
      gender: userInfo.gender,
      // 其他用户信息...
    };
    
    const result = await userAPI.syncUser(userData);
    return result;
  } catch (error) {
    console.error('用户登录失败:', error);
    throw error;
  }
}

// 获取用户信息
async function getUserInfo(openid) {
  try {
    const userInfo = await userAPI.getUserInfo(openid);
    return userInfo;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

// 关注/取消关注用户
async function followUser(followerId, followedId) {
  try {
    await userAPI.followUser(followerId, followedId);
    wx.showToast({ title: '关注成功', icon: 'success' });
  } catch (error) {
    console.error('关注用户失败:', error);
    wx.showToast({ title: '关注失败', icon: 'none' });
  }
}
```

### 帖子API (postAPI)

帖子相关接口，包括创建、获取、更新、删除帖子等。

```javascript
const { postAPI } = require('../../utils/api/index');

// 创建帖子
async function createPost(title, content, images = [], tags = []) {
  try {
    const postData = {
      title,
      content,
      images,
      tags,
      category_id: 1, // 可选，分类ID
      // 位置信息可选
      location: {
        latitude: 38.994652,
        longitude: 117.304237,
        name: '南开大学津南校区',
        address: '天津市津南区海河教育园区同砚路38号'
      }
    };
    
    const result = await postAPI.createPost(postData);
    wx.showToast({ title: '发布成功', icon: 'success' });
    return result;
  } catch (error) {
    console.error('创建帖子失败:', error);
    wx.showToast({ title: '发布失败', icon: 'none' });
    throw error;
  }
}

// 获取帖子详情
async function getPostDetail(postId) {
  try {
    const post = await postAPI.getPostDetail(postId);
    return post;
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    throw error;
  }
}

// 点赞帖子
async function likePost(postId) {
  try {
    const result = await postAPI.likePost(postId);
    return result;
  } catch (error) {
    console.error('点赞帖子失败:', error);
    throw error;
  }
}
```

### 智能体API (agentAPI)

智能体对话和知识检索接口。

```javascript
const { agentAPI } = require('../../utils/api/index');

// 智能体对话
async function chatWithAgent(query, messages = []) {
  try {
    const params = {
      query,
      messages,
      stream: false,
      format: 'markdown'
    };
    
    const response = await agentAPI.chat(params);
    return response;
  } catch (error) {
    console.error('智能体对话失败:', error);
    throw error;
  }
}

// 知识库检索
async function searchKnowledge(keyword) {
  try {
    const params = {
      keyword,
      limit: 10
    };
    
    const results = await agentAPI.search(params);
    return results;
  } catch (error) {
    console.error('知识库检索失败:', error);
    throw error;
  }
}
```

## API接口使用说明

### 初始化

项目使用 `utils/api/index.js` 文件封装了所有后端API调用，在页面中导入即可使用：

```javascript
// 引入API模块
const { userAPI, postAPI, commentAPI, agentAPI } = require('../../utils/api/index');
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
      post_id: postId,
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

## API错误处理与最佳实践

### 错误处理

所有API调用都封装了Promise，推荐使用try-catch进行错误处理：

```javascript
try {
  const result = await postAPI.getPosts({ limit: 20 });
  // 处理成功响应
} catch (error) {
  // 错误处理
  console.error('获取帖子失败:', error);
  
  if (error.code === 401) {
    // 未授权，可能需要重新登录
    wx.navigateTo({ url: '/pages/login/index' });
  } else if (error.code === 404) {
    // 资源不存在
    wx.showToast({ title: '内容不存在', icon: 'none' });
  } else {
    // 其他错误
    wx.showToast({ title: error.message || '请求失败', icon: 'none' });
  }
}
```

### 请求参数验证

API模块内置了基本参数验证，但仍建议在调用API前进行关键参数验证：

```javascript
// 在调用API前进行参数验证
function createComment(postId, content) {
  if (!postId) {
    wx.showToast({ title: '帖子ID不能为空', icon: 'none' });
    return Promise.reject(new Error('帖子ID不能为空'));
  }
  
  if (!content || content.trim() === '') {
    wx.showToast({ title: '评论内容不能为空', icon: 'none' });
    return Promise.reject(new Error('评论内容不能为空'));
  }
  
  return commentAPI.createComment({
    post_id: postId,
    content: content.trim()
  });
}
```

### 使用加载状态

在发起请求时显示加载状态，提升用户体验：

```javascript
// 使用加载状态
async function loadPostsWithLoading() {
  wx.showLoading({ title: '加载中' });
  
  try {
    const posts = await postAPI.getPosts({ limit: 20 });
    this.setData({ posts });
  } catch (error) {
    console.error('加载失败:', error);
    wx.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    wx.hideLoading();
  }
}
```

### 数据缓存策略

对于不常变化的数据，可以使用本地缓存策略：

```javascript
// 使用缓存策略获取数据
async function getCachedPosts() {
  // 先尝试从缓存获取
  const cachedPosts = wx.getStorageSync('cached_posts');
  const cacheTime = wx.getStorageSync('cached_posts_time');
  const now = Date.now();
  
  // 如果缓存存在且未过期（5分钟内）
  if (cachedPosts && cacheTime && (now - cacheTime < 5 * 60 * 1000)) {
    return cachedPosts;
  }
  
  // 缓存不存在或已过期，从API获取
  try {
    const posts = await postAPI.getPosts({ limit: 20 });
    
    // 更新缓存
    wx.setStorageSync('cached_posts', posts);
    wx.setStorageSync('cached_posts_time', now);
    
    return posts;
  } catch (error) {
    console.error('获取帖子失败:', error);
    
    // 如果API请求失败但有缓存，仍返回缓存数据
    if (cachedPosts) {
      return cachedPosts;
    }
    
    throw error;
  }
}
```

### 调试与日志

API模块内置了日志系统，开发时可以启用详细日志进行调试：

```javascript
// 开启详细日志（仅在开发环境）
const { logger } = require('../../utils/api/index');
logger.setLevel('debug'); // 可选级别: debug, info, warn, error

// 查看请求详情
logger.debug('准备发送请求', {
  url: '/api/posts',
  method: 'GET',
  params: { limit: 20 }
});
```

### 并发请求处理

处理多个并发API请求：

```javascript
// 并发处理多个请求
async function loadHomeData() {
  wx.showLoading({ title: '加载中' });
  
  try {
    // 同时发起多个请求
    const [posts, notifications, userInfo] = await Promise.all([
      postAPI.getPosts({ limit: 10 }),
      notificationAPI.getNotifications({ limit: 5 }),
      userAPI.getUserInfo(app.globalData.openid)
    ]);
    
    // 更新页面数据
    this.setData({
      posts,
      notifications,
      userInfo
    });
  } catch (error) {
    console.error('加载数据失败:', error);
    wx.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    wx.hideLoading();
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
