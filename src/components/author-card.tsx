import Link from "next/link";

import { getDemoPreview } from "@/features/catalog/demo";
import { makeCategoryInfo } from "@/features/catalog/categories";
import type { PluginRecord } from "@/features/catalog/types";
import {
  PreviewImage,
} from "@/components/preview-image";
import {
  PreviewPlaceholder,
  previewTint,
} from "@/components/preview-placeholder";
import { HeaderAvatar } from "@/components/header-avatar";
import { cn } from "@/lib/utils";

/**
 * 作者卡(去重信息流的呈现形态,Pinterest 式"创作者发现"):
 * 一张卡代表一位作者 —— 头像 + 名字 + 插件数 + 其最新一件作品。
 * 卡片主体点击进入最新插件详情;作者区点击进入作者主页
 * (registry 来源的作者没有账号主页,名字不可点)。
 */

export type AuthorCardEntry = {
  /** 去重键,与信息流去重一致 */
  key: string;
  /** 作者显示名(site 为 display_name/username,registry 为 author 字符串) */
  authorName: string;
  /** 作者头像(site 作者可能来自 profile 或 GitHub;registry 作者没有) */
  avatarUrl: string | null;
  /** site 作者的用户名;registry 作者为 null(无主页可去) */
  username: string | null;
  /** 该作者在本信息流范围(全站/某分类/关注流)内的最新插件 */
  latest: PluginRecord;
  /** 该作者在当前范围内的插件总数(真实统计) */
  pluginCount: number;
};

export function AuthorCardGrid({
  entries,
  className,
}: {
  entries: AuthorCardEntry[];
  className?: string;
}) {
  return (
    <div
      className={
        "columns-2 gap-3 sm:columns-3 sm:gap-4 xl:columns-4 2xl:columns-5 min-[1800px]:columns-6 " +
        (className ?? "")
      }
    >
      {entries.map((entry) => (
        <AuthorCard key={entry.key} entry={entry} className="mb-3 sm:mb-4" />
      ))}
    </div>
  );
}

export function AuthorCard({
  entry,
  className,
}: {
  entry: AuthorCardEntry;
  className?: string;
}) {
  const demo = getDemoPreview(entry.latest);
  const name = entry.latest.name.zh ?? entry.latest.name.en ?? entry.latest.pluginId;
  const authorLink = entry.username ? `/users/${entry.username}` : null;

  return (
    <div
      className={cn(
        "group break-inside-avoid overflow-hidden rounded-2xl border bg-card transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20",
        className,
      )}
    >
      {/* 最新作品预览:点击进入插件详情 */}
      <Link
        href={`/plugins/${encodeURIComponent(entry.latest.pluginId)}`}
        className="relative block w-full overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 [background-color:var(--preview-tint)]"
        style={
          demo
            ? {
                aspectRatio: `${demo.width} / ${demo.height}`,
                "--preview-tint": previewTint(entry.latest.category),
              } as React.CSSProperties
            : undefined
        }
      >
        {demo ? (
          <PreviewImage
            src={demo.src}
            alt={`${name}(演示占位图,非插件真实效果)`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <PreviewPlaceholder
            plugin={entry.latest}
            className="aspect-[4/3]"
          />
        )}
      </Link>

      <div className="space-y-2 p-3.5">
        {/* 作者区:site 作者可进入主页 */}
        <div className="flex items-center gap-2">
          {authorLink ? (
            <Link
              href={authorLink}
              aria-label={`${entry.authorName} 的主页`}
              className="flex min-w-0 items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <HeaderAvatar
                avatarUrl={entry.avatarUrl}
                name={entry.authorName}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {entry.authorName}
                </span>
                <span className="block text-[11px] leading-none text-muted-foreground">
                  {entry.pluginCount} 个插件
                </span>
              </span>
            </Link>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <HeaderAvatar avatarUrl={null} name={entry.authorName} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {entry.authorName}
                </span>
                <span className="block text-[11px] leading-none text-muted-foreground">
                  {entry.pluginCount} 个插件
                </span>
              </span>
            </div>
          )}
        </div>

        {/* 最新作品信息:点击进入插件详情 */}
        <Link
          href={`/plugins/${encodeURIComponent(entry.latest.pluginId)}`}
          className="block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-sm text-foreground/90 group-hover:text-foreground">
              {name}
            </span>
            {entry.latest.version ? (
              <span className="shrink-0 text-[11px] leading-none text-muted-foreground">
                v{entry.latest.version}
              </span>
            ) : null}
          </span>
          {entry.latest.category ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {makeCategoryInfo(entry.latest.category, 0).name.zh}
            </span>
          ) : null}
        </Link>
      </div>
    </div>
  );
}
