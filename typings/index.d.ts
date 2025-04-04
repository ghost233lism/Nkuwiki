/**
 * 全局类型定义
 */

// 全局命名空间
declare namespace NKUWiki {
  // API响应类型
  interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T;
    success?: boolean;
  }
  
  // 分页参数
  interface PaginationParams {
    page: number;
    pageSize: number;
  }
  
  // 分页结果
  interface PaginationResult<T> {
    list: T[];
    total: number;
    hasMore?: boolean;
  }
  
  // 用户信息
  interface UserInfo {
    id: string;
    openid: string;
    nickname: string;
    avatar: string;
    gender: number;
    phone?: string;
    email?: string;
    create_time: string;
    update_time: string;
    is_admin?: boolean;
    level?: number;
    points?: number;
    signature?: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    favorites_count?: number;
  }
  
  // 帖子信息
  interface Post {
    id: string;
    title: string;
    content: string;
    user_id: string;
    user_info: UserInfo;
    images?: string[] | string;
    tags?: string[];
    view_count: number;
    like_count: number;
    comment_count: number;
    favorite_count?: number;
    create_time: string;
    update_time: string;
    
    // 客户端扩展字段
    formattedTime?: string;
    isLiked?: boolean;
    isFavorited?: boolean;
  }
  
  // 评论信息
  interface Comment {
    id: string;
    content: string;
    post_id: string;
    user_id: string;
    user_info: UserInfo;
    images?: string[] | string;
    like_count: number;
    create_time: string;
    update_time?: string;
    
    // 客户端扩展字段
    formattedTime?: string;
    isLiked?: boolean;
  }
  
  // 通知信息
  interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'system';
    sender_id: string;
    sender_info?: UserInfo;
    receiver_id: string;
    content: string;
    resource_id?: string;  // 相关资源ID，如帖子ID、评论ID等
    resource_type?: 'post' | 'comment';
    is_read: boolean;
    create_time: string;
    
    // 客户端扩展字段
    formattedTime?: string;
  }
  
  // 搜索历史
  interface SearchHistory {
    id: string;
    user_id: string;
    keyword: string;
    create_time: string;
  }
  
  // 搜索结果
  interface SearchResult {
    id: string;
    title: string;
    content: string;
    user_info: UserInfo;
    create_time: string;
    type: 'post' | 'user' | 'comment';
    source?: string;
    highlight?: string;
    
    // 客户端扩展字段
    formattedTime?: string;
  }
  
  // 分类信息
  interface Category {
    id: string;
    name: string;
    icon?: string;
    description?: string;
    post_count?: number;
  }
  
  // 标签信息
  interface Tag {
    id: string;
    name: string;
    post_count?: number;
  }
  
  // 上传结果
  interface UploadResult {
    url: string;
    path: string;
    size: number;
    type: string;
    name: string;
  }
  
  // 智能助手查询
  interface AgentQuery {
    query: string;
    conversation_id?: string;
  }
  
  // 智能助手响应
  interface AgentResponse {
    content: string;
    conversation_id: string;
    sources?: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
  }
}

// 微信类型扩展
declare namespace WechatMiniprogram {
  interface Page {
    data: {
      [key: string]: any;
    };
  }
  
  interface Component {
    data: {
      [key: string]: any;
    };
  }
} 