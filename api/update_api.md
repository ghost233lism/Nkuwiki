# 小程序数据更新机制

本文档说明南开知识小程序中实现的数据更新机制，主要包括：

1. 全局数据更新机制
2. 点赞、收藏、评论操作后的即时更新
3. 各页面的数据更新策略

## 全局数据更新机制

### 概述

小程序采用了一个全局数据同步策略，通过以下几个组件实现：

1. `app.js` 中的数据同步任务
2. 全局状态管理
3. 页面间通信机制

### 核心函数

#### `app.js` 中的数据同步

```javascript
// 启动数据同步任务
startDataSyncTask() {
  // 定期同步数据
  this.syncPostsData();
  
  // 每隔一段时间自动同步
  const syncInterval = this.globalData.config.syncInterval || 30000; // 默认30秒
  this.dataSyncTimer = setInterval(() => {
    this.syncPostsData();
  }, syncInterval);
},

// 同步帖子数据
async syncPostsData() {
  // 判断是否需要更新
  if (!this.globalData.needUpdatePosts && !this.globalData.forceUpdatePosts) {
    return;
  }
  
  try {
    // 获取需要更新的帖子列表
    const postIds = this.getPostIdsToUpdate();
    if (postIds.length === 0) return;
    
    // 调用API获取最新数据
    const { postAPI } = require('./utils/api/index');
    const result = await postAPI.getPostsLatestData(postIds);
    
    if (result && result.posts) {
      // 更新全局数据
      this.updatePostsGlobalData(result.posts);
      
      // 重置更新标志
      this.globalData.needUpdatePosts = false;
      this.globalData.forceUpdatePosts = false;
      
      // 通知页面更新
      this.notifyPagesUpdate();
    }
  } catch (error) {
    console.error('同步帖子数据失败:', error);
  }
},

// 通知所有页面数据更新
notifyPagesUpdate() {
  const pages = getCurrentPages();
  
  pages.forEach(page => {
    if (page && typeof page.onPostsDataUpdate === 'function') {
      page.onPostsDataUpdate(this.globalData.postUpdates || {});
    }
  });
}
```

#### 单个帖子最新数据获取

```javascript
// 获取单个帖子的最新数据
getPostLatestData(postId) {
  if (!postId || !this.globalData.postUpdates) return null;
  return this.globalData.postUpdates[postId];
}
```

## 点赞、收藏、评论操作更新机制

### 点赞操作

```javascript
// 在post.js中的likePost函数
likePost: (postId, isLikeOrOpenid) => {
  // ... 发送请求代码 ...
  return request({/*...*/}).then(res => {
    // 操作完成后，通知全局事件系统
    const app = getApp();
    if (app && app.globalData) {
      // 存储最新操作结果
      if (!app.globalData.postUpdates) {
        app.globalData.postUpdates = {};
      }
      
      app.globalData.postUpdates[postId] = {
        id: postId,
        isLiked: isLike,
        likes: res.likes || res.like_count,
        updateTime: Date.now()
      };
      
      // 设置需要更新的标志
      app.globalData.needUpdatePosts = true;
      
      // 立即通知页面更新，不等待下一次同步
      if (typeof app.notifyPagesUpdate === 'function') {
        app.notifyPagesUpdate();
      }
    }
    
    return res;
  });
}
```

### 收藏操作

```javascript
// 在post.js中的favoritePost函数
favoritePost: (postId, isFavoriteOrOpenid, isFavorite) => {
  // ... 发送请求代码 ...
  return request({/*...*/}).then(res => {
    // 操作完成后，通知全局事件系统
    const app = getApp();
    if (app && app.globalData) {
      // 存储最新操作结果
      if (!app.globalData.postUpdates) {
        app.globalData.postUpdates = {};
      }
      
      // 如果之前已经有对这个帖子的更新，合并数据
      const existingUpdate = app.globalData.postUpdates[postId] || {};
      
      app.globalData.postUpdates[postId] = {
        ...existingUpdate,
        id: postId,
        isFavorited: shouldFavorite,
        favorite_count: res.favorite_count || res.favoriteCount,
        updateTime: Date.now()
      };
      
      // 设置需要更新的标志
      app.globalData.needUpdatePosts = true;
      
      // 立即通知页面更新，不等待下一次同步
      if (typeof app.notifyPagesUpdate === 'function') {
        app.notifyPagesUpdate();
      }
    }
    
    return res;
  });
}
```

### 评论操作

