import { Suspense } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faGear,
  faPlus,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

import { REPO_URL } from "@/features/catalog/config";
import { getCurrentProfile, getCurrentUser } from "@/features/auth/session";
import { SearchBar } from "@/components/search-bar";
import { HeaderAvatar } from "@/components/header-avatar";
import { SignOutMenuItem } from "@/components/auth/sign-out-menu-item";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className="size-4"
              aria-hidden
            />
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
            <FontAwesomeIcon icon={faGithub} className="size-4" />
          </a>
        </Button>

        {/* HeaderUser 会读取会话(动态数据),必须放在 Suspense 边界内 */}
        <Suspense fallback={<HeaderUserSkeleton />}>
          <HeaderUser />
        </Suspense>
      </div>
    </header>
  );
}

/**
 * 头部用户区:已登录显示头像下拉菜单,未登录显示登录按钮。
 * 读取会话是动态操作,由外层 <Suspense> 保证构建通过。
 */
async function HeaderUser() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button asChild size="sm" className="shrink-0">
        <Link href="/login">登录</Link>
      </Button>
    );
  }

  const profile = await getCurrentProfile();
  const displayName =
    profile?.display_name || profile?.username || user.email || "用户";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <HeaderAvatar
            avatarUrl={profile?.avatar_url ?? profile?.github_avatar_url ?? null}
            name={displayName}
          />
          <span className="hidden max-w-32 truncate sm:inline">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="truncate">
          {displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/projects/new">
            <FontAwesomeIcon icon={faPlus} aria-hidden />
            发布插件
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/projects">
            <FontAwesomeIcon icon={faFolderOpen} aria-hidden />
            我的项目
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <FontAwesomeIcon icon={faGear} aria-hidden />
            账号设置
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SignOutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 会话读取期间的占位骨架 */
function HeaderUserSkeleton() {
  return (
    <div
      aria-hidden
      className="size-8 shrink-0 animate-pulse rounded-full bg-muted"
    />
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
