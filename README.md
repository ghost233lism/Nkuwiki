# nkuwiki微信小程序开发指南

## 目录
- [开发环境准备](#开发环境准备)
- [项目结构](#项目结构)
- [开发基础](#开发基础)
- [API使用指南](#api使用指南)
- [工具模块使用指南](#工具模块使用指南)
- [开发规范与注意事项](#开发规范与注意事项)
- [发布流程](#发布流程)
- [常见问题](#常见问题)
- [相关资源](#相关资源)

## 开发环境准备

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 填写 AppID

## 项目结构

```plain
project
├── pages/              # 页面文件夹
│   ├── index/          # 首页
│   ├── search/         # 搜索页
│   ├── discover/       # 发现页
│   ├── profile/        # 个人中心
│   ├── login/          # 登录页
│   ├── notification/   # 通知页
│   └── post/           # 发帖页
├── utils/              # 工具函数
│   ├── api/            # API模块封装
│   │   ├── index.js    # API入口
│   │   ├── user.js     # 用户相关API
│   │   ├── post.js     # 帖子相关API
│   │   ├── comment.js  # 评论相关API
│   │   ├── notification.js # 通知相关API
│   │   ├── feedback.js # 反馈相关API
│   │   ├── search.js   # 搜索相关API
│   │   ├── agent.js    # 智能体相关API
│   │   ├── upload.js   # 上传相关API
│   │   └── search.js   # 搜索相关API
│   ├── request.js      # 网络请求工具
│   ├── config.js       # 配置文件
│   └── util.js        # 通用工具函数
├── cloudfunctions/     # 云函数
│   ├── getOpenID/      # 获取用户OpenID
│   └── uploadImage/    # 图片上传
├── assets/             # 静态资源
├── wxcomponents/       # 自定义组件
├── app.js              # 小程序入口文件
├── app.json            # 全局配置文件
├── app.wxss            # 全局样式文件
└── api_docs.md         # API文档
```

## 开发基础

### 文件类型

- `WXML`: 页面结构，类似HTML
- `WXSS`: 页面样式，类似CSS
- `JS`: 页面逻辑
- `JSON`: 配置文件

### 页面生命周期

- `onLoad`: 页面加载时触发
- `onShow`: 页面显示时触发
- `onReady`: 页面初次渲染完成触发
- `onHide`: 页面隐藏时触发
- `onUnload`: 页面卸载时触发

## API使用指南

本项目使用HTTP接口进行前后端交互，API已按功能模块封装。

### 请求规范

1. **请求方法**:
   - GET: 幂等操作，使用查询参数
   - POST: 非幂等操作，使用请求体

2. **标准响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "details": null,
  "timestamp": "2023-01-01 12:00:00"
}
```

### API模块调用示例

#### 引入方式

```javascript
// 方式一：引入整个API模块
const api = require('../../utils/api/index');

// 方式二：引入单个API模块
const userApi = require('../../utils/api/user');
const postApi = require('../../utils/api/post');
```

#### 用户模块

```javascript
// 同步用户信息
async function syncUserInfo() {
  try {
    // 获取openid (通过云函数)
    const wxCloudResult = await wx.cloud.callFunction({
      name: 'getOpenID'
    });
    const openid = wxCloudResult.result.openid;
    
    // 调用API
    const result = await api.user.syncUser({
      openid,
      nickname: userInfo.nickName,
      avatar: userInfo.avatarUrl,
      gender: userInfo.gender
    });
    
    if (result.code === 200) {
      // 处理成功情况
      return result.data;
    }
  } catch (err) {
    console.error('登录异常:', err);
  }
}

// 关注用户
async function followUser(followedId) {
  const openid = wx.getStorageSync('openid');
  const result = await api.user.follow({
    follower_id: openid,
    followed_id: followedId
  });
  
  if (result.code === 200) {
    return {
      isFollowing: result.data.is_following,
      followerCount: result.data.follower_count
    };
  }
}
```

#### 帖子模块

```javascript
// 获取帖子列表
async function loadPosts() {
  const result = await api.post.getPosts({
    page: 1,
    limit: 20,
    category_id: 1
  });
  
  if (result.code === 200) {
    return result.data;
  }
}

// 创建帖子
async function createNewPost(postData) {
  try {
    wx.showLoading({
      title: '正在发布...',
      mask: true
    });
    
    const params = {
      title: postData.title.trim(),
      content: postData.content.trim(),
      images: JSON.stringify(postData.images),
      is_public: postData.isPublic,
      allow_comment: postData.allowComment
    };
    
    const result = await api.post.createPost(params);
    
    if (result.code === 200) {
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });
      return true;
    } else {
      wx.showToast({
        title: result.message || '发布失败',
        icon: 'none'
      });
      return false;
    }
  } catch (err) {
    console.debug('发布失败:', err);
    wx.showToast({
      title: '发布失败',
      icon: 'none'
    });
    return false;
  } finally {
    wx.hideLoading();
  }
}
```

## 工具模块使用指南

项目提供了多个工具模块以简化开发。

### 请求工具 (utils/request.js)

```javascript
// 引入所需方法
const {get, post, processResponse} = require('../../utils/request');

// GET请求示例
async function getUserProfile() {
  const result = await get('/api/wxapp/user/profile');
  return result;
}

// GET请求带参数
async function getPostDetail(postId) {
  const result = await get('/api/wxapp/post/detail', {
    post_id: postId
  });
  return result;
}

// POST请求示例
async function createComment(postId, content) {
  const result = await post('/api/wxapp/comment', {
    post_id: postId,
    content
    // openid会自动添加
  });
  return result;
}
```

### 实用工具 (utils/util.js)

```javascript
// 引入所需方法
const {
  formatTime,
  formatRelativeTime,
  getOpenID,
  getStorage,
  setStorage,
  processCloudUrl,
  processPostData
} = require('../../utils/util');

// 时间格式化
function displayTime() {
  const now = new Date();
  const standard = formatTime(now);          // 2023/04/15 14:30:25
  const relative = formatRelativeTime(now);  // 刚刚发布
}

// 本地存储操作
function storeUserPreferences() {
  setStorage('userPreferences', { theme: 'dark' });
  const prefs = getStorage('userPreferences');
}

// 处理帖子数据
function handlePost(rawPost) {
  // 处理图片URL、标签、点赞用户列表等
  return processPostData(rawPost);
}

// 处理云存储图片URL
function processImageUrl(url) {
  return processCloudUrl(url);
}
```

## 开发规范与注意事项

1. **资源控制**: 小程序总包大小限制为2M，图标外的图片上传图床
2. **错误处理**: 做好错误处理和异常捕获
3. **API交互原则**:
   - 使用API模块而非直接网络请求
   - 优先使用API模块，仅在必要时使用云函数
   - 处理响应错误和网络异常
4. **参数类型**:
   - ID类型: `post_id`、`comment_id`为整数，`openid`为字符串
   - 布尔值: 使用`true`/`false`
   - 日期时间: 使用ISO 8601格式(`YYYY-MM-DD HH:MM:SS`)

## 发布流程

1. 完成开发和测试
2. 在开发者工具中上传代码
3. 登录微信公众平台提交审核
4. 审核通过后发布

## 常见问题

1. 真机预览需要配置开发者权限
2. 部分API仅在真机上可用
3. 本地存储有大小限制
4. 注意兼容性问题，特别是低版本

## 相关资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [小程序设计指南](https://developers.weixin.qq.com/miniprogram/design/)
- [API文档](./api_docs.md)
