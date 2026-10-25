"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReply } from "@fortawesome/free-solid-svg-icons";

import type { CommentView } from "@/features/comments/types";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

import { CommentForm } from "./comment-form";
import { DeleteCommentButton } from "./delete-comment-button";

/**
 * 评论列表与发表入口(客户端):负责回复框开合、删除按钮等交互。
 * 数据由服务端组件 CommentSection 组装后传入。
 */
export function CommentsView({
  pluginId,
  comments,
  viewerUserId,
  loginPath,
}: {
  pluginId: string;
  comments: CommentView[];
  viewerUserId: string | null;
  loginPath: string;
}) {
  // 当前展开内联回复框的一级评论 id;null 表示没有展开
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const total = comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0);

  return (
    <section className="space-y-5" aria-label="评论区">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">评论 ({total})</h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">还没有评论,来说点什么吧</p>
      ) : (
        <ul className="space-y-6">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                pluginId={pluginId}
                viewerUserId={viewerUserId}
                replyTo={replyTo}
                onReplyToChange={setReplyTo}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t pt-4">
        {viewerUserId ? (
          <CommentForm pluginId={pluginId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link
              href={loginPath}
              className="rounded font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              登录后即可评论
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  pluginId,
  viewerUserId,
  replyTo,
  onReplyToChange,
  isReply = false,
}: {
  comment: CommentView;
  pluginId: string;
  viewerUserId: string | null;
  replyTo: string | null;
  onReplyToChange: (id: string | null) => void;
  isReply?: boolean;
}) {
  const name = comment.author.displayName || comment.author.username || "未知用户";
  const isOwn = viewerUserId !== null && comment.userId === viewerUserId;
  const isReplyTarget = replyTo === comment.id;

  return (
    <div className={cn("space-y-3", isReply && "border-l pl-4")}>
      <div className="flex items-start gap-3">
        <CommentAvatar name={name} avatarUrl={comment.author.avatarUrl} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {comment.author.username ? (
              <Link
                href={`/users/${encodeURIComponent(comment.author.username)}`}
                className="rounded text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {name}
              </Link>
            ) : (
              <span className="text-sm font-medium">{name}</span>
            )}
            <time
              dateTime={comment.createdAt}
              suppressHydrationWarning
              className="text-xs text-muted-foreground"
            >
              {formatRelativeTime(comment.createdAt)}
            </time>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
            {comment.body}
          </p>
          <div className="flex items-center gap-3">
            {viewerUserId ? (
              <button
                type="button"
                onClick={() => onReplyToChange(isReplyTarget ? null : comment.id)}
                aria-expanded={isReplyTarget}
                className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <FontAwesomeIcon icon={faReply} className="size-3" aria-hidden />
                回复
              </button>
            ) : null}
            {isOwn ? <DeleteCommentButton commentId={comment.id} /> : null}
          </div>
        </div>
      </div>

      {isReplyTarget ? (
        <div className="pl-8 sm:pl-11">
          <CommentForm
            pluginId={pluginId}
            parentId={comment.id}
            replyToName={name}
            autoFocus
            onDone={() => onReplyToChange(null)}
            onCancel={() => onReplyToChange(null)}
          />
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="space-y-4 pl-8 sm:pl-11">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              pluginId={pluginId}
              viewerUserId={viewerUserId}
              replyTo={replyTo}
              onReplyToChange={onReplyToChange}
              isReply
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommentAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="size-7 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
