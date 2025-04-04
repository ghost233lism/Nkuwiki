/// <reference path="./post.d.ts" />

/**
 * 帖子列表组件的属性
 * @interface IPostListProps
 */
interface IPostListProps {
  /** 帖子数据数组 */
  posts: IPost[];
  /** 是否正在加载 */
  loading: boolean;
  /** 是否出现错误 */
  error: boolean;
  /** 错误信息 */
  errorMsg?: string;
  /** 是否有更多数据 */
  hasMore: boolean;
  /** 是否为空状态 */
  empty?: boolean;
  /** 空状态文本 */
  emptyText?: string;
  /** 空状态按钮文本 */
  emptyBtnText?: string;
  /** 是否显示空状态按钮 */
  showEmptyBtn?: boolean;
  /** 当前用户OpenID */
  currentOpenid?: string;
}

/**
 * 帖子列表组件事件
 * @interface IPostListEvents
 */
interface IPostListEvents {
  /** 点击帖子事件 */
  posttap: (e: { id: string }) => void;
  /** 加载更多事件 */
  loadmore: () => void;
  /** 点击空状态按钮事件 */
  emptybtn: () => void;
  /** 点赞事件 */
  like: (e: { id: string, index: number }) => void;
  /** 收藏事件 */
  favorite: (e: { id: string, index: number }) => void;
  /** 评论事件 */
  comment: (e: { id: string, index: number }) => void;
  /** 关注事件 */
  follow: (e: { userId: string, index: number }) => void;
  /** 点击用户事件 */
  usertap: (e: { userId: string, index: number }) => void;
  /** 重试事件 */
  retry: () => void;
}

// 微信小程序事件类型
interface TouchEvent {
  type: string;
  target: {
    id: string;
    dataset: any;
  };
  currentTarget: {
    id: string;
    dataset: any;
  };
  timeStamp: number;
  detail: {
    x: number;
    y: number;
  };
  touches: Array<{
    identifier: number;
    pageX: number;
    pageY: number;
    clientX: number;
    clientY: number;
  }>;
  changedTouches: Array<{
    identifier: number;
    pageX: number;
    pageY: number;
    clientX: number;
    clientY: number;
  }>;
}

/**
 * 帖子列表组件
 * @interface IPostListComponent
 */
interface IPostListComponent {
  /** 组件属性 */
  properties: IPostListProps;
  /** 组件方法 */
  methods: {
    /** 处理帖子点击 */
    handlePostTap: (e: TouchEvent) => void;
    /** 加载更多 */
    loadMore: () => void;
    /** 处理空状态按钮点击 */
    handleEmptyBtnTap: () => void;
    /** 处理点赞 */
    handleLike: (e: TouchEvent) => void;
    /** 处理收藏 */
    handleFavorite: (e: TouchEvent) => void;
    /** 处理评论 */
    handleComment: (e: TouchEvent) => void;
    /** 处理关注 */
    handleFollow: (e: TouchEvent) => void;
    /** 处理用户点击 */
    handleUserTap: (e: TouchEvent) => void;
    /** 处理重试 */
    handleRetry: () => void;
    /** 阻止事件冒泡 */
    stopPropagation: () => void;
  };
}

export {
  IPostListProps,
  IPostListEvents,
  IPostListComponent,
  TouchEvent
}; 