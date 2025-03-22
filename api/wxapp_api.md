# 微信小程序API文档

**基础路径**: `https://nkuwiki.com/wxapp`  
**版本**: 1.0.0  
**描述**: 南开百科微信小程序API接口

## 一、用户接口

### 1.1 创建用户

**接口**：`POST /users`  
**描述**：创建新用户  
**请求体**：

```json
{
  "wxapp_id": "用户在微信小程序中的原始ID",
  "openid": "微信用户唯一标识",
  "unionid": "微信开放平台唯一标识（可选）",
  "nickname": "用户昵称（可选）",
  "avatar_url": "头像URL（可选）",
  "gender": 0,
  "country": "国家（可选）",
  "province": "省份（可选）",
  "city": "城市（可选）",
  "language": "语言（可选）"
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "wxapp_id": "用户微信小程序ID",
    "openid": "微信用户唯一标识",
    "nickname": "用户昵称",
    "avatar_url": "头像URL",
    "gender": 0,
    "country": "国家",
    "province": "省份",
    "city": "城市",
    "language": "语言",
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "status": 1
  }
}
```

### 1.2 获取用户信息

**接口**：`GET /users/{user_id}`  
**描述**：获取指定用户的信息  
**参数**：
- `user_id` - 路径参数，用户ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "wxapp_id": "用户微信小程序ID",
    "openid": "微信用户唯一标识",
    "nickname": "用户昵称",
    "avatar_url": "头像URL",
    "gender": 0,
    "country": "国家",
    "province": "省份",
    "city": "城市",
    "language": "语言",
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "status": 1
  }
}
```

### 1.3 查询用户列表

**接口**：`GET /users`  
**描述**：获取用户列表  
**参数**：
- `limit` - 查询参数，返回记录数量限制，默认20
- `offset` - 查询参数，分页偏移量，默认0
- `status` - 查询参数，用户状态，可选

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "wxapp_id": "用户微信小程序ID",
      "openid": "微信用户唯一标识",
      "nickname": "用户昵称",
      "avatar_url": "头像URL",
      "gender": 0,
      "country": "国家",
      "province": "省份",
      "city": "城市",
      "language": "语言",
      "create_time": "2023-01-01 12:00:00",
      "update_time": "2023-01-01 12:00:00",
      "status": 1
    },
    // 更多用户...
  ]
}
```

### 1.4 更新用户信息

**接口**：`PUT /users/{user_id}`  
**描述**：更新用户信息  
**参数**：
- `user_id` - 路径参数，用户ID

**请求体**：

```json
{
  "nickname": "新昵称",
  "avatar_url": "新头像URL",
  "gender": 1,
  "country": "新国家",
  "province": "新省份",
  "city": "新城市",
  "language": "新语言",
  "status": 1
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "wxapp_id": "用户微信小程序ID",
    "openid": "微信用户唯一标识",
    "nickname": "新昵称",
    "avatar_url": "新头像URL",
    "gender": 1,
    "country": "新国家",
    "province": "新省份",
    "city": "新城市",
    "language": "新语言",
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:30:00",
    "status": 1
  }
}
```

### 1.5 删除用户

**接口**：`DELETE /users/{user_id}`  
**描述**：删除用户（标记删除）  
**参数**：
- `user_id` - 路径参数，用户ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "用户已删除"
  }
}
```

## 二、帖子接口

### 2.1 创建帖子

**接口**：`POST /posts`  
**描述**：创建新帖子  
**请求体**：

```json
{
  "user_id": 1,
  "title": "帖子标题",
  "content": "帖子内容",
  "images": ["图片URL1", "图片URL2"],
  "tags": ["标签1", "标签2"],
  "category_id": 1,
  "location": "位置信息"
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "title": "帖子标题",
    "content": "帖子内容",
    "images": ["图片URL1", "图片URL2"],
    "tags": ["标签1", "标签2"],
    "category_id": 1,
    "location": "位置信息",
    "view_count": 0,
    "like_count": 0,
    "comment_count": 0,
    "liked_users": [],
    "favorite_users": [],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "status": 1
  }
}
```

### 2.2 获取帖子详情

**接口**：`GET /posts/{post_id}`  
**描述**：获取指定帖子的详情  
**参数**：
- `post_id` - 路径参数，帖子ID
- `update_view` - 查询参数，是否更新浏览量，默认true

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "title": "帖子标题",
    "content": "帖子内容",
    "images": ["图片URL1", "图片URL2"],
    "tags": ["标签1", "标签2"],
    "category_id": 1,
    "location": "位置信息",
    "view_count": 1,
    "like_count": 0,
    "comment_count": 0,
    "liked_users": [],
    "favorite_users": [],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "status": 1
  }
}
```

### 2.3 查询帖子列表

