# nkuwiki微信小程序

[![Version](https://img.shields.io/badge/version-0.0.2-blue.svg)](https://github.com/your-org/nkuwiki/releases)

<img src="https://raw.githubusercontent.com/aokimi0/image-hosting-platform/main/img/20250404144927.png" width="200" />

## 目录

- [项目简介](#项目简介)
  - [核心功能](#核心功能)
  - [技术特色](#技术特色)
- [开发指南](#开发指南)
  - [环境准备](#环境准备)
  - [项目结构](#项目结构)
  - [云函数使用](#云函数使用)
  - [代码复用](#代码复用)
    - [行为复用 (Behaviors)](#行为复用-behaviors)
    - [组件复用 (Components)](#组件复用-components)
    - [工具函数复用 (Utils)](#工具函数复用-utils)
  - [命名规范](#命名规范)
  - [发布流程](#发布流程)
  - [学习资源](#学习资源)

## 项目简介

本项目是 [nkuwiki项目](https://github.com/NKU-WIKI/nkuwiki) 的微信小程序前端。nkuwiki是南开大学校园知识共享平台，采用前后端分离架构设计。平台致力于构建高效、便捷的校园信息交流生态，让知识共享更加便捷。

### 核心功能

- **知识问答**：学生可提问、回答学习和生活相关问题
- **资源共享**：提供校园资源共享和交流
- **智能助手**：基于AI的校园问题智能解答
- **社区互动**：用户关注、点赞、评论功能

### 技术特色

- **组件化设计**：高度模块化的组件和行为(Behavior)系统
- **优秀性能**：针对移动端优化的渲染和交互体验
- **智能交互**：AI驱动，提供智能回复和内容推荐

## 开发指南

### 环境准备

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 填写 AppID

### 项目结构

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
│   ├── cell-status/    # 单元格状态组件
│   ├── comment-input/  # 评论输入框
│   ├── comment-item/   # 评论项
│   ├── comment-list/   # 评论列表
│   ├── floating-button/ # 浮动按钮
│   ├── form-item/      # 表单项
│   ├── form-panel/     # 表单面板
│   ├── function-grid-menu/ # 功能网格菜单
│   ├── icon/           # 图标
│   ├── image-uploader/ # 图片上传
│   ├── input-field/    # 输入框
│   ├── loading/        # 加载状态
│   ├── login-card/     # 登录卡片
│   ├── logo-section/   # Logo区域
│   ├── menu-list/      # 菜单列表
│   ├── nav-bar/        # 导航栏
│   ├── nav-tab-bar/    # 底部标签栏
│   ├── picker-field/   # 选择器
│   ├── post-item/      # 帖子项
│   ├── post-list/      # 帖子列表
│   ├── search-bar/     # 搜索栏
│   ├── search-history/ # 搜索历史
│   ├── setting-item/   # 设置项
│   ├── text-area/      # 文本区域
│   ├── towxml/         # Markdown渲染组件
│   ├── user-card/      # 用户卡片
│   └── weui/           # WeUI组件
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

### 云函数使用

项目使用了微信云函数获取`openid`，由`authBehavior`中的`_initOpenid()`方法封装调用。只需引入`authBehavior`，它会在组件或页面`attached`时**自动调用`_initOpenid()`方法获取和存储`openid`**，无需手动调用。

#### 云函数使用原则

1. **职责单一**：云函数仅用于获取微信云端才能提供的信息（如`openID`），不应包含业务逻辑
2. **最小依赖**：保持云函数代码简洁，不要引入不必要的依赖
3. **安全优先**：不在云函数中存储敏感信息

#### 云函数部署方法

1. 在微信开发者工具中，右键点击`cloudfunctions/getOpenID`目录
2. 选择"上传并部署"选项
3. 点击确认，等待部署完成

所有业务逻辑必须由小程序前端或服务器后端处理，不要依赖云函数实现复杂功能。

### 代码复用

本项目提供了丰富的可复用代码，**开发者必须优先考虑使用已有的模块，避免重复实现类似功能**。

页面布局原则**高内聚、低耦合**，参考`index.wxml`。
推荐使用`cell-status`组件管理自定义组件的状态，**但是一定不要把`cell-status`包裹在整个页面外面。**

#### 行为复用 (`behaviors/`)

项目定义了多个行为模块，封装了常用的功能和API交互逻辑。
1. `baseBehavior`封装了状态管理、全局存储管理、UI交互等功能。
2. 其他行为专注于API调用，方法以**下划线开头**，**不存储状态**。

##### 基础行为 (`baseBehavior.js`)

封装了所有页面通用的功能，如状态管理、表单校验、错误处理、页面跳转、页面提示、全局存储等。

主要方法：
- `getStorage(key)`/`setStorage(key, value)`: 存储操作
- `updateState(stateUpdate, nextTick)`: 统一状态更新
- `showLoading()`/`hideLoading()`: 加载状态
- `showError()`/`hideError()`: 错误状态
- `showEmpty()`/`hideEmpty()`: 空状态
- `showSuccess()`/`hideSuccess()`: 成功状态
- `initForm()`/`getForm()`/`setFormField()`: 表单操作
- `validateForm(rules)`: 表单验证
- `navigateTo`/`redirectTo`/`navigateBack`: 导航封装

##### 认证行为 (`authBehavior.js`)

专注于认证相关API交互，方法以下划线开头，不存储状态。

只需引入`authBehavior`，它会在组件或页面attached时**自动调用`_initOpenid()`方法获取和存储openid**，无需手动调用。
`authBehavior`提供了以下方法：
- `_initOpenid()`: 初始化openID，会自动调用，一般不需要手动调用
- `_syncUserInfo()`: 同步用户信息，验证登录状态，如果没有openID会自动获取
- `_checkLogin(showInteraction)`: 检查用户是否已登录，可选是否显示登录提示弹窗
- `_getUserInfo(forceRefresh)`: 获取用户信息，可选是否强制从服务器获取
- `_logout()`: 退出登录，清除登录状态并返回首页

##### 用户行为 (`userBehavior.js`)

专注于用户相关API交互，方法以下划线开头，不存储状态。

主要方法：
- `_getUserProfile()`: 获取用户微信资料
- `_updateUserInfo(userInfo)`: 更新用户信息
- `_getUserStat()`: 获取用户统计数据(发帖数、评论数等)
- `_followUser(userId)`: 关注用户
- `_unfollowUser(userId)`: 取消关注用户
- `_getFollowList(type)`: 获取关注/粉丝列表，type可选'following'或'follower'
- `_blockUser(userId)`: 拉黑用户
- `_unblockUser(userId)`: 取消拉黑用户

##### 帖子行为 (`postBehavior.js`)

专注于帖子相关API交互，方法以下划线开头，不存储状态。

主要方法：
- `_getPostList(filter, page, limit)`: 获取帖子列表，支持分类、排序等筛选
- `_getPostDetail(postId)`: 获取帖子详情
- `_getPostStatus(postIds)`: 获取帖子状态(点赞、收藏等)
- `_createPost(postData)`: 创建帖子
- `_updatePost(postId, postData)`: 更新帖子
- `_deletePost(postId)`: 删除帖子
- `_likePost(postId)`: 点赞/取消点赞帖子
- `_favoritePost(postId)`: 收藏/取消收藏帖子

##### 评论行为 (`commentBehavior.js`)

专注于评论相关API交互，方法以下划线开头，不存储状态。

主要方法：
- `_getComment(page, pageSize)`: 获取评论数据
- `getInitialComment(postId, params)`: 加载初始评论列表
- `getMoreComment()`: 加载更多评论/回复
- `submitTopComment()`: 提交顶级评论
- `_createComment(postId, content)`: 创建评论
- `_deleteComment(commentId)`: 删除评论
- `_likeComment(commentId)`: 点赞评论


#### 组件复用 (Components)

项目提供了多个可复用的UI组件，应优先使用这些组件构建页面。

##### 使用图标组件

项目统一使用`icon`组件显示图标，此组件与`icons/`目录建立了映射关系：

```html
<!-- wxml文件中使用 -->
<icon name="like" size="20" color="#ff4400"></icon>
<icon name="comment" size="20"></icon>
```

**重要规范**：
- 所有图标必须通过`icon`组件管理，严禁使用图片或内联svg替代
- 图标名称采用小写连字符命名，对应icons目录下同名PNG文件
- 添加新图标时，先添加PNG文件到`icons`目录，再更新`icon`组件的映射表

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

##### 使用帖子列表组件 (`post-list`)

帖子列表组件封装了帖子列表数据获取、分页、空状态等功能，内部已与`postBehavior`集成，无需额外引入行为：

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

##### 使用帖子项组件 (`post-item`)

帖子项组件封装了单个帖子的展示和交互，可以单独使用或被`post-list`调用。此组件集成了多个behavior，包括`baseBehavior`、`postBehavior`和`userBehavior`，并在内部处理了所有交互逻辑：

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

`post-item`组件内部已集成多个behavior并处理了所有交互：
- 点击帖子区域：自动跳转至帖子详情页
- 点击用户头像/昵称：自动跳转至用户主页
- 点击点赞按钮：自动调用`postBehavior`的`_likePost`方法
- 点击收藏按钮：自动调用`postBehavior`的`_favoritePost`方法
- 点击关注按钮：自动调用`userBehavior`的`_toggleFollow`方法
- 点击图片：自动预览大图
- 点击标签：自动跳转至相关标签页面

这种"智能组件"设计是本项目的特色，通过在组件内部集成behavior提供完整功能，使页面代码更加精简。使用者只需提供数据，组件自动处理交互和业务逻辑，无需在页面层面处理事件绑定和回调。

##### 使用状态管理组件 (`cell-status`)

`cell-status`组件是一个强大的状态管理组件，用于统一处理加载、错误、空状态和成功状态的显示，使页面代码更加简洁：

```html
<!-- wxml文件中使用 -->
<cell-status 
  status="{{status}}" 
  error-msg="{{errorMsg}}"
  empty-text="暂无数据"
  loading-text="加载中..."
  has-more="{{hasMore}}"
  bind:retry="handleRetry"
  bind:loadMore="handleLoadMore">
  
  <!-- 正常内容放在这里 -->
  <view slot="content">
    <!-- 您的内容 -->
  </view>
  
</cell-status>
```

```javascript
// js文件中
Page({
  data: {
    status: 'loading', // loading, error, empty, success, normal
    errorMsg: '',
    hasMore: true,
    // 其他数据
  },
  
  onLoad() {
    this.loadData();
  },
  
  // 加载数据
  async loadData() {
    try {
      this.setData({ status: 'loading' });
      
      // 调用API或执行数据加载逻辑
      const result = await someApiCall();
      
      if (result.data && result.data.length > 0) {
        this.setData({
          dataList: result.data,
          status: 'normal',
          hasMore: result.has_more
        });
      } else {
        // 设置空状态
        this.setData({ status: 'empty' });
      }
    } catch (err) {
      console.debug('加载数据失败:', err);
      this.setData({
        status: 'error',
        errorMsg: '加载失败，请重试'
      });
    }
  },
  
  // 重试处理
  handleRetry() {
    this.loadData();
  },
  
  // 加载更多
  handleLoadMore() {
    // 实现加载更多逻辑
  }
});
```

**注意事项**：
- 不要将`cell-status`组件包裹在整个页面外面，它应该只管理特定内容块的状态
- 正常内容必须放在组件的默认插槽或`content`具名插槽中
- `status`属性控制显示状态，可选值有`loading`、`error`、`empty`、`success`、`normal`
- 当有更多数据需要分页加载时，设置`has-more`属性和监听`loadMore`事件

##### 使用功能网格菜单 (`function-grid-menu`)

`function-grid-menu`组件提供了网格布局的功能菜单，适合用于功能入口的展示：

```html
<!-- wxml文件中使用 -->
<function-grid-menu
  title="常用功能"
  menu-items="{{menuItems}}"
  bind:itemtap="handleMenuItemTap">
</function-grid-menu>
```

```javascript
// js文件中
Page({
  data: {
    menuItems: [
      { icon: 'post', text: '发布', type: 'post' },
      { icon: 'question', text: '提问', type: 'question' },
      { icon: 'favorite', text: '收藏', type: 'favorite' },
      { icon: 'history', text: '历史', type: 'history' }
    ]
  },
  
  // 点击菜单项处理
  handleMenuItemTap(e) {
    const { type } = e.detail;
    
    // 根据类型执行不同操作
    switch(type) {
      case 'post':
        wx.navigateTo({ url: '/pages/post/create' });
        break;
      case 'question':
        wx.navigateTo({ url: '/pages/question/create' });
        break;
      case 'favorite':
        wx.navigateTo({ url: '/pages/profile/favorite' });
        break;
      case 'history':
        wx.navigateTo({ url: '/pages/profile/history' });
        break;
    }
  }
});
```

##### 使用Markdown渲染组件 (`towxml`)

`towxml`是第三方的Markdown/HTML渲染组件，本项目集成了该组件用于渲染富文本内容：

```html
<!-- wxml文件中使用 -->
<towxml 
  nodes="{{article.nodes}}" 
  base-url="{{baseUrl}}"
  bind:tap="handleLinkTap">
</towxml>
```

```javascript
// js文件中
const towxml = require('../../components/towxml/index');

Page({
  data: {
    article: {},
    baseUrl: 'https://example.com'
  },
  
  onLoad(options) {
    const { content } = options;
    if (content) {
      this.renderMarkdown(content);
    }
  },
  
  // 渲染Markdown内容
  renderMarkdown(content) {
    // 调用towxml解析markdown
    const article = towxml.toJson(
      content,               // markdown或html字符串
      'markdown',            // 'markdown'或'html'
      this.data.baseUrl,     // 图片、代码等资源的相对基础路径
      {
        theme: 'light',      // 主题，light或dark
        highlight: true      // 是否代码高亮
      }
    );
    
    this.setData({ article });
  },
  
  // 处理链接点击
  handleLinkTap(e) {
    const { href } = e.detail;
    
    if (href) {
      // 处理链接跳转逻辑
      if (href.startsWith('http')) {
        // 外部链接
        wx.setClipboardData({
          data: href,
          success: () => {
            wx.showToast({
              title: '链接已复制',
              icon: 'success'
            });
          }
        });
      } else {
        // 内部链接，可以在这里处理页面跳转
        wx.navigateTo({ url: href });
      }
    }
  }
});
```

**注意事项**：
- `towxml`组件支持Markdown和HTML格式转换
- 可以通过`theme`属性设置明暗主题
- 必须提供`base-url`属性来指定资源基础路径

#### 工具函数复用 (Utils)

`util.js`提供了大量实用工具函数，应熟悉并优先使用。

##### 网络请求与API工厂

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

##### 存储管理工具

`util.js`中封装了本地存储的操作方法，统一通过`storage`对象使用：

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

始终使用`storage`对象而不是直接调用`wx.setStorageSync`等方法，这样能保证存储操作的一致性并便于后期扩展和维护。典型应用场景包括：

- 用户信息存储：`storage.set('userInfo', userInfo)`
- 身份验证信息：`storage.set('openid', openid)`
- 用户设置：`storage.set('settings', settings)`
- 缓存数据：`storage.set('postCache', posts)`

##### 界面交互工具

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

##### 错误处理工具

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

##### 数据处理工具

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

### 命名规范

本项目严格遵循以下命名规范，所有开发者**必须遵循这些规范**，以确保代码质量和一致性。

#### 单数形式

- ✅ **正确**：`post`、`user`、`image`
- ❌ 错误：posts、users、comments、images、tags

#### 大小写规则

- 默认小写命名
- 驼峰命名用大写（如 `getUserInfo`、`postDetail`）
- 下划线分割时用小写（如 `post_id`、`user_name`）

#### 字段命名

api交互字段最好用api文档严格一致。
比如计数字段统一使用 xxx_count 格式：
- `like_count`（点赞数）
- `comment_count`（评论数）
- `favorite_count`（收藏数）
- `view_count`（浏览数）
- `follower_count`（粉丝数）
- `following_count`（关注数）

#### 文件命名
- JS文件：小写并用连字符分隔（如 `post-behavior.js`、`user-card.js`）
- WXML/WXSS文件：与对应JS文件同名（如 `user-card.wxml`、`user-card.wxss`）

#### 组件命名

- 组件目录：与组件名一致（如 `components/post-item/`）
- 组件文件：与目录同名（如 `post-item.js`、`post-item.wxml`）

#### API接口

- 路径格式：
  - 以 `/api/` 开头
  - 微信小程序API：`/api/wxapp/` 前缀
  - 智能体API：`/api/agent/` 前缀
  - 路径统一小写
  - 单词间用短横线连接
- 参数命名：一般是小写下划线命名法（如 `post_id`、`user_id`）

### 发布流程

发布前请按以下流程进行检查和发布操作：

#### 发布前检查

1. **代码审核**: 
   - 确保代码遵循了项目的命名规范和结构规范
   - 确保无控制台报错和明显bug
   - 确保与设计稿一致性

2. **性能检测**:
   - 使用微信开发者工具的"Performance"标签页进行性能分析
   - 检查页面加载时间不超过2秒
   - 确保首屏渲染速度良好

3. **兼容性测试**:
   - 在Android和iOS两个平台上进行测试
   - 确保在不同尺寸设备上显示正常

#### 版本管理

1. **版本号规则**: 
   - 格式为：`主版本号.次版本号.修订号`
   - 例如：`0.0.1`, `0.1.0`, `1.0.0`
   - 重大更新增加主版本号，功能更新增加次版本号，bug修复增加修订号

2. **版本记录**:
   - 在`app.js`中更新版本号
   - 在`CHANGELOG.md`文件中记录版本变更内容

#### 发布步骤

1. **体验版发布**:
   - 在微信开发者工具中选择"上传"
   - 填写版本号和项目备注
   - 上传完成后，在微信公众平台的小程序管理后台设置为"体验版"
   - 让测试人员进行体验测试

2. **正式版发布**:
   - 体验版确认无问题后，在微信公众平台小程序管理后台选择"提交审核"
   - 填写完整的版本功能介绍和测试帐号
   - 审核通过后，点击"发布"按钮将小程序发布到线上环境

3. **灰度发布**:
   - 对于重大更新，建议先设置10%流量进行灰度发布
   - 观察1-2天无异常后再全量发布

#### 发布后监控

1. **错误监控**:
   - 使用微信后台的"运维中心"监控线上错误
   - 紧急问题立即修复并重新提交审核

2. **用户反馈**:
   - 关注小程序反馈渠道的用户意见
   - 整理反馈并计划到下一个迭代中修复/优化

### 学习资源

#### 开发文档

- [微信官方小程序文档](https://developers.weixin.qq.com/miniprogram/dev/framework/) - 微信小程序开发的官方文档和API参考
- [WEUI组件库文档](https://developers.weixin.qq.com/miniprogram/dev/extended/weui/) - 微信官方UI组件库
- [nkuwiki API文档](./api_docs.md) - 本项目后端API接口文档
- [nkuwiki 原型图](https://mastergo.com/file/152887751273499?fileOpenFrom=home&page_id=M&shareId=152887751273499) - MasterGo原型设计

#### 工具和资源

- [ColorUI](https://github.com/weilanwl/ColorUI) - 小程序的css组件库，提供了丰富的UI样式
- [icon8](https://icons8.com/icons) - 矢量图标库，可用于寻找合适的图标
- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) - 官方IDE下载
