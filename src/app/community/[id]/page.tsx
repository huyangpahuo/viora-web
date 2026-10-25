import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faComment,
} from "@fortawesome/free-solid-svg-icons";

import { DeleteThreadButton } from "@/components/community/delete-thread-button";
import { RepliesView } from "@/components/community/replies-view";
import { getCurrentUser } from "@/features/auth/session";
import { getThreadById, getThreadReplies } from "@/features/community/queries";
import type { ThreadView } from "@/features/community/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/relative-time";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThreadById(id);
  if (!thread) return { title: "讨论未找到" };

  return {
    title: `讨论:${thread.title}`,
    description: excerpt(thread.body),
  };
}

/**
 * 讨论帖详情。匿名可读,读取走 anon client(不碰 cookie);
 * 相对时间与回复区(含会话)逐请求渲染。
 */
export default async function ThreadPage({ params }: { params: Params }) {
  // 逐请求渲染:相对时间依赖当前时刻,数据库读取保持最新
  await connection();

  // params 在 Suspense 之外解析以支持真正的 404 状态
  const { id } = await params;
  const thread = await getThreadById(id);

  if (!thread) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 rounded"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-4" aria-hidden />
        返回社区
      </Link>

      <article className="space-y-4">
        <div className="space-y-3">
          <h1 className="font-heading text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            {thread.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <AuthorAvatar
                name={displayNameOf(thread)}
                avatarUrl={thread.author.avatarUrl}
              />
              {thread.author.username ? (
                <Link
                  href={`/users/${encodeURIComponent(thread.author.username)}`}
                  className="rounded font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {displayNameOf(thread)}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {displayNameOf(thread)}
                </span>
              )}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={thread.createdAt} suppressHydrationWarning>
              {formatRelativeTime(thread.createdAt)}
            </time>
            <span className="inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faComment} className="size-3.5" aria-hidden />
              {thread.replyCount} 回复
            </span>
            {/* 作者操作:读取会话,独立 Suspense 流式输出 */}
            <Suspense fallback={null}>
              <ThreadOwnerActions threadId={thread.id} authorId={thread.authorId} />
            </Suspense>
          </div>
        </div>

        {/* 纯文本正文,保留换行 */}
        <div className="whitespace-pre-wrap break-words rounded-2xl border bg-card p-5 text-sm leading-relaxed text-foreground/90 sm:p-6">
          {thread.body}
        </div>
      </article>

      {/* 回复区:读取会话与数据库,包在 Suspense 内(cacheComponents 约束) */}
      <Suspense fallback={<RepliesSkeleton />}>
        <ThreadReplies threadId={thread.id} />
      </Suspense>
    </div>
  );
}

/** 回复列表 + 回复输入;viewerUserId 决定删除按钮与登录引导 */
async function ThreadReplies({ threadId }: { threadId: string }) {
  const [user, replies] = await Promise.all([
    getCurrentUser(),
    getThreadReplies(threadId),
  ]);

  return (
    <RepliesView
      threadId={threadId}
      replies={replies}
      viewerUserId={user?.id ?? null}
      loginPath={`/login?next=${encodeURIComponent(`/community/${threadId}`)}`}
    />
  );
}

/** 仅讨论作者可见的删除入口 */
async function ThreadOwnerActions({
  threadId,
  authorId,
}: {
  threadId: string;
  authorId: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.id !== authorId) return null;

  return <DeleteThreadButton threadId={threadId} />;
}

function displayNameOf(thread: ThreadView): string {
  return thread.author.displayName || thread.author.username || "未知用户";
}

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
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

/** 正文纯文本摘要:压平空白后截取约 100 字,不渲染任何 HTML */
function excerpt(body: string, max = 100): string {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function RepliesSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-label="回复加载中">
      <Skeleton className="h-6 w-24" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
    </section>
  );
}

// 阻塞渲染的动态详情页:放弃 instant 导航以支持真正的 404 状态
export const instant = false;
