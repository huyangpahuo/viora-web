/** 评论区的视图模型:服务端组装好树结构后传给客户端组件渲染 */
export type CommentAuthor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type CommentView = {
  id: string;
  /** 评论作者的用户 ID,用于判断是否显示"删除"按钮 */
  userId: string;
  body: string;
  /** ISO 时间字符串,展示时转相对时间 */
  createdAt: string;
  author: CommentAuthor;
  /** 一级回复(最多两层;更深层级或父评论缺失时归并到一级) */
  replies: CommentView[];
};
