# 微信小程序开发指南

## 开发环境准备

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

2. 填写 AppID

## 项目结构说明

```plain
project
│
├── pages/ # 页面文件夹
│   ├── index/ # 首页
│   │   ├── index.js # 页面逻辑
│   │   ├── index.json # 页面配置
│   │   ├── index.wxml # 页面结构
│   │   └── index.wxss # 页面样式
│   ├── search/ # 搜索页
│   ├── discover/ # 发现页
│   ├── profile/ # 个人中心
│   ├── login/ # 登录页
│   ├── notification/ #通知页
│   └── post/ # 发帖页
│
├── utils/ # 工具函数
│   ├── api/ # API模块，包含各类接口封装
│   │   ├── index.js # API模块入口
│   │   ├── user.js # 用户相关API
│   │   ├── post.js # 帖子相关API
│   │   ├── comment.js # 评论相关API
│   │   ├── category.js # 分类相关API
│   │   └── upload.js # 上传相关API
│   └── request.js # 网络请求工具
│
├── cloudfunctions/ # 云函数
│   ├── getOpenID/ # 获取微信用户OpenID的云函数
│   └── uploadImage/ # 图片上传云函数
│
├── assets/ # 静态资源
│   └── icons/ # 图标文件
│
├── wxcomponents/ # 自定义组件
│
├── typings/ # TypeScript类型定义
│
├── app.js # 小程序入口文件
├── app.json # 小程序全局配置
├── app.json.bak # 全局配置备份文件
├── app.wxss # 全局样式文件
├── api_docs.md # API文档
├── jsconfig.json # JavaScript配置文件
├── project.config.json # 项目配置文件
├── project.private.config.json # 项目私有配置
├── sitemap.json # 小程序搜索配置
└── .gitignore # Git忽略文件
```

## 重要文件说明

- `app.json`: 全局配置文件，包含页面路由、窗口样式、底部导航等配置

- `app.js`: 小程序入口文件，包含全局逻辑

- `app.wxss`: 全局样式文件

- 每个页面包含四个文件：
  - `.js`: 页面逻辑
  - `.wxml`: 页面结构（相当于 HTML）
  - `.wxss`: 页面样式（相当于 CSS）
  - `.json`: 页面配置

## 开发基础知识

### 1. 文件类型介绍

前端设计原型图：https://mastergo.com/goto/HrncAZgN?page_id=M&file=152887751273499

- `WXML`：框架设计的一套标签语言，用于描述页面结构

- `WXSS`：样式语言，类似 CSS

- `JS`：小程序的逻辑层，处理数据和用户操作

- `JSON`：配置文件

### 2. 常用组件

- `view`: 视图容器，类似 div

- `text`: 文本组件

- `button`: 按钮组件

- `image`: 图片组件

- `scroll-view`: 可滚动视图区域

### 3. 生命周期

页面生命周期函数：

- `onLoad`: 页面加载时触发

- `onShow`: 页面显示时触发

- `onReady`: 页面初次渲染完成时触发

- `onHide`: 页面隐藏时触发

- `onUnload`: 页面卸载时触发

## 开发注意事项

1. 小程序总包大小限制为 2M，超过需要分包，注意控制代码和资源大小

2. 除了图标类的图片，其余图片一律上传图床

3. 及时清理不使用的文件和代码

