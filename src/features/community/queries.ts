import "server-only";

import type { CommunityThreadRow } from "@/features/community/database-types";
import type { ThreadAuthor, ThreadReplyView, ThreadView } from "@/features/community/types";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * 社区讨论的读取查询。
 *
 * 读取策略:逐请求读取(不加 "use cache")——社区数据量小、更新频繁,
 * 每请求直读最简单;公开数据走 createAnonClient(),不依赖请求 cookie,
 * RLS 策略保证只读到未删除的行。
 */

const FALLBACK_AUTHOR: ThreadAuthor = { username: "", displayName: null, avatarUrl: null };

/** 批量取作者资料(头像/用户名),缺失时回退为匿名占位 */
async function loadAuthors(
  supabase: NonNullable<ReturnType<typeof createAnonClient>>,
  userIds: string[],
): Promise<Map<string, ThreadAuthor>> {
  const map = new Map<string, ThreadAuthor>();
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return map;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, github_avatar_url")
    .in("id", uniqueIds);
  if (error) {
    console.error("[community] 读取作者资料失败:", error.message);
    return map;
  }

  for (const profile of profiles ?? []) {
    map.set(profile.id, {
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url ?? profile.github_avatar_url,
    });
  }
  return map;
}

/**
 * 统计一批讨论的回复数与最后回复时间(一次查询,客户端聚合)。
 * 没有回复的讨论不产生条目。
 */
async function loadReplyStats(
  supabase: NonNullable<ReturnType<typeof createAnonClient>>,
  threadIds: string[],
): Promise<Map<string, { count: number; lastReplyAt: string | null }>> {
  const stats = new Map<string, { count: number; lastReplyAt: string | null }>();
  if (threadIds.length === 0) return stats;

  const { data: rows, error } = await supabase
    .from("community_replies")
    .select("thread_id, created_at")
    .in("thread_id", threadIds)
    .is("deleted_at", null);
  if (error) {
    console.error("[community] 统计回复失败:", error.message);
    return stats;
  }

  for (const row of rows ?? []) {
    const entry = stats.get(row.thread_id) ?? { count: 0, lastReplyAt: null };
    entry.count += 1;
    if (!entry.lastReplyAt || row.created_at > entry.lastReplyAt) {
      entry.lastReplyAt = row.created_at;
    }
    stats.set(row.thread_id, entry);
  }
  return stats;
}

/** 组装讨论视图(含作者与回复统计) */
async function toThreadViews(
  supabase: NonNullable<ReturnType<typeof createAnonClient>>,
  rows: CommunityThreadRow[],
): Promise<ThreadView[]> {
  const [authors, replyStats] = await Promise.all([
    loadAuthors(supabase, rows.map((row) => row.author_id)),
    loadReplyStats(supabase, rows.map((row) => row.id)),
  ]);

  return rows.map((row) => {
    const stats = replyStats.get(row.id);
    return {
      id: row.id,
      authorId: row.author_id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      replyCount: stats?.count ?? 0,
      lastReplyAt: stats?.lastReplyAt ?? null,
      author: authors.get(row.author_id) ?? FALLBACK_AUTHOR,
    };
  });
}

/** 社区讨论列表:最近 50 条,按最后活跃(最后回复时间,兜底发帖时间)倒序 */
export async function getServerThreads(): Promise<ThreadView[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("community_threads")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[community] 读取讨论列表失败:", error.message);
    return [];
  }

  const threads = await toThreadViews(supabase, rows ?? []);
  return threads.sort((a, b) => {
    const ta = a.lastReplyAt ?? a.createdAt;
    const tb = b.lastReplyAt ?? b.createdAt;
    return tb.localeCompare(ta);
  });
}

/** 单条讨论(含作者与回复数);不存在或已删除时返回 null */
export async function getThreadById(id: string): Promise<ThreadView | null> {
  const supabase = createAnonClient();
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("community_threads")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[community] 读取讨论失败:", error.message);
    return null;
  }
  if (!row) return null;

  const [view] = await toThreadViews(supabase, [row]);
  return view ?? null;
}

/** 讨论的回复列表:按发布时间正序,过滤已删除 */
export async function getThreadReplies(threadId: string): Promise<ThreadReplyView[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("community_replies")
    .select("*")
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[community] 读取回复失败:", error.message);
    return [];
  }

  const replies = rows ?? [];
  const authors = await loadAuthors(supabase, replies.map((reply) => reply.author_id));

  return replies.map((reply) => ({
    id: reply.id,
    threadId: reply.thread_id,
    authorId: reply.author_id,
    body: reply.body,
    createdAt: reply.created_at,
    author: authors.get(reply.author_id) ?? FALLBACK_AUTHOR,
  }));
}
