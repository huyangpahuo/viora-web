import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComment,
  faComments,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";

import { getServerThreads } from "@/features/community/queries";
import type { ThreadView } from "@/features/community/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/relative-time";

export const metadata: Metadata = {
  title: "社区讨论",
  description: "Viora 社区的公共讨论区:交流风格插件的使用心得,提问与分享。",
};

/**
 * 社区讨论列表(匿名可读)。读取与相对时间都逐请求渲染,
 * 包在 <Suspense> 内由骨架屏兜底。
 */
export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          社区讨论
        </h1>
        <Button asChild size="sm">
          <Link href="/community/new">
            <FontAwesomeIcon icon={faPenToSquare} className="size-4" aria-hidden />
            发帖
          </Link>
        </Button>
      </header>

      <Suspense fallback={<ThreadListSkeleton />}>
        <ThreadList />
      </Suspense>
    </div>
  );
}

/** 列表读取:相对时间依赖当前时刻(Date.now),connection() 跳过预渲染通道 */
async function ThreadList() {
  await connection();

  const threads = await getServerThreads();

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border bg-card/40 px-6 py-16 text-center">
        <FontAwesomeIcon
          icon={faComments}
          className="mx-auto size-8 text-muted-foreground/60"
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted-foreground">
          还没有讨论,来开个头
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/community/new">发布第一条讨论</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {threads.map((thread) => (
        <li key={thread.id}>
          <ThreadCard thread={thread} />
        </li>
      ))}
    </ul>
  );
}

function ThreadCard({ thread }: { thread: ThreadView }) {
  const name = thread.author.displayName || thread.author.username || "未知用户";
  const lastActiveAt = thread.lastReplyAt ?? thread.createdAt;

  return (
    <Link
      href={`/community/${thread.id}`}
      className="block space-y-2.5 rounded-2xl border bg-card p-5 transition-colors outline-none hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <h2 className="font-semibold leading-snug tracking-tight">
        {thread.title}
      </h2>
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {excerpt(thread.body)}
      </p>
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <AuthorAvatar name={name} avatarUrl={thread.author.avatarUrl} />
          {name}
        </span>
        <span aria-hidden>·</span>
        <time dateTime={lastActiveAt} suppressHydrationWarning>
          最后活跃 {formatRelativeTime(lastActiveAt)}
        </time>
        <span className="ml-auto inline-flex items-center gap-1">
          <FontAwesomeIcon icon={faComment} className="size-3.5" aria-hidden />
          {thread.replyCount} 回复
        </span>
      </footer>
    </Link>
  );
}

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // 头像来自用户自填或 GitHub,域名不可枚举,使用原生 img
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="size-5 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px]"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** 正文纯文本摘要:压平空白后截取约 100 字,不渲染任何 HTML */
function excerpt(body: string, max = 100): string {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function ThreadListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="讨论加载中">
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-3 rounded-2xl border bg-card p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