4. 遵循小程序的[设计指南](https://developers.weixin.qq.com/miniprogram/design/)

5. 注意用户数据隐私保护

6. 做好错误处理和异常捕获

## 发布流程

1. 完成开发和测试

2. 在开发者工具中点击"上传"

3. 登录微信公众平台

4. 在版本管理中提交审核

5. 审核通过后发布

## 学习资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

- [小程序设计指南](https://developers.weixin.qq.com/miniprogram/design/)

- [小程序示例](https://developers.weixin.qq.com/miniprogram/dev/demo.html)

## 常见问题

1. 真机预览需要在公众平台配置开发者权限

2. 注意 AppID 的正确配置

3. 本地存储有大小限制

4. 部分 API 仅在真机上可用

5. 注意兼容性问题，特别是低版本

## API文档与使用指南

本项目已将微信云开发API迁移至HTTP接口，前端无需直接调用云函数，而是通过封装好的API模块进行调用。

### API文档

完整的API文档位于项目根目录的 `api_docs.md` 文件中，包含了所有可用的接口、参数说明和返回格式。API主要分为两类：

1. 微信小程序API：以 `/api/wxapp/*` 为前缀，供小程序前端调用
2. Agent智能体API：以 `/api/agent/*` 为前缀，提供AI聊天和知识检索功能

### API模块使用方法

项目中的API调用已经封装在 `utils/api` 目录下的模块中，包括：

- `user.js`: 用户相关API（登录、用户信息更新等）
- `post.js`: 帖子相关API（获取帖子、点赞、收藏等）
- `comment.js`: 评论相关API
- `upload.js`: 上传相关API
- `category.js`: 分类和标签相关API

#### 引入API模块

在页面或组件中引入API模块：

```javascript
// 引入整个API模块
const api = require('../../utils/api/index');

// 或者只引入需要的子模块
const userApi = require('../../utils/api/user');
const postApi = require('../../utils/api/post');
```

#### 调用API示例

```javascript
// 获取帖子列表
async function loadPosts() {
  try {
    const result = await api.post.getPosts({
      page: 1,
      pageSize: 20,
      category_id: 1
    });
    
    if (result.success) {
      this.setData({
        posts: result.posts,
        total: result.total
      });
    } else {
      wx.showToast({
        title: result.message || '获取帖子失败',
        icon: 'none'
      });
    }
  } catch (err) {
    console.error('加载帖子异常:', err);
  }
}

// 用户登录
async function login() {
  try {
    // 获取微信用户信息
    const userResult = await wx.getUserProfile({
      desc: '用于完善个人资料'
    });
    
    // 调用登录API
    const loginResult = await api.user.login(userResult.userInfo);
    
    if (loginResult.code === 0) {
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: loginResult.message || '登录失败',
        icon: 'none'
      });
    }
  } catch (err) {
    console.error('登录异常:', err);
  }
}
```

### 网络请求

所有API调用最终通过 `utils/request.js` 中封装的请求方法发送，基本格式为：

```javascript
// GET请求
request.get(url, data, header, query);

// POST请求
request.post(url, data, header, query);

// PUT请求
request.put(url, data, header, query);

// DELETE请求
request.delete(url, data, header, query);
```

其中：
- `url`: API路径，如 `/api/wxapp/posts`
- `data`: 请求参数或请求体
- `header`: 自定义请求头
- `query`: URL查询参数

### 请求处理和错误处理

API模块已经处理了常见的请求错误，并返回统一格式的结果对象：

```javascript
{
  success: true/false,  // 操作是否成功
  message: "提示信息",   // 成功/错误提示
  code: 0,              // 错误码，0表示成功
  data: {}              // 返回的数据
}
```

在页面中调用API时，应当做好错误处理：

```javascript
try {
  const result = await api.post.likePost(postId);
  if (result.success) {
    // 处理成功情况
  } else {
    // 处理失败情况，可以显示错误提示
    wx.showToast({
      title: result.message,
      icon: 'none'
    });
  }
} catch (err) {
  // 处理异常
  console.error('操作失败:', err);
  wx.showToast({
    title: '网络异常，请稍后再试',
    icon: 'none'
  });
}
```

### 开发新接口

如需新接口，请遵循以下步骤：

1. 查阅 `api_docs.md` 了解接口规范。
2. 如果自己能写后端api就自己写。
3. 如果自己不能写，请向后端负责人提issue，包括详细的请求方式、路径、参数、查询参数、返回格式等等。
4. 完善接口文档。

### API模块说明

本项目采用混合架构模式，使用以下规则进行功能划分：

1. **API模块** (`utils/api/` 目录)：
   - 所有与后端服务器交互的功能都应封装在此目录下
   - 即使之前在云函数中实现的功能，如果需要与后端交互，也应迁移到API模块
   - API模块通过 `utils/request.js` 发送HTTP请求到后端服务器
   - 按功能划分为多个模块文件，如用户、帖子、评论等

2. **云函数** (`cloudfunctions/` 目录)：
   - 仅用于实现只与微信云开发服务交互的功能
   - 例如：获取OpenID、调用微信云存储、访问云数据库等纯微信云功能
   - 不应包含对外部服务器的HTTP请求逻辑

#### 示例：功能迁移

**旧方式** (云函数实现)：
```javascript
// 在云函数中实现获取帖子列表
// cloudfunctions/getPosts/index.js
const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const httpRequest = require('./httpRequest');
  // 向后端发起HTTP请求获取数据
  const result = await httpRequest.get('https://nkuwiki.com/api/posts', event);
  return result;
};
```

**新方式** (API模块实现)：
```javascript
// 在API模块中实现获取帖子列表
// utils/api/post.js
const request = require('../request');

async function getPosts(params = {}) {
  try {
    const result = await request.get('/api/wxapp/posts', params);
    return {
      success: true,
      posts: result.data.posts,
      total: result.data.total
    };
  } catch (err) {
    return {
      success: false,
      message: '获取帖子失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  getPosts
};
```

#### 何时使用云函数

仅在以下情况使用云函数：

1. 需要获取微信用户OpenID等敏感信息
2. 需要访问微信云开发的云存储、云数据库
3. 需要使用微信云开发特有的能力，如定时触发器等
4. 安全性要求高的操作，需要在服务端执行的逻辑

在开发新功能时，请优先考虑使用API模块而非云函数实现，除非该功能仅与微信云开发服务交互。

#### 项目现有云函数说明

目前，项目中保留了两个只与微信云开发环境交互的云函数：

1. **getOpenID 云函数**
   - 功能：获取用户的OpenID、UnionID和AppID
   - 用途：用于小程序用户身份识别，这些信息只能通过云函数从微信服务获取
   - 安全性：确保敏感身份信息不被前端直接获取
   - 调用方式：
     ```javascript
     // 调用云函数获取OpenID
     const wxCloudResult = await wx.cloud.callFunction({
       name: 'getOpenID'
     });
     const openid = wxCloudResult.result.data.openid;
     ```

2. **uploadImage 云函数**
   - 功能：将临时文件上传到微信云存储
   - 用途：处理用户上传的图片，支持帖子图片、评论图片、头像等不同类型
   - 流程：下载临时文件 → 生成唯一文件名 → 上传到云存储 → 获取文件访问链接
   - 调用方式：
     ```javascript
     // 上传用户选择的图片
     const { tempFilePaths } = await wx.chooseImage({ count: 1 });
     // 上传到临时存储
     const { fileID } = await wx.cloud.uploadFile({
       cloudPath: `temp/${Date.now()}.jpg`,
       filePath: tempFilePaths[0]
     });
     // 调用云函数进行正式上传
     const result = await wx.cloud.callFunction({
       name: 'uploadImage',
       data: {
         fileID: fileID,
         type: 'post' // 可选值: post, comment, avatar, common
       }
     });
     const imageUrl = result.result.data.tempFileURL;
     ```

这两个云函数专注于微信云开发特有功能，而所有与后端服务器交互的API都应该使用utils/api模块实现。
