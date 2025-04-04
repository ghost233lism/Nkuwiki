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
│   ├── baseBehavior.js      # 基础行为
│   ├── authBehavior.js      # 认证行为
│   ├── userBehavior.js      # 用户行为
│   ├── postBehavior.js      # 帖子行为
│   ├── commentBehavior.js   # 评论行为
│   ├── notificationBehavior.js # 通知行为
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

项目使用了微信云函数获取openID，由authBehavior中的_initOpenid()方法封装调用。只需引入authBehavior，它会在组件或页面attached时**自动调用_initOpenid()方法获取和存储openid**，无需手动调用。

#### 云函数使用原则

1. **职责单一**：云函数仅用于获取微信云端才能提供的信息（如openID），不应包含业务逻辑
2. **最小依赖**：保持云函数代码简洁，不要引入不必要的依赖
3. **安全优先**：不在云函数中存储敏感信息


#### 云函数部署方法

1. 在微信开发者工具中，右键点击`cloudfunctions/getOpenID`目录
2. 选择"上传并部署"选项
3. 点击确认，等待部署完成

所有业务逻辑必须由小程序前端或服务器后端处理，不要依赖云函数实现复杂功能。

### 行为复用 (Behaviors)

项目定义了多个行为模块，封装了常用的功能和API交互逻辑。
1. `baseBehavior`封装了状态管理、全局存储管理、UI交互等功能。
2. 其他行为专注于API调用，方法以**下划线开头**，**不存储状态**。

#### 1. 基础行为 (baseBehavior.js)

封装了所有页面通用的功能，如状态管理、表单校验、错误处理、页面跳转、页面提示、全局存储等。

主要方法：
- getStorage(key)/setStorage(key, value): 存储操作
- updateState(stateUpdate, nextTick): 统一状态更新
- showLoading()/hideLoading(): 加载状态
- showError()/hideError(): 错误状态
- showEmpty()/hideEmpty(): 空状态
- showSuccess()/hideSuccess(): 成功状态
- initForm()/getForm()/setFormField(): 表单操作
- validateForm(rules): 表单验证
- navigateTo/redirectTo/navigateBack: 导航封装

#### 2. 认证行为 (authBehavior.js)

专注于认证相关API交互，方法以下划线开头，不存储状态。

只需引入authBehavior，它会在组件或页面attached时**自动调用_initOpenid()方法获取和存储openid**，无需手动调用。
authBehavior提供了以下方法：
- _initOpenid(): 初始化openID，会自动调用，一般不需要手动调用
- _syncUserInfo(): 同步用户信息，验证登录状态，如果没有openID会自动获取
- _checkLogin(showInteraction): 检查用户是否已登录，可选是否显示登录提示弹窗
- _getUserInfo(forceRefresh): 获取用户信息，可选是否强制从服务器获取
- _logout(): 退出登录，清除登录状态并返回首页

#### 3. 用户行为 (userBehavior.js)

专注于用户相关API交互，方法以下划线开头，不存储状态。

主要方法：
- _getUserProfile(): 获取用户微信资料
- _updateUserInfo(userInfo): 更新用户信息
- _getUserStat(): 获取用户统计数据(发帖数、评论数等)
- _followUser(userId): 关注用户
- _unfollowUser(userId): 取消关注用户
- _getFollowList(type): 获取关注/粉丝列表，type可选'following'或'follower'
- _blockUser(userId): 拉黑用户
- _unblockUser(userId): 取消拉黑用户

#### 4. 帖子行为 (postBehavior.js)

专注于帖子相关API交互，方法以下划线开头，不存储状态。

主要方法：
- _getPostList(filter, page, limit): 获取帖子列表，支持分类、排序等筛选
- _getPostDetail(postId): 获取帖子详情
- _getPostStatus(postIds): 获取帖子状态(点赞、收藏等)
- _createPost(postData): 创建帖子
- _updatePost(postId, postData): 更新帖子
- _deletePost(postId): 删除帖子
- _likePost(postId): 点赞/取消点赞帖子
- _favoritePost(postId): 收藏/取消收藏帖子

#### 5. 评论行为 (commentBehavior.js)

专注于评论相关API交互，方法以下划线开头，不存储状态。

主要方法：
- _getComment(page, pageSize): 获取评论数据
- getInitialComment(postId, params): 加载初始评论列表
- getMoreComment(): 加载更多评论/回复
- submitTopComment(): 提交顶级评论
- _createComment(postId, content): 创建评论
- _deleteComment(commentId): 删除评论
- _likeComment(commentId): 点赞评论


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

#### 2. 使用帖子列表组件 (post-list)

帖子列表组件封装了帖子列表数据获取、分页、空状态等功能，内部已与postBehavior集成，无需额外引入行为：

```html
<!-- wxml文件中使用 -->
<post-list 
  filter="{{filter}}"
  bind:retry="handleRetry"
  bind:loadmore="handleLoadMore">
</post-list>
```

```javascript
// js文件中
Page({
  data: {
    filter: {
      category_id: 0, // 默认全部分类
      sort: 'newest',  // 排序方式
      tag: null, // 可选标签筛选
      keyword: '' // 可选关键词搜索
    }
  },
  
  // 更改筛选条件
  changeFilter(e) {
    const { type, value } = e.currentTarget.dataset;
    
    this.setData({
      [`filter.${type}`]: value
    });
    
    // 组件会自动监听filter变化并重新加载数据
  },
  
  // 重试加载
  handleRetry() {
    console.debug('用户点击了重试');
    // 可以添加其他UI反馈
  },
  
  // 加载更多
  handleLoadMore() {
    console.debug('加载更多数据');
    // 列表组件内部会自动处理分页逻辑
  }
});
```

#### 3. 使用帖子项组件 (post-item)

帖子项组件封装了单个帖子的展示和交互，可以单独使用或被post-list调用。此组件集成了多个behavior，包括baseBehavior、postBehavior和userBehavior，并在内部处理了所有交互逻辑：

```html
<!-- wxml文件中使用 -->
<post-item 
  post="{{post}}"
  show-action="{{true}}"
  show-comment="{{true}}"
  show-follow="{{true}}"
  show-user-info="{{true}}"
  show-image="{{true}}"
  is-card="{{false}}">
</post-item>
```

```javascript
// js文件中
Page({
  behaviors: [require('../../behaviors/postBehavior')],
  
  data: {
    post: null
  },
  
  async onLoad(options) {
    const { post_id } = options;
    if (post_id) {
      await this.loadPostDetail(post_id);
    }
  },
  
  // 加载帖子详情
  async loadPostDetail(postId) {
    try {
      // 使用postBehavior中的方法
      const res = await this._getPostDetail(postId);
      
      if (res.code === 200 && res.data) {
        this.setData({ post: res.data });
      }
    } catch (err) {
      console.debug('加载帖子详情失败:', err);
    }
  }
});
```

post-item组件内部已集成多个behavior并处理了所有交互：
- 点击帖子区域：自动跳转至帖子详情页
- 点击用户头像/昵称：自动跳转至用户主页
- 点击点赞按钮：自动调用postBehavior的_likePost方法
- 点击收藏按钮：自动调用postBehavior的_favoritePost方法
- 点击关注按钮：自动调用userBehavior的_toggleFollow方法
- 点击图片：自动预览大图
- 点击标签：自动跳转至相关标签页面

这种"智能组件"设计是本项目的特色，通过在组件内部集成behavior提供完整功能，使页面代码更加精简。使用者只需提供数据，组件自动处理交互和业务逻辑，无需在页面层面处理事件绑定和回调。

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
   - ✅ **正确**：`post`