**接口**：`GET /posts`  
**描述**：获取帖子列表  
**参数**：
- `limit` - 查询参数，返回记录数量限制，默认20
- `offset` - 查询参数，分页偏移量，默认0
- `user_id` - 查询参数，按用户ID筛选，可选
- `category_id` - 查询参数，按分类ID筛选，可选
- `tag` - 查询参数，按标签筛选，可选
- `status` - 查询参数，帖子状态，默认1
- `order_by` - 查询参数，排序方式，默认"update_time DESC"

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "posts": [
      {
        "id": 1,
        "user_id": 1,
        "title": "帖子标题",
        "content": "帖子内容",
        "images": ["图片URL1", "图片URL2"],
        "tags": ["标签1", "标签2"],
        "category_id": 1,
        "location": "位置信息",
        "view_count": 10,
        "like_count": 5,
        "comment_count": 3,
        "liked_users": [2, 3, 4, 5, 6],
        "favorite_users": [],
        "create_time": "2023-01-01 12:00:00",
        "update_time": "2023-01-01 12:00:00",
        "status": 1
      },
      // 更多帖子...
    ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### 2.4 更新帖子

**接口**：`PUT /posts/{post_id}`  
**描述**：更新帖子信息  
**参数**：
- `post_id` - 路径参数，帖子ID

**请求体**：

```json
{
  "title": "新标题",
  "content": "新内容",
  "images": ["新图片URL1", "新图片URL2"],
  "tags": ["新标签1", "新标签2"],
  "category_id": 2,
  "location": "新位置信息",
  "status": 1
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "title": "新标题",
    "content": "新内容",
    "images": ["新图片URL1", "新图片URL2"],
    "tags": ["新标签1", "新标签2"],
    "category_id": 2,
    "location": "新位置信息",
    "view_count": 10,
    "like_count": 5,
    "comment_count": 3,
    "liked_users": [2, 3, 4, 5, 6],
    "favorite_users": [],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 13:00:00",
    "status": 1
  }
}
```

### 2.5 删除帖子

**接口**：`DELETE /posts/{post_id}`  
**描述**：删除帖子（标记删除）  
**参数**：
- `post_id` - 路径参数，帖子ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "帖子已删除"
  }
}
```

### 2.6 点赞/取消点赞帖子

**接口**：`POST /posts/{post_id}/like`  
**描述**：点赞或取消点赞帖子  
**参数**：
- `post_id` - 路径参数，帖子ID
- `user_id` - 查询参数，用户ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "点赞成功", // 或 "取消点赞成功"
    "liked": true, // 或 false
    "like_count": 6
  }
}
```

## 三、评论接口

### 3.1 创建评论

**接口**：`POST /comments`  
**描述**：创建新评论  
**请求体**：

```json
{
  "user_id": 1,
  "post_id": 1,
  "content": "评论内容",
  "parent_id": null // 回复其他评论时设置
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "post_id": 1,
    "content": "评论内容",
    "parent_id": null,
    "like_count": 0,
    "liked_users": [],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "status": 1
  }
}
```

### 3.2 获取评论详情

**接口**：`GET /comments/{comment_id}`  
**描述**：获取指定评论的详情  
**参数**：
- `comment_id` - 路径参数，评论ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "post_id": 1,
    "content": "评论内容",
    "parent_id": null,
    "like_count": 3,
    "liked_users": [2, 3, 4],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "status": 1
  }
}
```

### 3.3 查询评论列表

**接口**：`GET /comments`  
**描述**：获取评论列表  
**参数**：
- `post_id` - 查询参数，帖子ID，可选
- `user_id` - 查询参数，用户ID，可选
- `parent_id` - 查询参数，父评论ID，可选
- `limit` - 查询参数，返回记录数量限制，默认50
- `offset` - 查询参数，分页偏移量，默认0
- `status` - 查询参数，评论状态，默认1
- `order_by` - 查询参数，排序方式，默认"create_time DESC"

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "comments": [
      {
        "id": 1,
        "user_id": 1,
        "post_id": 1,
        "content": "评论内容",
        "parent_id": null,
        "like_count": 3,
        "liked_users": [2, 3, 4],
        "create_time": "2023-01-01 12:00:00",
        "update_time": "2023-01-01 12:00:00",
        "status": 1
      },
      // 更多评论...
    ],
    "total": 50,
    "limit": 50,
    "offset": 0
  }
}
```

### 3.4 更新评论

**接口**：`PUT /comments/{comment_id}`  
**描述**：更新评论信息  
**参数**：
- `comment_id` - 路径参数，评论ID

**请求体**：

```json
{
  "content": "新评论内容",
  "status": 1
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "post_id": 1,
    "content": "新评论内容",
    "parent_id": null,
    "like_count": 3,
    "liked_users": [2, 3, 4],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 13:00:00",
    "status": 1
  }
}
```

### 3.5 删除评论

**接口**：`DELETE /comments/{comment_id}`  
**描述**：删除评论（标记删除）  
**参数**：
- `comment_id` - 路径参数，评论ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "评论已删除"
  }
}
```

### 3.6 点赞/取消点赞评论

**接口**：`POST /comments/{comment_id}/like`  
**描述**：点赞或取消点赞评论  
**参数**：
- `comment_id` - 路径参数，评论ID
- `user_id` - 查询参数，用户ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "点赞成功", // 或 "取消点赞成功"
    "liked": true, // 或 false
    "like_count": 4
  }
}
```

## 四、错误代码

| 状态码 | 说明 |
|--------|------|
| 200    | 成功 |
| 400    | 请求参数错误 |
| 404    | 资源不存在 |
| 500    | 服务器内部错误 | 