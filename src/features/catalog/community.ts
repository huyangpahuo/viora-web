import { cacheLife, cacheTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { buildArchiveZipUrl } from "@/lib/github/repos";
import type { PluginOwnerInfo } from "./database-types";
import type { PluginRecord } from "./types";

/**
 * 站点发布的插件数据源(Supabase public.plugins)。
 *
 * 作者在站点注册、关联 GitHub、新建项目后,插件记录保存在数据库,
 * 安装包托管在作者自己的 GitHub 仓库;huyangpahuo/Viora-plugins 的
 * registry.json 是另一条并列的来源管道,两者在 queries 里平等合并,
 * UI 不区分、不标记任何来源。
 *
 * Supabase 未配置或查询失败时返回空数组,站点退化为仅展示
 * registry 来源的插件。缓存 60 秒,发布/更新时 revalidateTag 立即失效。
 */
export async function getSitePlugins(): Promise<PluginRecord[]> {
  "use cache";
  cacheTag("site-plugins");
  cacheLife({ stale: 30, revalidate: 60, expire: 60 * 60 });

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("plugins")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[catalog] 读取站点插件失败:", error.message);
    return [];
  }

  const rows = data ?? [];
  if (rows.length === 0) return [];

  // 批量取发布者资料用于展示(公开可读)
  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  const { data: owners, error: ownersError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, github_avatar_url")
    .in("id", ownerIds);

  if (ownersError) {
    console.error("[catalog] 读取插件作者资料失败:", ownersError.message);
  }

  const ownerMap = new Map<string, PluginOwnerInfo>(
    (owners ?? []).map((owner) => [
      owner.id,
      {
        username: owner.username,
        displayName: owner.display_name,
        avatarUrl: owner.avatar_url ?? owner.github_avatar_url,
      },
    ]),
  );

  return rows
    .map((row) => mapRowToRecord(row, ownerMap.get(row.owner_id)))
    .filter((plugin): plugin is PluginRecord => plugin !== null);
}

function mapRowToRecord(
  row: {
    plugin_id: string;
    name_zh: string;
    name_en: string | null;
    description_zh: string | null;
    description_en: string | null;
    category: string;
    tags: string[];
    version: string;
    repo_full_name: string;
    repo_url: string;
    repo_branch: string;
  },
  owner: PluginOwnerInfo | undefined,
): PluginRecord | null {
  // 数据库约束已保证字段格式,这里仍做一层防御
  if (!row.plugin_id || !row.name_zh || !row.repo_full_name) return null;

  const name: { zh?: string; en?: string } = { zh: row.name_zh };
  if (row.name_en) name.en = row.name_en;

  const description: { zh?: string; en?: string } = {};
  if (row.description_zh) description.zh = row.description_zh;
  if (row.description_en) description.en = row.description_en;

  return {
    pluginId: row.plugin_id,
    name,
    author: owner?.displayName || owner?.username,
    category: row.category,
    version: row.version,
    package: "",
    downloadUrl: buildArchiveZipUrl(row.repo_full_name, row.repo_branch),
    repository: row.repo_url,
    tags: row.tags.length > 0 ? row.tags : undefined,
    description: Object.keys(description).length > 0 ? description : undefined,
    source: "site",
    owner: owner
      ? {
          username: owner.username,
          displayName: owner.displayName ?? undefined,
          avatarUrl: owner.avatarUrl ?? undefined,
        }
      : undefined,
  };
}
