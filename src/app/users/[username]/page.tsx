import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/session";
import type {
  CommunityPluginRow,
  ProfileRow,
} from "@/features/catalog/database-types";
import {
  getPluginCatalog,
} from "@/features/catalog/queries";
import type { PluginRecord } from "@/features/catalog/types";
import {
  getFavoritePlugins,
  getUserFollowStats,
  type FavoriteEntry,
} from "@/features/social/queries";
import { buildArchiveZipUrl } from "@/lib/github/repos";
import { FollowButton } from "@/components/social/follow-button";
import { PluginGrid } from "@/components/plugin-grid";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

type Params = Promise<{ username: string }>;
type UserPageSearchParams = Promise<{ tab?: string | string[] }>;

async function decodeUsername(params: Params): Promise<string> {
  const { username } = await params;
  try {
    return decodeURIComponent(username);
  } catch {
    return username;
  }
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const username = await decodeUsername(params);
  const profile = await fetchProfile(username);
  const displayName = profile?.display_name || profile?.username || username;
  return { title: `${displayName} 发布的插件` };
}

async function fetchProfile(username: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  return data ?? null;
}

/**
 * 公开作者主页:作者资料、真实统计(插件/粉丝/关注)、关注按钮,
 * 以及"插件 / 收藏"两个 Tab(Tab 状态走 URL 参数 ?tab=favorites)。
 * 与首页画廊共用 PluginGrid,平等展示所有作者的插件。
 */
export default async function UserPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: UserPageSearchParams;
}) {
  const username = await decodeUsername(params);
  const [profile, rawTab] = await Promise.all([
    fetchProfile(username),
    searchParams,
  ]);

  if (!profile) {
    notFound();
  }

  // "收藏" Tab 展示该作者收藏的插件;默认展示其发布的插件
  const tab = firstParam(rawTab?.tab) === "favorites" ? "favorites" : "plugins";

  const plugins = await fetchPublishedPlugins(profile);
  const [followStats, favoritePlugins] = await Promise.all([
    getUserFollowStats(profile.username),
    tab === "favorites"
      ? resolveFavoritePlugins(await getFavoritePlugins(profile.id))
      : Promise.resolve([] as PluginRecord[]),
  ]);

  const displayName = profile.display_name || profile.username;
  const profilePath = `/users/${encodeURIComponent(profile.username)}`;
  const loginPath = `/login?next=${encodeURIComponent(profilePath)}`;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:gap-5">
        {profile.avatar_url || profile.github_avatar_url ? (
          // 头像来自用户自填或 GitHub,域名不可枚举,使用原生 img
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(profile.avatar_url ?? profile.github_avatar_url) as string}
            alt=""
            className="size-18 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-18 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-medium">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {displayName}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            @{profile.username}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums">{plugins.length}</span> 个插件
            <span aria-hidden className="mx-1.5">
              ·
            </span>
            <span className="tabular-nums">{followStats?.followers ?? 0}</span>{" "}
            粉丝
            <span aria-hidden className="mx-1.5">
              ·
            </span>
            <span className="tabular-nums">{followStats?.following ?? 0}</span>{" "}
            关注
          </p>
          {profile.bio ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* 关注按钮:读取会话,独立 Suspense 流式输出(本人不显示) */}
          <Suspense fallback={null}>
            <UserFollowArea
              username={profile.username}
              loginPath={loginPath}
              nextPath={profilePath}
            />
          </Suspense>
          {profile.github_login ? (
            <a
              href={`https://github.com/${encodeURIComponent(profile.github_login)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors outline-none hover:border-foreground/25 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <FontAwesomeIcon icon={faGithub} className="size-4" aria-hidden />
              @{profile.github_login}
            </a>
          ) : null}
        </div>
      </header>

      {/* 主页 Tab:插件(默认)/ 收藏;样式与首页信息流 Tab 一致 */}
      <nav aria-label="主页内容切换" className="flex gap-2">
        <UserTabLink href={profilePath} active={tab === "plugins"}>
          插件
        </UserTabLink>
        <UserTabLink href={`${profilePath}?tab=favorites`} active={tab === "favorites"}>
          收藏
        </UserTabLink>
      </nav>

      {tab === "favorites" ? (
        favoritePlugins.length > 0 ? (
          <PluginGrid plugins={favoritePlugins} />
        ) : (
          <FavoritesEmptyState />
        )
      ) : plugins.length > 0 ? (
        <PluginGrid plugins={plugins} />
      ) : (
        <EmptyState hasFilters={false} />
      )}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        <Link
          href="/"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          返回画廊首页
        </Link>
      </p>
    </div>
  );
}

/** 关注按钮区域:读取会话;本人不显示,未登录给登录入口 */
async function UserFollowArea({
  username,
  loginPath,
  nextPath,
}: {
  username: string;
  loginPath: string;
  nextPath: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <FollowButton
        username={username}
        following={false}
        loggedIn={false}
        loginPath={loginPath}
        nextPath={nextPath}
      />
    );
  }

  const stats = await getUserFollowStats(username, user.id);
  if (!stats || stats.isSelf) return null;

  return (
    <FollowButton
      username={username}
      following={stats.isFollowing}
      loggedIn
      loginPath={loginPath}
      nextPath={nextPath}
    />
  );
}

function UserTabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/** 收藏 Tab 的空状态 */
function FavoritesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <h2 className="text-base font-medium">还没有收藏</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        在插件详情页点击收藏,喜欢的作品会出现在这里。
      </p>
    </div>
  );
}

/** 读取该作者已发布的插件,并映射为画廊共用的 PluginRecord */
async function fetchPublishedPlugins(profile: ProfileRow) {
  const ownerId = profile.id;
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("plugins")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const rows: CommunityPluginRow[] = data ?? [];

  return rows
    .filter((row) => row.plugin_id && row.name_zh && row.repo_full_name)
    .map((row) => {
      const name: { zh?: string; en?: string } = { zh: row.name_zh };
      if (row.name_en) name.en = row.name_en;
      const description: { zh?: string; en?: string } = {};
      if (row.description_zh) description.zh = row.description_zh;
      if (row.description_en) description.en = row.description_en;

      return {
        pluginId: row.plugin_id,
        name,
        author: displayNameOf(profile),
        category: row.category,
        version: row.version,
        package: "",
        downloadUrl: buildArchiveZipUrl(row.repo_full_name, row.repo_branch),
        repository: row.repo_url,
        tags: row.tags.length > 0 ? row.tags : undefined,
        description:
          Object.keys(description).length > 0 ? description : undefined,
        source: "site" as const,
        owner: {
          username: profile.username,
          displayName: profile.display_name ?? undefined,
          avatarUrl:
            profile.avatar_url ?? profile.github_avatar_url ?? undefined,
        },
      };
    });
}

/**
 * 把收藏记录解析为目录中的插件:按收藏时间倒序,用目录 pluginId 匹配。
 * 已下架/未发布的插件不在目录里,自然不出现,不虚构数据。
 */
async function resolveFavoritePlugins(
  entries: FavoriteEntry[],
): Promise<PluginRecord[]> {
  if (entries.length === 0) return [];

  const catalog = await getPluginCatalog();
  const byId = new Map(catalog.plugins.map((p) => [p.pluginId, p]));

  return entries
    .map((entry) => byId.get(entry.pluginId))
    .filter((plugin): plugin is PluginRecord => plugin !== undefined);
}

function displayNameOf(profile: ProfileRow): string {
  return profile.display_name || profile.username;
}

// 参数在 Suspense 之外解析以支持真正的 404 状态;本路由放弃 instant 导航,改为阻塞渲染
export const instant = false;
