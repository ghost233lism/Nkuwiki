
## 一、用户接口

### 1.1 同步微信云用户

**接口**：`POST /users/sync`  
**描述**：同步微信云数据库用户到主服务器，支持使用云数据库ID作为主键  
**请求头**：
- `X-Cloud-Source` - 可选，标记来源
- `X-Prefer-Cloud-ID` - 可选，标记优先使用云ID

**请求体**：

```json
{
  "id": "微信云数据库ID",
  "cloud_id_alias": "微信云数据库ID（别名）",
  "wxapp_id": "用户在微信小程序中的原始ID",
  "openid": "微信用户唯一标识",
  "nickname": "用户昵称（可选）",
  "avatar_url": "头像URL（可选）",
  "university": "南开大学",
  "login_type": "wechat",
  "cloud_source": true,
  "use_cloud_id": true
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "data": {
      "id": "10001",
      "wxapp_id": "用户微信小程序ID",
      "openid": "微信用户唯一标识",
      "cloud_id": "微信云数据库ID",
      "nickname": "用户昵称",
      "avatar_url": "头像URL",
      "university": "南开大学",
      "login_type": "wechat",
      "create_time": "2023-01-01 12:00:00",
      "update_time": "2023-01-01 12:00:00",
      "status": 1
    },
    "cloud_id": "微信云数据库ID",
    "server_id": "10001",
    "id_mapping": {
      "cloud_to_server": {"微信云数据库ID": "10001"},
      "server_to_cloud": {"10001": "微信云数据库ID"}
    }
  }
}
```

### 1.2 获取用户信息

**接口**：`GET /users/{user_id}`  
**描述**：获取指定用户的信息  
**参数**：
- `user_id` - 路径参数，用户ID（可以是服务器ID或云ID）

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "wxapp_id": "用户微信小程序ID",
    "openid": "微信用户唯一标识",
    "cloud_id": "微信云数据库ID",
    "nickname": "用户昵称",
    "avatar_url": "头像URL",
    "gender": 0,
    "country": "国家",
    "province": "省份",
    "city": "城市",
    "language": "语言",
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "token_count": 0,
    "followers_count": 0,
    "following_count": 0,
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
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
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

### 1.6 获取用户关注统计

**接口**：`GET /users/{user_id}/follow-stats`  
**描述**：获取用户的关注和粉丝数量  
**参数**：
- `user_id` - 路径参数，用户ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "followedCount": 10,
    "followerCount": 20
  }
}
```

### 1.7 获取用户Token数量

**接口**：`GET /users/{user_id}/token`  
**描述**：获取用户的Token余额  
**参数**：
- `user_id` - 路径参数，用户ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": 100
  }
}
```

### 1.8 更新用户Token数量

**接口**：`POST /users/{user_id}/token`  
**描述**：更新用户的Token数量  
**参数**：
- `user_id` - 路径参数，用户ID

**请求体**：

