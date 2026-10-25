import { getCurrentUser } from "@/features/auth/session";
import type { PluginRecord } from "@/features/catalog/types";
import {
  getPluginSocialCounts,
  getUserFollowStats,
  getUserSocialState,
} from "@/features/social/queries";

import { FavoriteButton, LikeButton } from "./like-favorite-buttons";
import { FollowButton } from "./follow-button";

/**
 * 详情页社交互动区(服务端读取,读取会话,必须在 <Suspense> 边界内使用)。
 * 计数与个人状态在边界内逐请求获取:计数走带 social-stats 标签的缓存查询,
 * 个人点赞/收藏状态不缓存。
 */

/** 点赞/收藏互动行:放在详情页下载按钮上方 */
export async function PluginLikeFavoritePanel({
  pluginId,
  loginPath,
  nextPath,
}: {
  pluginId: string;
  loginPath: string;
  nextPath: string;
}) {
  const user = await getCurrentUser();
  const [counts, socialState] = await Promise.all([
    getPluginSocialCounts([pluginId]),
    user ? getUserSocialState(user.id, [pluginId]) : Promise.resolve(null),
  ]);
  const count = counts[pluginId] ?? { likes: 0, favorites: 0 };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LikeButton
        pluginId={pluginId}
        count={count.likes}
        liked={socialState?.likedIds.has(pluginId) ?? false}
        loggedIn={Boolean(user)}
        loginPath={loginPath}
        nextPath={nextPath}
      />
      <FavoriteButton
        pluginId={pluginId}
        count={count.favorites}
        favorited={socialState?.favoritedIds.has(pluginId) ?? false}
        loggedIn={Boolean(user)}
        loginPath={loginPath}
        nextPath={nextPath}
      />
    </div>
  );
}

/**
 * 详情页作者行旁的关注入口。
 * 仅 site 来源且有 owner 用户名的插件展示;作者本人显示"这是你的插件"。
 */
export async function PluginFollowArea({
  plugin,
  loginPath,
  nextPath,
}: {
  plugin: PluginRecord;
  loginPath: string;
  nextPath: string;
}) {
  const ownerUsername =
    plugin.source === "site" ? plugin.owner?.username : undefined;
  if (!ownerUsername) return null;

  const user = await getCurrentUser();
  if (!user) {
    return (
      <FollowButton
        username={ownerUsername}
        following={false}
        loggedIn={false}
        loginPath={loginPath}
        nextPath={nextPath}
      />
    );
  }

  const stats = await getUserFollowStats(ownerUsername, user.id);
  if (!stats) return null;
  if (stats.isSelf) {
    return (
      <span className="text-xs text-muted-foreground">这是你的插件</span>
    );
  }

  return (
    <FollowButton
      username={ownerUsername}
      following={stats.isFollowing}
      loggedIn
      loginPath={loginPath}
      nextPath={nextPath}
    />
  );
}

/** Suspense 回退:两枚胶囊占位,避免互动区出现前后布局跳动 */
export function SocialActionsSkeleton() {
  return (
    <div aria-hidden className="flex gap-2">
      <div className="h-10 w-24 animate-pulse rounded-full bg-muted/60" />
      <div className="h-10 w-24 animate-pulse rounded-full bg-muted/60" />
    </div>
  );
}
