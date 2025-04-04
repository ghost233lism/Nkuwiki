/// <reference path="./wx.d.ts" />

// 这是API响应的标准格式
interface IApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  details: any;
  timestamp: string;
}

// 统一的帖子数据接口，整合后端API返回的数据格式
interface IPostData {
  id: number | string;
  openid: string;
  title: string;
  content: string;
  image: string[];
  tag: string[];
  category_id?: number;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  nickname: string;
  avatar: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count: number;
  liked_users?: string[];
  favorite_users?: string[];
  create_time: string;
  update_time: string;
  status: number;
  is_deleted: number;
  // 前端状态
  isLiked?: boolean;
  isFavorited?: boolean;
  isFollowed?: boolean;
  create_time_formatted?: string;
  // 评论预览
  recent_comment?: ICommentData[];
}

// 评论数据接口
interface ICommentData {
  id: number | string;
  post_id: number | string;
  parent_id: number | string | null;
  openid: string;
  nickname: string;
  avatar: string;
  content: string;
  image?: string[];
  like_count: number;
  reply_count: number;
  create_time: string;
  update_time: string;
  status: number;
  is_deleted: number;
  // 前端状态
  isLiked?: boolean;
  create_time_formatted?: string;
}

// 用户数据接口
interface IUserData {
  id: number | string;
  openid: string;
  unionid?: string;
  nickname: string;
  avatar: string;
  gender: number;
  bio?: string;
  country?: string;
  province?: string;
  city?: string;
  language?: string;
  birthday?: string;
  wechatId?: string;
  qqId?: string;
  token_count: number;
  like_count: number;
  favorite_count: number;
  post_count: number;
  follower_count: number;
  follow_count: number;
  create_time: string;
  update_time: string;
  last_login: string;
  platform: string;
  status: number;
  is_deleted: number;
  extra?: any;
  // 微信小程序兼容字段
  avatarUrl?: string;
  nickName?: string;
  _id?: string;
}

// 通知数据接口
interface INotificationData {
  id: number | string;
  openid: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  sender: {
    openid: string;
    nickname?: string;
    avatar?: string;
  };
  target_id: string;
  target_type: string;
  create_time: string;
  update_time: string;
  status: number;
}

// 帖子项组件属性接口
interface IPostItemProps {
  post: IPostData;
  openid: string;
}

// 帖子项组件事件接口
interface IPostItemEvents {
  like: { id: number | string };
  favorite: { id: number | string };
  comment: { id: number | string };
  follow: { user_id: string };
}

// 用户卡片组件属性接口
interface IUserCardProps {
  user: IUserData;
  isCurrentUser: boolean;
}

// 用户卡片组件事件接口
interface IUserCardEvents {
  follow: { user_id: string };
  edit: void;
}

// 图片上传组件属性接口
interface IImageUploaderProps {
  files: string[];
  maxCount: number;
  showAddBtn?: boolean;
}

// 图片上传组件事件接口
interface IImageUploaderEvents {
  select: { tempFiles: { path: string; size: number; name?: string; type?: string; time?: number }[] };
  delete: { index: number };
  preview: { current: string; urls: string[] };
}

// 加载状态组件属性接口
interface ILoadingProps {
  show: boolean;
  text?: string;
  type?: 'inline' | 'fullscreen' | 'dots';
}

// 错误提示组件属性接口
interface IErrorProps {
  show: boolean;
  text: string;
}

// 评论项组件属性接口
interface ICommentItemProps {
  comment: ICommentData;
  openid: string;
}

// 评论项组件事件接口
interface ICommentItemEvents {
  like: { id: number | string };
  reply: { id: number | string; nickname: string };
  delete: { id: number | string };
}

// 空状态组件属性接口
interface IEmptyProps {
  show: boolean;
  text?: string;
  type?: string;
}

// 声明组件实例类型，可以在页面中引用
declare namespace Component {
  interface PostItem {
    properties: IPostItemProps;
    triggerEvent<K extends keyof IPostItemEvents>(name: K, detail: IPostItemEvents[K]): void;
  }

  interface UserCard {
    properties: IUserCardProps;
    triggerEvent<K extends keyof IUserCardEvents>(name: K, detail: IUserCardEvents[K]): void;
  }

  interface ImageUploader {
    properties: IImageUploaderProps;
    triggerEvent<K extends keyof IImageUploaderEvents>(name: K, detail: IImageUploaderEvents[K]): void;
  }

  interface Loading {
    properties: ILoadingProps;
  }

  interface Error {
    properties: IErrorProps;
  }

  interface CommentItem {
    properties: ICommentItemProps;
    triggerEvent<K extends keyof ICommentItemEvents>(name: K, detail: ICommentItemEvents[K]): void;
  }

  interface Empty {
    properties: IEmptyProps;
  }
} 