```json
{
  "action": "add",
  "amount": 10
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": 110,
    "message": "Token更新成功"
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
  "user_id": "用户ID",
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
    "user_id": "用户ID",
    "user_name": "用户昵称",
    "user_avatar": "用户头像URL",
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
    "user_id": "用户ID",
    "user_name": "用户昵称",
    "user_avatar": "用户头像URL",
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
    "status": 1,
    "platform": "wxapp"
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
        "user_id": "用户ID",
        "user_name": "用户昵称",
        "user_avatar": "用户头像URL",
        "title": "帖子标题",
        "content": "帖子内容",
        "images": ["图片URL1", "图片URL2"],
        "tags": ["标签1", "标签2"],
        "category_id": 1,
        "location": "位置信息",
        "view_count": 10,
        "like_count": 5,
        "comment_count": 3,
        "liked_users": ["用户ID1", "用户ID2", "用户ID3", "用户ID4", "用户ID5"],
        "favorite_users": [],
        "create_time": "2023-01-01 12:00:00",
        "update_time": "2023-01-01 12:00:00",
        "status": 1,
        "platform": "wxapp"
      }
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
    "user_id": "用户ID",
    "user_name": "用户昵称", 
    "user_avatar": "用户头像URL",
    "title": "新标题",
    "content": "新内容",
    "images": ["新图片URL1", "新图片URL2"],
    "tags": ["新标签1", "新标签2"],
    "category_id": 2,
    "location": "新位置信息",
    "view_count": 10,
    "like_count": 5,
    "comment_count": 3,
    "liked_users": ["用户ID1", "用户ID2", "用户ID3", "用户ID4", "用户ID5"],
    "favorite_users": [],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 13:00:00",
    "status": 1,
    "platform": "wxapp"
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

### 2.7 收藏/取消收藏帖子

**接口**：`POST /posts/{post_id}/favorite`  
**描述**：收藏或取消收藏帖子  
**参数**：
- `post_id` - 路径参数，帖子ID
- `user_id` - 查询参数，用户ID

**请求体**：

```json
{
  "is_favorite": true // 或 false
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "收藏成功", // 或 "取消收藏成功"
    "favorite": true, // 或 false
    "favorite_count": 3
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
  "user_id": "用户ID",
  "post_id": 1,
  "content": "评论内容",
  "parent_id": null, // 回复其他评论时设置
  "images": ["图片URL1", "图片URL2"] // 可选
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": "用户ID",
    "user_name": "用户昵称",
    "user_avatar": "用户头像URL",
    "post_id": 1,
    "content": "评论内容",
    "parent_id": null,
    "images": ["图片URL1", "图片URL2"],
    "like_count": 0,
    "liked_users": [],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "platform": "wxapp",
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
    "user_id": "用户ID",
    "user_name": "用户昵称",
    "user_avatar": "用户头像URL",
    "post_id": 1,
    "content": "评论内容",
    "parent_id": null,
    "images": ["图片URL1", "图片URL2"],
    "like_count": 3,
    "liked_users": ["用户ID1", "用户ID2", "用户ID3"],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00",
    "platform": "wxapp",
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
        "user_id": "用户ID",
        "user_name": "用户昵称",
        "user_avatar": "用户头像URL",
        "post_id": 1,
        "content": "评论内容",
        "parent_id": null,
        "images": ["图片URL1", "图片URL2"],
        "like_count": 3,
        "liked_users": ["用户ID1", "用户ID2", "用户ID3"],
        "create_time": "2023-01-01 12:00:00",
        "update_time": "2023-01-01 12:00:00",
        "platform": "wxapp",
        "status": 1
      }
    ],
    "total": 50,
    "limit": 50,
    "offset": 0
  }
}
```

### 3.4 获取帖子评论

**接口**：`GET /posts/{post_id}/comments`  
**描述**：获取指定帖子的评论列表  
**参数**：
- `post_id` - 路径参数，帖子ID
- `limit` - 查询参数，返回记录数量限制，默认50
- `offset` - 查询参数，分页偏移量，默认0
- `parent_id` - 查询参数，父评论ID，可选（为null时获取一级评论）
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
        "user_id": "用户ID",
        "user_name": "用户昵称",
        "user_avatar": "用户头像URL",
        "post_id": 1,
        "content": "评论内容",
        "parent_id": null,
        "images": ["图片URL1", "图片URL2"],
        "like_count": 3,
        "liked_users": ["用户ID1", "用户ID2", "用户ID3"],
        "create_time": "2023-01-01 12:00:00",
        "update_time": "2023-01-01 12:00:00",
        "platform": "wxapp",
        "status": 1
      }
    ],
    "total": 50,
    "limit": 50,
    "offset": 0
  }
}
```

### 3.5 更新评论

**接口**：`PUT /comments/{comment_id}`  
**描述**：更新评论信息  
**参数**：
- `comment_id` - 路径参数，评论ID

**请求体**：

```json
{
  "content": "新评论内容",
  "images": ["新图片URL1", "新图片URL2"],
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
    "user_id": "用户ID",
    "user_name": "用户昵称",
    "user_avatar": "用户头像URL",
    "post_id": 1,
    "content": "新评论内容",
    "parent_id": null,
    "images": ["新图片URL1", "新图片URL2"],
    "like_count": 3,
    "liked_users": ["用户ID1", "用户ID2", "用户ID3"],
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 13:00:00",
    "platform": "wxapp",
    "status": 1
  }
}
```

### 3.6 删除评论

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

### 3.7 点赞/取消点赞评论

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

## 四、通知接口

### 4.1 获取用户通知列表

**接口**：`GET /users/{user_id}/notifications`  
**描述**：获取用户的通知列表  
**参数**：
- `user_id` - 路径参数，用户ID
- `type` - 查询参数，通知类型，可选
- `is_read` - 查询参数，是否已读，可选
- `limit` - 查询参数，返回记录数量限制，默认20
- `offset` - 查询参数，分页偏移量，默认0

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "notifications": [
      {
        "id": 1,
        "user_id": "用户ID",
        "sender_id": "发送者ID",
        "sender_name": "发送者昵称",
        "sender_avatar": "发送者头像",
        "type": "comment",
        "content": "通知内容",
        "related_id": 123,
        "is_read": false,
        "create_time": "2023-01-01 12:00:00",
        "update_time": "2023-01-01 12:00:00"
      }
    ],
    "unread_count": 5,
    "total": 20,
    "limit": 20,
    "offset": 0
  }
}
```

### 4.2 获取通知详情

**接口**：`GET /notifications/{notification_id}`  
**描述**：获取通知详情  
**参数**：
- `notification_id` - 路径参数，通知ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": "用户ID",
    "sender_id": "发送者ID",
    "sender_name": "发送者昵称",
    "sender_avatar": "发送者头像",
    "type": "comment",
    "content": "通知内容",
    "related_id": 123,
    "related_type": "post",
    "related_content": "相关内容摘要",
    "is_read": false,
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00"
  }
}
```