```javascript
// 在comment.js中的addComment函数
addComment: (params) => {
  // ... 发送请求代码 ...
  return request({/*...*/}).then(res => {
    // 操作完成后，通知全局数据需要更新
    const app = getApp();
    if (app && app.globalData) {
      // 存储最新操作结果
      if (!app.globalData.postUpdates) {
        app.globalData.postUpdates = {};
      }
      
      // 如果之前已经有对这个帖子的更新，合并数据
      const existingUpdate = app.globalData.postUpdates[post_id] || {};
      const newCommentCount = (existingUpdate.comment_count || 0) + 1;
      
      app.globalData.postUpdates[post_id] = {
        ...existingUpdate,
        id: post_id,
        comment_count: newCommentCount,
        updateTime: Date.now()
      };
      
      // 设置需要更新的标志
      app.globalData.needUpdatePosts = true;
      
      // 立即通知页面更新，不等待下一次同步
      if (typeof app.notifyPagesUpdate === 'function') {
        app.notifyPagesUpdate();
      }
    }
    
    return res;
  });
}
```

## 页面更新机制实现

每个页面需要实现以下方法来支持全局数据更新：

### 1. 检查全局更新

```javascript
// 检查全局数据更新
checkGlobalUpdates() {
  const app = getApp();
  const postUpdates = app.globalData.postUpdates;
  
  if (!postUpdates) return;
  
  // 获取此页面的帖子列表
  const posts = this.data.posts;
  if (!posts || !posts.length) return;
  
  let hasUpdates = false;
  
  // 检查每个帖子是否有更新
  posts.forEach(post => {
    const update = postUpdates[post.id];
    if (update && update.updateTime > (post.lastUpdateTime || 0)) {
      hasUpdates = true;
    }
  });
  
  if (hasUpdates) {
    this.updatePostsWithLatestData(postUpdates);
  }
}
```

### 2. 使用最新数据更新帖子

```javascript
// 使用最新数据更新帖子列表
updatePostsWithLatestData(updates) {
  if (!updates || !this.data.posts) return;
  
  const posts = [...this.data.posts];
  let hasChanges = false;
  
  posts.forEach((post, index) => {
    const update = updates[post.id];
    if (update) {
      // 更新点赞状态和数量
      if (update.hasOwnProperty('isLiked')) {
        post.isLiked = update.isLiked;
        hasChanges = true;
      }
      if (update.hasOwnProperty('likes')) {
        post.likes = update.likes;
        hasChanges = true;
      }
      
      // 更新收藏状态和数量
      if (update.hasOwnProperty('isFavorited')) {
        post.isFavorited = update.isFavorited;
        hasChanges = true;
      }
      if (update.hasOwnProperty('favorite_count')) {
        post.favorite_count = update.favorite_count;
        hasChanges = true;
      }
      
      // 更新评论数量
      if (update.hasOwnProperty('comment_count')) {
        post.comment_count = update.comment_count;
        hasChanges = true;
      }
      
      // 更新最后更新时间
      post.lastUpdateTime = update.updateTime;
    }
  });
  
  // 如果有更新，则更新页面数据
  if (hasChanges) {
    this.setData({ posts });
  }
}
```

### 3. 接收全局数据更新通知

```javascript
// 接收全局数据更新通知
onPostsDataUpdate(updates) {
  if (!updates) return;
  
  console.debug('收到帖子数据更新通知');
  this.updatePostsWithLatestData(updates);
}
```

### 4. 在页面显示时检查更新

```javascript
onShow() {
  // 检查是否有全局数据更新
  this.checkGlobalUpdates();
}
```

## API 参考

### 点赞API

```javascript
/**
 * 点赞帖子
 * @param {number|string} postId - 帖子ID
 * @param {boolean|string} isLikeOrOpenid - 是否点赞(布尔值)或用户openid(字符串)
 * @returns {Promise} - 请求Promise
 */
postAPI.likePost(postId, isLikeOrOpenid)
```

### 收藏API

```javascript
/**
 * 收藏帖子
 * @param {number|string} postId - 帖子ID
 * @param {boolean|string} isFavoriteOrOpenid - 是否收藏(布尔值)或用户openid(字符串)
 * @param {boolean} [isFavorite] - 是否收藏，true为收藏，false为取消收藏，仅在第二个参数为openid时使用
 * @returns {Promise} - 请求Promise
 */
postAPI.favoritePost(postId, isFavoriteOrOpenid, isFavorite)
```

### 评论API

```javascript
/**
 * 添加评论
 * @param {Object} params - 评论参数
 * @param {string} params.post_id - 帖子ID
 * @param {string} params.content - 评论内容
 * @param {string} [params.parent_id] - 父评论ID（回复时使用）
 * @param {string} [params.openid] - 用户openid，不传则使用当前用户
 * @returns {Promise} - 请求Promise
 */
commentAPI.addComment(params)
```

## 最佳实践

1. 所有对帖子的交互操作（点赞、收藏、评论）都应该立即更新全局数据状态
2. 页面在显示时应检查全局数据是否有更新
3. 页面应实现 `onPostsDataUpdate` 方法来接收数据更新通知
4. 避免频繁调用API进行数据同步，优先使用全局数据缓存 