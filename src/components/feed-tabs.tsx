import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * 首页信息流 Tab:最新(默认)/ 推荐 / 关注。
 * 样式与分类胶囊一致;Tab 状态走 URL 参数 ?tab=,切换时保留 q/tag。
 * "关注" Tab 仅登录用户可见(未登录直接不渲染)。
 */
export type FeedTab = "latest" | "recommended" | "following";

export function FeedTabs({
  activeTab,
  q,
  tag,
  showFollowing,
  className,
}: {
  activeTab: FeedTab;
  q?: string;
  tag?: string;
  showFollowing: boolean;
  className?: string;
}) {
  const tabs: { key: FeedTab; label: string; href: string }[] = [
    { key: "latest", label: "最新", href: buildFeedHref("latest", q, tag) },
    {
      key: "recommended",
      label: "推荐",
      href: buildFeedHref("recommended", q, tag),
    },
  ];
  if (showFollowing) {
    tabs.push({
      key: "following",
      label: "关注",
      href: buildFeedHref("following", q, tag),
    });
  }

  return (
    <nav aria-label="信息流排序" className={cn("flex gap-2", className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={activeTab === tab.key ? "page" : undefined}
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            activeTab === tab.key
              ? "border-transparent bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Tab 链接:最新 Tab 不带 tab 参数(保持默认),其余保留 q/tag */
function buildFeedHref(tab: FeedTab, q?: string, tag?: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tag) params.set("tag", tag);
  if (tab !== "latest") params.set("tab", tab);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
