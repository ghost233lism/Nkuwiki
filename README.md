# nkuwiki微信小程序开发指南

## 目录

- [项目简介](#项目简介)
- [开发环境准备](#开发环境准备)
- [项目结构](#项目结构)
- [代码复用规范](#代码复用规范)
  - [行为复用 (Behaviors)](#行为复用-behaviors)
  - [组件复用 (Components)](#组件复用-components)
  - [工具函数复用 (Utils)](#工具函数复用-utils)
- [代码规范](#代码规范)
  - [命名规范](#命名规范)
  - [API接口规范](#api接口规范)
  - [日志规范](#日志规范)
- [API使用指南](#api使用指南)
- [开发规范与注意事项](#开发规范与注意事项)
- [发布流程](#发布流程)
- [相关资源](#相关资源)

## 项目简介

nkuwiki是一个校园知识共享平台微信小程序，采用前后端分离架构。本项目包含了丰富的可复用组件、行为和工具函数，开发者应充分了解现有功能，避免重复造轮子。

## 开发环境准备

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 填写 AppID

## 项目结构

```plain
services/app/
├── pages/              # 页面文件夹
│   ├── index/          # 首页
│   ├── search/         # 搜索页
│   ├── discover/       # 发现页
│   ├── profile/        # 个人中心
│   ├── login/          # 登录页
│   ├── notification/   # 通知页
│   ├── post/           # 发帖页
│   └── agent/          # 智能体相关页面
├── behaviors/          # 可复用的行为模块
│   ├── base-behavior.js      # 基础行为
│   ├── auth-behavior.js      # 认证行为
│   ├── user-behavior.js      # 用户行为
│   ├── post-behavior.js      # 帖子行为
│   ├── comment-behavior.js   # 评论行为
│   ├── page-behavior.js      # 页面行为
│   ├── form-behavior.js      # 表单行为
│   └── weui-behavior.js      # WEUI行为
├── components/         # 自定义组件
│   ├── action-bar/     # 操作栏
│   ├── button/         # 按钮
│   ├── card/           # 卡片
│   ├── category-tabs/  # 分类标签页
│   ├── comment-item/   # 评论项
│   ├── comment-list/   # 评论列表
│   ├── empty/          # 空状态
│   ├── error/          # 错误状态
│   ├── floating-button/ # 浮动按钮
│   ├── form-item/      # 表单项
│   ├── form-panel/     # 表单面板
│   ├── icon/           # 图标
│   ├── image-uploader/ # 图片上传
│   ├── input-field/    # 输入框
│   ├── loading/        # 加载状态
│   ├── login-card/     # 登录卡片
│   ├── logo-section/   # Logo区域
│   ├── menu-list/      # 菜单列表
│   ├── nav-bar/        # 导航栏
│   ├── nav-tab-bar/    # 底部标签栏
│   ├── page-status/    # 页面状态
│   ├── picker-field/   # 选择器
│   ├── post-item/      # 帖子项
│   ├── post-list/      # 帖子列表
│   ├── search-bar/     # 搜索栏
│   ├── search-history/ # 搜索历史
│   ├── setting-item/   # 设置项
│   ├── text-area/      # 文本区域
│   └── user-card/      # 用户卡片
├── wxcomponents/       # 第三方组件
│   ├── towxml/         # Markdown/HTML渲染组件
│   └── function-grid-menu/ # 功能网格菜单
├── miniprogram_npm/    # npm构建后的第三方库
│   ├── weui-miniprogram/  # WEUI组件库
├── utils/              # 工具函数
│   ├── util.js         # 通用工具函数
├── cloudfunctions/     # 云函数
│   └── getOpenID/      # 获取用户OpenID
├── icons/              # 图标资源
├── app.js              # 小程序入口文件
├── app.json            # 全局配置文件
└── app.wxss            # 全局样式文件
├── api_docs.md         # API文档
└── project.config.json # 项目配置文件
```

## 代码复用规范

本项目提供了丰富的可复用代码，**开发者必须优先考虑使用已有的模块，避免重复实现类似功能**。

### 云函数使用

项目使用微信云开发功能，仅包含`getOpenID`云函数。**云函数只能处理与微信云端交互的逻辑，不得用于处理其他业务逻辑**。

```javascript
// 调用云函数获取openid
async function getOpenID() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'getOpenID'  // 云函数名称
    });
    return res.result.openid;
  } catch (err) {
    console.debug('获取openid失败:', err);
    return null;
  }
}
```

#### 云函数使用原则

1. **职责单一**：云函数仅用于获取微信云端才能提供的信息（如openID），不应包含业务逻辑
2. **最小依赖**：保持云函数代码简洁，不要引入不必要的依赖
3. **安全优先**：不在云函数中存储敏感信息

#### 云函数部署方法

1. 在微信开发者工具中，右键点击`cloudfunctions/getOpenID`目录
2. 选择"上传并部署"选项
3. 点击确认，等待部署完成

获取到openID后，应立即存储到storage中供后续使用：

```javascript
const { storage } = require('../../utils/util');

// 获取并存储openid
async function initOpenID() {
  const openid = await getOpenID();
  if (openid) {
    storage.set('openid', openid);
    return true;
  }
  return false;
}
```

所有业务逻辑必须由小程序前端或服务器后端处理，不要依赖云函数实现复杂功能。

### 行为复用 (Behaviors)

项目定义了多个行为模块，封装了常用的页面逻辑和API交互。

#### 1. 基础行为 (base-behavior.js)

封装了所有页面通用的功能，如加载状态、错误处理等。

```javascript
// 引入基础行为
const baseBehavior = require('../../behaviors/base-behavior');

Component({
  behaviors: [baseBehavior],
  
  methods: {
    loadData() {
      this.showLoading(); // 显示加载状态
      
      try {
        // 数据加载逻辑...
        
        // 数据为空时显示空状态
        if (data.length === 0) {
          this.showEmpty('暂无数据'); 
          return;
        }
        
        this.hideLoading(); // 隐藏加载状态
      } catch (err) {
        this.handleError(err, '加载失败'); // 统一错误处理
      }
    },
    
    // 错误重试
    retryLastOperation() {
      // 重新加载数据
      this.loadData();
    }
  }
});
```

#### 2. 用户行为 (user-behavior.js)

封装了用户相关API交互和状态管理。

```javascript
// 引入用户行为
const userBehavior = require('../../behaviors/user-behavior');

Component({
  behaviors: [userBehavior],
  
  methods: {
    async loadUserProfile(userId) {
      try {
        const userInfo = await this.getUserInfo(userId);
        this.setData({
          userInfo: userInfo
        });
      } catch (err) {
        // 错误已在behavior中处理
      }
    },
    
    async followAction(userId) {
      try {
        // 调用behavior中封装的方法
        const result = await this.toggleFollow(userId);
        // result包含status和其他关注状态信息
        this.setData({
          'userInfo.is_following': result.status === 'followed'
        });
      } catch (err) {
        // 错误已在behavior中处理
      }
    },
    
    goToUserPage(userId) {
      // 使用封装的导航方法
      this.navigateToUserProfile(userId);
    }
  }
});
```

#### 3. 帖子行为 (post-behavior.js)

封装了帖子相关的API交互和状态管理。

```javascript
// 引入帖子行为
const postBehavior = require('../../behaviors/post-behavior');

Component({
  behaviors: [postBehavior],
  
  data: {
    // 继承了behavior中的数据
    // posts, postsLoading, postsError, pagination等
  },
  
  methods: {
    async loadPostList() {
      // 调用behavior中的loadPost方法
      await this.loadPost({
        page: 1,
        limit: 20,
        category: 'tech' // 可选分类
      }, true); // 传true表示刷新列表
    },
    
    onReachBottom() {
      // 加载更多
      if (this.data.pagination.hasMore && !this.data.postsLoading) {
        this.loadMorePost();
      }
    },
    
    onLikePost(e) {
      // 处理点赞，直接调用behavior中的方法
      this.toggleLike(e);
    },
    
    onFavoritePost(e) {
      // 处理收藏
      this.toggleFavorite(e);
    },
    
    goToDetail(e) {
      // 去帖子详情页
      this.navigateToPostDetail(e);
    }
  }
});
```

### 组件复用 (Components)

项目提供了多个可复用的UI组件，应优先使用这些组件构建页面。

#### 1. 使用图标组件

项目统一使用icon组件显示图标，此组件与`icons/`目录建立了映射关系：

```html
<!-- wxml文件中使用 -->
<icon name="like" size="20" color="#ff4400"></icon>
<icon name="comment" size="20"></icon>
```

**重要规范**：
- 所有图标必须通过icon组件管理，严禁使用图片或内联svg替代
- 图标名称采用小写连字符命名，对应icons目录下同名PNG文件
- 添加新图标时，先添加PNG文件到icons目录，再更新icon组件的映射表

示例映射关系：
```javascript
// components/icon/icon.js 中的映射部分
data: {
  iconMap: {
    'like': '/icons/like.png',
    'comment': '/icons/comment.png',
    'favorite': '/icons/favorite.png',
    'favorited': '/icons/favorited.png',
    'profile': '/icons/profile.png',
    'search': '/icons/search.png'
    // 添加新图标时在此处添加映射
  }
}
```

图标命名遵循以下约定：
- 普通状态：`like.png`, `favorite.png`, `profile.png`
- 激活状态：添加`-active`后缀，如`home-active.png`, `profile-active.png`
- 特殊状态：使用描述性后缀，如`notification-unread.png`

团队开发时，请优先查看已有图标库，避免重复添加相似图标。

#### 2. 使用帖子列表组件

```html
<!-- wxml文件中使用 -->
<post-list 
  list="{{posts}}" 
  loading="{{postsLoading}}" 
  error="{{postsError}}"
  empty="{{posts.length === 0 && !postsLoading}}"
  bind:like="onLikePost"
  bind:favorite="onFavoritePost"
  bind:tap="goToDetail">
</post-list>
```

```javascript
// js文件中
Page({
  behaviors: [require('../../behaviors/post-behavior')],
  
  onLoad() {
    this.loadPost({
      page: 1,
      limit: 20
    });
  },
  
  onLikePost(e) {
    this.toggleLike(e);
  },
  
  onFavoritePost(e) {
    this.toggleFavorite(e);
  },
  
  goToDetail(e) {
    this.navigateToPostDetail(e);
  }
});
```

#### 3. 使用表单组件

```html
<!-- wxml文件中使用 -->
<form-panel title="创建帖子">
  <input-field 
    label="标题" 
    value="{{title}}" 
    placeholder="请输入标题" 
    bind:input="onTitleInput">
  </input-field>
  
  <text-area 
    value="{{content}}" 
    placeholder="请输入内容" 
    bind:input="onContentInput">
  </text-area>
  
  <image-uploader 
    files="{{images}}" 
    bind:upload="onImageUpload" 
    bind:delete="onImageDelete">
  </image-uploader>
  
  <button type="primary" bind:tap="submitPost">发布</button>
</form-panel>
```

### 工具函数复用 (Utils)

util.js提供了大量实用工具函数，应熟悉并优先使用。

#### 1. 网络请求与API工厂

```javascript
const { createApiClient } = require('../../utils/util');

// 创建API客户端
const postApi = createApiClient('/api/wxapp/post', {
  list: {
    method: 'GET',
    path: '/list',
    params: {
      openid: true,
      page: false,
      limit: false,
      category: false
    }
  },
  detail: {
    method: 'GET',
    path: '/detail',
    params: {
      openid: true,
      post_id: true
    }
  }
});

// 使用API客户端
async function fetchPosts() {
  const result = await postApi.list({
    page: 1,
    limit: 20
  });
  return result.data;
}
```

#### 2. 存储管理工具

util.js中封装了本地存储的操作方法，统一通过storage对象使用：

```javascript
const { storage } = require('../../utils/util');

// 读取存储
const openid = storage.get('openid');
const userInfo = storage.get('userInfo');

// 写入存储
storage.set('userInfo', {
  nickname: '用户昵称',
  avatar: 'https://example.com/avatar.jpg'
});

// 删除存储
storage.remove('tempData');

// 判断是否存在数据
if (storage.get('token')) {
  // 已登录
} else {
  // 未登录
}
```

始终使用storage对象而不是直接调用wx.setStorageSync等方法，这样能保证存储操作的一致性并便于后期扩展和维护。典型应用场景包括：

- 用户信息存储：`storage.set('userInfo', userInfo)`
- 身份验证信息：`storage.set('openid', openid)`
- 用户设置：`storage.set('settings', settings)`
- 缓存数据：`storage.set('postCache', posts)`

#### 3. 界面交互工具

```javascript
const { ui, nav, ToastType } = require('../../utils/util');

// 显示提示
ui.showToast('操作成功', { type: ToastType.SUCCESS });

// 显示对话框
const confirmed = await ui.showDialog({
  title: '提示',
  content: '确定删除吗？'
});

// 页面导航
nav.to('/pages/post/detail', { id: 123 });
```

#### 4. 错误处理工具

```javascript
const { error, ErrorType } = require('../../utils/util');

try {
  // 业务逻辑
} catch (err) {
  // 创建标准错误
  const standardError = error.create('操作失败', 400, { field: 'title' });
  
  // 报告错误
  error.report(standardError);
  
  // 处理错误
  error.handle(standardError, '默认错误信息');
}
```

#### 5. 数据处理工具

```javascript
const { 
  formatTime, 
  formatRelativeTime,
  parseJsonField,
  parseImageUrl,
  isEmptyObject,
  isValidArray 
} = require('../../utils/util');

// 格式化时间
const now = new Date();
const formattedTime = formatTime(now); // 2023/04/15 14:30:25
const relativeTime = formatRelativeTime(now); // 刚刚发布

// 解析JSON字段
const imagesArray = parseJsonField(post.image, []);

// 解析图片URL
const imageUrls = parseImageUrl(post.image);

// 检查数据
if (isEmptyObject(obj)) {
  // 对象为空
}

if (!isValidArray(arr)) {
  // 数组为空或无效
}
```

## 代码规范

本项目严格遵循以下代码规范，所有开发者**必须遵循这些规范**，以确保代码质量和一致性。

### 命名规范

1. **统一使用单数形式**：
   - ✅ **正确**：`post`、`user`、`comment`、`image`、`tag`
   - ❌ **错误**：`posts`、`users`、`comments`、`images`、`tags`

2. **命名大小写规则**：
   - 默认小写命名
   - 缩写用大写（如 `API`、`HTTP`、`URL`）
   - 类名首字母大写（如 `PostItem`、`UserProfile`）
   - 驼峰命名用大写（如 `getUserInfo`、`postDetail`）
   - 下划线分割时用小写（如 `post_id`、`user_name`）

3. **字段命名规范**：
   - 计数字段统一使用 `xxx_count` 格式：
     - `like_count`（点赞数）
     - `comment_count`（评论数）
     - `favorite_count`（收藏数）
     - `view_count`（浏览数）
     - `follower_count`（粉丝数）
     - `following_count`（关注数）

4. **文件命名规范**：
   - JS文件使用小写并用连字符分隔：`post-behavior.js`、`user-card.js`
   - WXML/WXSS文件与对应JS文件同名：`user-card.wxml`、`user-card.wxss`

5. **组件命名规范**：
   - 组件目录与组件名一致：`components/post-item/`
   - 组件文件与目录同名：`post-item.js`、`post-item.wxml`

### API接口规范

1. **API路径格式**：
   - 所有API路径必须以`/api/`开头
   - 微信小程序API使用`/api/wxapp/`前缀
   - 智能体API使用`/api/agent/`前缀
   - 路径统一使用小写
   - 单词间用短横线连接，不使用下划线

2. **参数命名**：
   - 参数名使用小写下划线命名法：`post_id`、`user_id`