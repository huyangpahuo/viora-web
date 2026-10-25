"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faUserPlus,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { toggleFollowAction } from "@/features/social/actions";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";

/**
 * 关注/取关按钮(客户端开关),详情页作者行与作者主页共用。
 * - 未登录渲染为指向登录页的按钮;
 * - 登录后通过 useActionState 调用 Server Action,成功后 toast + router.refresh();
 * - 状态始终以服务端返回为准(首版不做乐观更新)。
 */
export function FollowButton({
  username,
  following,
  loggedIn,
  loginPath,
  nextPath,
}: {
  /** 目标作者的用户名 */
  username: string;
  /** 当前登录用户是否已关注(服务端真实状态) */
  following: boolean;
  loggedIn: boolean;
  /** 未登录时的登录页地址(含回跳参数) */
  loginPath: string;
  /** 未登录跳转记录用的当前页路径 */
  nextPath: string;
}) {
  const [state, formAction] = useActionState(
    toggleFollowAction,
    initialActionState,
  );
  const router = useRouter();
  const handledStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (handledStateRef.current === state) return;
    handledStateRef.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  if (!loggedIn) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={loginPath} aria-label={`登录后关注 ${username}`}>
          <FontAwesomeIcon icon={faUserPlus} className="size-3.5" aria-hidden />
          关注
        </Link>
      </Button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="next" value={nextPath} />
      <FollowSubmit following={following} />
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function FollowSubmit({ following }: { following: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={following ? "outline" : "default"}
      size="sm"
      disabled={pending}
    >
      {pending ? (
        <FontAwesomeIcon
          icon={faSpinner}
          className="size-3.5 animate-spin"
          aria-hidden
        />
      ) : (
        <FontAwesomeIcon
          icon={following ? faUserCheck : faUserPlus}
          className="size-3.5"
          aria-hidden
        />
      )}
      {following ? "已关注" : "关注"}
    </Button>
  );
}
