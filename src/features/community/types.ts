/**
 * 社区讨论的视图模型:服务端组装好后交给页面/客户端组件渲染。
 */

export type ThreadAuthor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ThreadView = {
  id: string;
  /** 作者用户 ID,用于判断是否显示"删除讨论"按钮 */
  authorId: string;
  title: string;
  body: string;
  /** ISO 时间字符串,展示时转相对时间 */
  createdAt: string;
  /** 未删除回复数 */
  replyCount: number;
  /** 最近一条回复时间;没有回复时为 null(展示回退到 createdAt) */
  lastReplyAt: string | null;
  author: ThreadAuthor;
};

export type ThreadReplyView = {
  id: string;
  threadId: string;
  /** 回复作者的用户 ID,用于判断是否显示"删除"按钮 */
  authorId: string;
  body: string;
  createdAt: string;
  author: ThreadAuthor;
};
