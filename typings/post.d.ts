/// <reference path="./wx.d.ts" />

// 帖子数据接口
interface IPost {
  id: string;
  title: string;
  content: string;
  images: string[];
  isPublic: boolean;
  allowComment: boolean;
  wikiKnowledge: boolean;
  createTime: string;
  updateTime: string;
  author: {
    id: string;
    nickname: string;
    avatar: string;
  };
  stats: {
    likeCount: number;
    commentCount: number;
    favoriteCount: number;
  };
}

// 帖子页面数据接口
interface IPostPageData {
  post: IPost | null;
  loading: boolean;
  errorMsg: string;
  canSubmit: boolean;
}

// 帖子行为接口
interface IPostBehavior {
  data: IPostPageData;
  onTitleInput(e: WechatMiniprogram.Input): void;
  onContentInput(e: WechatMiniprogram.Input): void;
  onSelectImage(e: WechatMiniprogram.CustomEvent): void;
  onDeleteImage(e: WechatMiniprogram.CustomEvent): void;
  toggleIsPublic(e: WechatMiniprogram.Switch): void;
  toggleAllowComment(e: WechatMiniprogram.Switch): void;
  toggleWikiKnowledge(e: WechatMiniprogram.Switch): void;
  checkSubmitState(): boolean;
  showError(msg: string): void;
} 