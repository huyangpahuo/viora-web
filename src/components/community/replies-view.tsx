"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments } from "@fortawesome/free-solid-svg-icons";

import type { ThreadReplyView } from "@/features/community/types";
import { formatRelativeTime } from "@/lib/relative-time";

import { DeleteReplyButton } from "./delete-reply-button";
import { ReplyForm } from "./reply-form";

/**
 * 讨论回复列表与回复输入(客户端)。社区回复只有一层,无嵌套。
 * 数据由服务端组件组装后传入;未登录时显示登录引导。
 */
export function RepliesView({
  threadId,
  replies,
  viewerUserId,
  loginPath,
}: {
  threadId: string;
  replies: ThreadReplyView[];
  viewerUserId: string | null;
  loginPath: string;
}) {
  return (
    <section className="space-y-5" aria-label="回复区">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">回复 ({replies.length})</h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      {replies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <FontAwesomeIcon icon={faComments} className="mr-1.5 size-4" aria-hidden />
          还没有回复,来说点什么吧
        </p>
      ) : (
        <ul className="space-y-5">
          {replies.map((reply) => (
            <li key={reply.id}>
              <ReplyItem reply={reply} viewerUserId={viewerUserId} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t pt-4">
        {viewerUserId ? (
          <ReplyForm threadId={threadId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link
              href={loginPath}
              className="rounded font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              登录后即可回复
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

function ReplyItem({
  reply,
  viewerUserId,
}: {
  reply: ThreadReplyView;
  viewerUserId: string | null;
}) {
  const name = reply.author.displayName || reply.author.username || "未知用户";
  const isOwn = viewerUserId !== null && reply.authorId === viewerUserId;

  return (
    <div className="flex items-start gap-3">
      <ReplyAvatar name={name} avatarUrl={reply.author.avatarUrl} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {reply.author.username ? (
            <Link
              href={`/users/${encodeURIComponent(reply.author.username)}`}
              className="rounded text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {name}
            </Link>
          ) : (
            <span className="text-sm font-medium">{name}</span>
          )}
          <time
            dateTime={reply.createdAt}
            suppressHydrationWarning
            className="text-xs text-muted-foreground"
          >
            {formatRelativeTime(reply.createdAt)}
          </time>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {reply.body}
        </p>
        {isOwn ? (
          <div className="flex items-center gap-3">
            <DeleteReplyButton replyId={reply.id} threadId={reply.threadId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReplyAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // 头像来自用户自填或 GitHub,域名不可枚举,使用原生 img
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
