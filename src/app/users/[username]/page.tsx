import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

import { createClient } from "@/lib/supabase/server";
import type {
  CommunityPluginRow,
  ProfileRow,
} from "@/features/catalog/database-types";
import { buildArchiveZipUrl } from "@/lib/github/repos";
import { PluginGrid } from "@/components/plugin-grid";
import { EmptyState } from "@/components/empty-state";

type Params = Promise<{ username: string }>;

async function decodeUsername(params: Params): Promise<string> {
  const { username } = await params;
  try {
    return decodeURIComponent(username);
  } catch {
    return username;
  }
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
 * 公开作者主页:展示作者的资料与其发布的全部插件(仅 published)。
 * 与首页画廊共用 PluginGrid,平等展示所有作者的插件。
 */
export default async function UserPage({ params }: { params: Params }) {
  const username = await decodeUsername(params);
  const profile = await fetchProfile(username);

  if (!profile) {
    notFound();
  }

  const plugins = await fetchPublishedPlugins(profile);
  const displayName = profile.display_name || profile.username;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
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
          {profile.bio ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}
        </div>

        {profile.github_login ? (
          <a
            href={`https://github.com/${encodeURIComponent(profile.github_login)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors outline-none hover:border-foreground/25 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <FontAwesomeIcon icon={faGithub} className="size-4" aria-hidden />
            @{profile.github_login}
          </a>
        ) : null}
      </header>

      {plugins.length > 0 ? (
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

function displayNameOf(profile: ProfileRow): string {
  return profile.display_name || profile.username;
}

// 参数在 Suspense 之外解析以支持真正的 404 状态;本路由放弃 instant 导航,改为阻塞渲染
export const instant = false;
