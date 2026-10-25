"use client";

import { useActionState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";

import { signOutAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * 头部下拉菜单里的"退出登录"项。
 * signOutAction 是 (prev, formData) 签名的 Server Action,
 * 需要 useActionState 绑定后才能放进 <form action>;成功后由服务端跳转。
 */
export function SignOutMenuItem() {
  const [, formAction] = useActionState<ActionState, FormData>(
    signOutAction,
    initialActionState,
  );

  return (
    <form action={formAction}>
      <DropdownMenuItem asChild variant="destructive">
        <button type="submit" className="w-full">
          <FontAwesomeIcon icon={faArrowRightFromBracket} aria-hidden />
          退出登录
        </button>
      </DropdownMenuItem>
    </form>
  );
}
