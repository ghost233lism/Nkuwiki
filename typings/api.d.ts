declare namespace API {
  interface Response<T> {
    code: number
    data: T
    message?: string
  }

  type PaginationParams = {
    page?: number
    pageSize?: number
  }

  type PaginationResult<T> = {
    list: T[]
    total: number
  }

  interface PostItem {
    id: string
    title: string
    content: string
    createTime: string
  }

  interface FactoryOptions<T> {
    endpoint: string
    validator?: (data: unknown) => boolean | string
    processor?: (data: T) => T
  }
}

// 修正命名空间引用问题
declare namespace WechatMiniprogram {
  namespace Page {
    interface Options {
      // ...原有类型...
    }
  }
}

// 扩展Page类型定义
declare type PageOptionsWithAPI = WechatMiniprogram.Page.Options & {
  callAPI?: <T>(method: Promise<API.Response<T>>, params?: object) => Promise<T>
}

// API响应类型定义
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 用户相关类型
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
}

// 帖子相关类型
interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  user_info: UserInfo;
  view_count: number;
  like_count: number;
  comment_count: number;
  create_time: string;
  update_time: string;
}

// 评论相关类型
interface Comment {
  id: string;
  content: string;
  post_id: string;
  user_id: string;
  user_info: UserInfo;
  like_count: number;
  create_time: string;
} 