### 4.3 标记通知为已读

**接口**：`PUT /notifications/{notification_id}`  
**描述**：标记单个通知为已读  
**参数**：
- `notification_id` - 路径参数，通知ID

**请求体**：

```json
{
  "is_read": true
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "通知已标记为已读"
  }
}
```

### 4.4 标记所有通知为已读

**接口**：`PUT /users/{user_id}/notifications/read-all`  
**描述**：标记用户所有通知为已读  
**参数**：
- `user_id` - 路径参数，用户ID
- `type` - 请求体参数，通知类型，可选

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "所有通知已标记为已读",
    "affected_count": 5
  }
}
```

### 4.5 删除通知

**接口**：`DELETE /notifications/{notification_id}`  
**描述**：删除通知  
**参数**：
- `notification_id` - 路径参数，通知ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "通知已删除"
  }
}
```

## 五、反馈接口

### 5.1 提交反馈

**接口**：`POST /feedback`  
**描述**：提交意见反馈  
**请求体**：

```json
{
  "user_id": "用户ID",
  "content": "反馈内容",
  "contact": "联系方式",
  "images": ["图片URL1", "图片URL2"],
  "type": "bug" // bug, suggestion, other
}
```

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": "用户ID",
    "content": "反馈内容",
    "contact": "联系方式",
    "images": ["图片URL1", "图片URL2"],
    "type": "bug",
    "status": "pending",
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 12:00:00"
  }
}
```

### 5.2 获取用户反馈列表

**接口**：`GET /users/{user_id}/feedback`  
**描述**：获取用户的反馈列表  
**参数**：
- `user_id` - 路径参数，用户ID
- `limit` - 查询参数，返回记录数量限制，默认20
- `offset` - 查询参数，分页偏移量，默认0
- `status` - 查询参数，反馈状态，可选

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "feedbacks": [
      {
        "id": 1,
        "user_id": "用户ID",
        "content": "反馈内容",
        "contact": "联系方式",
        "images": ["图片URL1", "图片URL2"],
        "type": "bug",
        "status": "pending",
        "reply": null,
        "create_time": "2023-01-01 12:00:00",
        "update_time": "2023-01-01 12:00:00"
      }
    ],
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

### 5.3 获取反馈详情

**接口**：`GET /feedback/{feedback_id}`  
**描述**：获取反馈详情  
**参数**：
- `feedback_id` - 路径参数，反馈ID

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": "用户ID",
    "content": "反馈内容",
    "contact": "联系方式",
    "images": ["图片URL1", "图片URL2"],
    "type": "bug",
    "status": "resolved",
    "reply": "管理员回复内容",
    "create_time": "2023-01-01 12:00:00",
    "update_time": "2023-01-01 13:00:00",
    "resolve_time": "2023-01-01 13:00:00"
  }
}
```

## 六、平台信息接口

### 6.1 获取平台信息

**接口**：`GET /about`  
**描述**：获取平台基础信息  

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "name": "南开百科",
    "version": "1.0.0",
    "description": "南开百科是一个知识共享平台",
    "contact": "contact@nkuwiki.com",
    "website": "https://nkuwiki.com",
    "founded": "2023-01-01"
  }
}
```

### 6.2 获取版本历史

**接口**：`GET /versions`  
**描述**：获取应用版本更新历史  
**参数**：
- `limit` - 查询参数，返回记录数量限制，默认10

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "versions": [
      {
        "version": "1.0.0",
        "release_date": "2023-01-01",
        "description": "首次发布",
        "changes": ["功能1", "功能2", "功能3"]
      },
      {
        "version": "1.0.1",
        "release_date": "2023-01-15",
        "description": "Bug修复",
        "changes": ["修复问题1", "修复问题2"]
      }
    ]
  }
}
```

### 6.3 获取用户协议和隐私政策

**接口**：`GET /agreement/{type}`  
**描述**：获取用户协议或隐私政策  
**参数**：
- `type` - 路径参数，协议类型：user-用户协议, privacy-隐私政策

**响应**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "title": "用户协议",
    "content": "用户协议内容...",
    "version": "1.0",
    "update_time": "2023-01-01 12:00:00"
  }
}
```

## 七、错误代码

| 状态码 | 说明 |
|--------|------|
| 200    | 成功 |
| 400    | 请求参数错误 |
| 401    | 未授权，需要登录 |
| 403    | 禁止访问，无权限 |
| 404    | 资源不存在 |
| 429    | 请求过于频繁 |
| 500    | 服务器内部错误 |
| 502    | 网关错误 |
| 503    | 服务不可用 |
| 504    | 网关超时 | 