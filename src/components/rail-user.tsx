import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket } from "@fortawesome/free-solid-svg-icons";

import { getCurrentProfile, getCurrentUser } from "@/features/auth/session";
import { HeaderAvatar } from "@/components/header-avatar";
import { SignOutMenuItem } from "@/components/auth/sign-out-menu-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * 侧栏底部的用户区:已登录为头像(点击展开菜单),
 * 未登录为"登录"图标入口。读取会话属动态数据,由外层 <Suspense> 保证。
 */
export async function RailUser() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link
        href="/login"
        title="登录"
        aria-label="登录"
        className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <FontAwesomeIcon icon={faRightToBracket} className="size-5" aria-hidden />
      </Link>
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
          title={displayName}
          aria-label={`账号菜单:${displayName}`}
          className="mt-1 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <HeaderAvatar
            avatarUrl={profile?.avatar_url ?? profile?.github_avatar_url ?? null}
            name={displayName}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-44">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/users/${profile?.username ?? ""}`}>个人主页</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">账号设置</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SignOutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
