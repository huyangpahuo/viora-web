import { connection } from "next/server";

import { getCurrentUser } from "@/features/auth/session";
import type { PluginCommentRow } from "@/features/catalog/database-types";
import type { CommentView } from "@/features/comments/types";
import { createClient } from "@/lib/supabase/server";

import { CommentsView } from "./comments-view";

/**
 * 评论区(服务端组件):拉取评论与作者资料,组装成两层树后
 * 交给客户端组件渲染。本组件读取会话与数据库,必须在 <Suspense> 内使用。
 *
 * Supabase 未配置时评论区整体隐藏(站点退化为纯公开画廊)。
 */
export async function CommentSection({
  pluginId,
  loginPath,
}: {
  pluginId: string;
  loginPath: string;
}) {
  // 相对时间依赖当前时刻(Date.now),必须逐请求渲染;
  // connection() 跳过预渲染通道,避免被判定为不稳定值
  await connection();

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: rows, error } = await supabase
    .from("plugin_comments")
    .select("*")
    .eq("plugin_id", pluginId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[comments] 读取评论失败:", error.message);
    return null;
  }

  const comments = rows ?? [];
  const authorMap = await loadCommentAuthors(supabase, comments);
  const user = await getCurrentUser();

  return (
    <CommentsView
      pluginId={pluginId}
      comments={buildCommentTree(comments, authorMap)}
      viewerUserId={user?.id ?? null}
      loginPath={loginPath}
    />
  );
}

type CommentAuthorMap = Map<
  string,
  { username: string; displayName: string | null; avatarUrl: string | null }
>;

/** 批量取评论作者资料(头像/用户名),缺失时回退为匿名占位 */
async function loadCommentAuthors(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  comments: PluginCommentRow[],
): Promise<CommentAuthorMap> {
  const map: CommentAuthorMap = new Map();
  const userIds = [...new Set(comments.map((comment) => comment.user_id))];
  if (userIds.length === 0) return map;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, github_avatar_url")
    .in("id", userIds);
  if (error) {
    console.error("[comments] 读取评论作者资料失败:", error.message);
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
 * 组装两层结构:一级评论 + 内嵌回复。
 * 父评论缺失(已删除)时提升为一级;出现三层嵌套时归并到祖父,
 * 保证渲染深度最多两层,内容不丢失。
 */
function buildCommentTree(
  rows: PluginCommentRow[],
  authors: CommentAuthorMap,
): CommentView[] {
  const fallbackAuthor = { username: "", displayName: null, avatarUrl: null };

  const parentIdOf = new Map<string, string | null>();
  const byId = new Map<string, CommentView>();
  for (const row of rows) {
    parentIdOf.set(row.id, row.parent_id);
    byId.set(row.id, {
      id: row.id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      author: authors.get(row.user_id) ?? fallbackAuthor,
      replies: [],
    });
  }

  const roots: CommentView[] = [];
  for (const row of rows) {
    const view = byId.get(row.id);
    if (!view) continue;

    if (!row.parent_id) {
      roots.push(view);
      continue;
    }

    let target = byId.get(row.parent_id) ?? null;
    if (target) {
      // 父评论本身是回复:挂到祖父评论下,保持最多两层
      const grandparentId = parentIdOf.get(target.id) ?? null;
      if (grandparentId) {
        target = byId.get(grandparentId) ?? target;
      }
      target.replies.push(view);
    } else {
      // 父评论已被软删除:提升为一级评论
      roots.push(view);
    }
  }

  return roots;
}
