/// <reference path="./wx.d.ts" />

/**
 * 评论数据接口
 * @interface IComment
 */
interface IComment {
  /** 评论ID */
  id: string;
  /** 评论内容 */
  content: string;
  /** 图片列表 */
  image?: string[];
  /** 评论时间 */
  createTime: string;
  /** 相对时间 */
  relativeTime?: string;
  /** 用户ID */
  openid: string;
  /** 用户昵称 */
  nickname: string;
  /** 用户头像 */
  avatar: string;
  /** 点赞数量 */
  like_count?: number;
  /** 当前用户是否点赞 */
  isLiked?: boolean;
  /** 回复数量 */
  reply_count?: number;
  /** 回复预览 */
  reply_preview?: IReply[];
}

/**
 * 回复数据接口
 * @interface IReply
 */
interface IReply {
  /** 回复ID */
  id: string;
  /** 回复内容 */
  content: string;
  /** 回复时间 */
  createTime: string;
  /** 相对时间 */
  relativeTime?: string;
  /** 用户ID */
  openid: string;
  /** 用户昵称 */
  nickname: string;
  /** 用户头像 */
  avatar: string;
  /** 目标评论ID */
  commentId: string;
  /** 被回复用户ID */
  replyToOpenid?: string;
  /** An optional image for the reply */
  image?: string[];
}

/**
 * 评论列表组件属性
 * @interface ICommentListProps
 */
interface ICommentListProps {
  /** 评论数据数组 */
  comments: IComment[];
  /** 评论总数 */
  total: number;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否加载出错 */
  error: boolean;
  /** 错误信息 */
  errorMsg: string;
  /** 是否有更多评论 */
  hasMore: boolean;
  /** 当前用户ID */
  currentOpenid: string;
  /** 是否允许回复 */
  allowReply: boolean;
}

/**
 * 评论列表组件事件
 * @interface ICommentListEvents
 */
interface ICommentListEvents {
  /** 加载更多事件 */
  loadmore: () => void;
  /** 点赞评论事件 */
  like: (e: { id: string, index: number }) => void;
  /** 回复评论事件 */
  reply: (e: { id: string, index: number }) => void;
  /** 查看更多回复事件 */
  viewreplies: (e: { commentId: string }) => void;
  /** 点击用户事件 */
  usertap: (e: { userId: string }) => void;
  /** 删除评论事件 */
  delete: (e: { id: string, index: number }) => void;
  /** 重试事件 */
  retry: () => void;
}

/**
 * 评论列表组件
 * @interface ICommentListComponent
 */
interface ICommentListComponent {
  /** 组件属性 */
  properties: ICommentListProps;
  /** 组件方法 */
  methods: {
    /** 加载更多 */
    loadMore: () => void;
    /** 点赞评论 */
    handleLike: (e: TouchEvent) => void;
    /** 回复评论 */
    handleReply: (e: TouchEvent) => void;
    /** 查看更多回复 */
    viewMoreReplies: (e: TouchEvent) => void;
    /** 跳转到用户主页 */
    goToUserProfile: (e: TouchEvent) => void;
    /** 预览评论图片 */
    previewCommentImage: (e: TouchEvent) => void;
    /** 重试加载 */
    retry: () => void;
    /** 图片加载出错处理 */
    handleImageError: (e: TouchEvent) => void;
    /** 删除评论 */
    deleteComment: (e: TouchEvent) => void;
    /** 阻止冒泡 */
    stopPropagation: () => void;
  };
} 