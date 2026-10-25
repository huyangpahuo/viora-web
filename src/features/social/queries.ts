import { cacheLife, cacheTag } from "next/cache";

import { createAnonClient } from "@/lib/supabase/anon";

/**
 * 点赞/收藏/关注的公开读取,全部走匿名客户端(不碰 cookie):
 * - 计数类(getPluginSocialCounts)带 "use cache" + social-stats 标签,
 *   交互后由 actions 里的 updateTag("social-stats") 立即失效;
 * - 个人状态与关注关系(取决于 userId)逐请求读取,不缓存。
 *
 * Supabase 未配置或查询失败时返回空结果,页面正常降级,不虚构数字。
 */

export type PluginSocialCount = { likes: number; favorites: number };

/** 一批插件的点赞/收藏计数,键为 pluginId;缺失的插件计数视为 0 */
export type PluginSocialCounts = Record<string, PluginSocialCount>;

export async function getPluginSocialCounts(
  pluginIds: string[],
): Promise<PluginSocialCounts> {
  "use cache";
  cacheTag("social-stats");
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  const uniqueIds = [...new Set(pluginIds)].filter(Boolean);
  if (uniqueIds.length === 0) return {};

  // 缓存函数内禁止读 cookies(),公开计数用匿名客户端(RLS 允许所有人读)
  const supabase = createAnonClient();
  if (!supabase) return {};

  const [likesResult, favoritesResult] = await Promise.all([
    supabase.from("plugin_likes").select("plugin_id").in("plugin_id", uniqueIds),
    supabase
      .from("plugin_favorites")
      .select("plugin_id")
      .in("plugin_id", uniqueIds),
  ]);

  if (likesResult.error) {
    console.error("[social] 读取点赞计数失败:", likesResult.error.message);
  }
  if (favoritesResult.error) {
    console.error("[social] 读取收藏计数失败:", favoritesResult.error.message);
  }

  const counts: PluginSocialCounts = {};
  for (const pluginId of uniqueIds) {
    counts[pluginId] = { likes: 0, favorites: 0 };
  }
  for (const row of likesResult.data ?? []) {
    const entry = counts[row.plugin_id];
    if (entry) entry.likes += 1;
  }
  for (const row of favoritesResult.data ?? []) {
    const entry = counts[row.plugin_id];
    if (entry) entry.favorites += 1;
  }
  return counts;
}

export type UserSocialState = {
  likedIds: Set<string>;
  favoritedIds: Set<string>;
};

/** 该登录用户对一批插件是否已点赞/已收藏(个人数据,逐请求读取) */
export async function getUserSocialState(
  userId: string,
  pluginIds: string[],
): Promise<UserSocialState> {
  const emptyState: UserSocialState = {
    likedIds: new Set<string>(),
    favoritedIds: new Set<string>(),
  };

  const uniqueIds = [...new Set(pluginIds)].filter(Boolean);
  if (uniqueIds.length === 0) return emptyState;

  const supabase = createAnonClient();
  if (!supabase) return emptyState;

  const [likesResult, favoritesResult] = await Promise.all([
    supabase
      .from("plugin_likes")
      .select("plugin_id")
      .eq("user_id", userId)
      .in("plugin_id", uniqueIds),
    supabase
      .from("plugin_favorites")
      .select("plugin_id")
      .eq("user_id", userId)
      .in("plugin_id", uniqueIds),
  ]);

  if (likesResult.error) {
    console.error("[social] 读取点赞状态失败:", likesResult.error.message);
  }
  if (favoritesResult.error) {
    console.error("[social] 读取收藏状态失败:", favoritesResult.error.message);
  }

  return {
    likedIds: new Set((likesResult.data ?? []).map((row) => row.plugin_id)),
    favoritedIds: new Set(
      (favoritesResult.data ?? []).map((row) => row.plugin_id),
    ),
  };
}

export type UserFollowStats = {
  /** 粉丝数(关注该作者的人数) */
  followers: number;
  /** 该作者关注的人数 */
  following: number;
  /** 当前登录用户是否已关注该作者;未登录时恒为 false */
  isFollowing: boolean;
  /** 该作者是否就是当前登录用户本人 */
  isSelf: boolean;
};

/**
 * 作者的关注统计。viewerId 缺省时只返回公开计数;
 * 查不到作者(username 不存在)返回 null。
 */
export async function getUserFollowStats(
  username: string,
  viewerId?: string,
): Promise<UserFollowStats | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;

  const supabase = createAnonClient();
  if (!supabase) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", trimmed)
    .maybeSingle();
  if (profileError) {
    console.error("[social] 读取作者资料失败:", profileError.message);
    return null;
  }
  if (!profile) return null;

  const [followersResult, followingResult, viewerEdgeResult] =
    await Promise.all([
      supabase
        .from("user_follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("followed_id", profile.id),
      supabase
        .from("user_follows")
        .select("followed_id", { count: "exact", head: true })
        .eq("follower_id", profile.id),
      viewerId
        ? supabase
            .from("user_follows")
            .select("follower_id")
            .eq("follower_id", viewerId)
            .eq("followed_id", profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (followersResult.error) {
    console.error("[social] 读取粉丝数失败:", followersResult.error.message);
  }
  if (followingResult.error) {
    console.error("[social] 读取关注数失败:", followingResult.error.message);
  }

  return {
    followers: followersResult.count ?? 0,
    following: followingResult.count ?? 0,
    isFollowing: Boolean(viewerEdgeResult.data),
    isSelf: viewerId ? profile.id === viewerId : false,
  };
}

export type FollowedAuthor = {
  username: string;
  displayName: string | null;
};

/**
 * 该登录用户关注的作者列表(username + 显示名)。
 * 首页"关注"Tab 过滤用:site 插件按 username 匹配,
 * registry 插件按 username/displayName 与 author 字符串匹配。
 */
export async function getFollowedAuthors(
  userId: string,
): Promise<FollowedAuthor[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];

  const { data: follows, error } = await supabase
    .from("user_follows")
    .select("followed_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[social] 读取关注列表失败:", error.message);
    return [];
  }

  const followedIds = [...new Set((follows ?? []).map((row) => row.followed_id))];
  if (followedIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("username, display_name")
    .in("id", followedIds);
  if (profilesError) {
    console.error("[social] 读取关注作者资料失败:", profilesError.message);
    return [];
  }

  return (profiles ?? []).map((profile) => ({
    username: profile.username,
    displayName: profile.display_name,
  }));
}

export type FavoriteEntry = {
  pluginId: string;
  /** 收藏时间(ISO),用于按收藏先后倒序展示 */
  createdAt: string;
};

/** 该用户收藏的插件列表,按收藏时间倒序 */
export async function getFavoritePlugins(
  userId: string,
): Promise<FavoriteEntry[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("plugin_favorites")
    .select("plugin_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[social] 读取收藏列表失败:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    pluginId: row.plugin_id,
    createdAt: row.created_at,
  }));
}
