import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { GithubIcon } from "@/components/github-icon";
import { REPO_URL } from "@/features/catalog/config";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl flex-wrap items-center gap-3 px-4 sm:flex-nowrap sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span>
            Viora<span className="text-primary"> Plugins</span>
          </span>
        </Link>

        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:px-4">
          {/* SearchBar 读取 URL 查询参数,预渲染时先出骨架,水合后填充当前关键词 */}
          <Suspense fallback={<SearchBarSkeleton />}>
            <SearchBar />
          </Suspense>
        </div>

        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 仓库"
          >
            <GithubIcon className="size-4" />
          </a>
        </Button>
      </div>
    </header>
  );
}

/** 搜索框在静态预渲染阶段的占位 */
function SearchBarSkeleton() {
  return (
    <div
      aria-hidden
      className="h-9 w-full rounded-full bg-muted/60 sm:max-w-md"
    />
  );
}
