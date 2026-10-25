"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-common-types";
import {
  faHeart,
  faSpinner,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

import { toggleFavoriteAction, toggleLikeAction } from "@/features/social/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { cn } from "@/lib/utils";

/**
 * 详情页的点赞/收藏按钮(客户端开关)。
 * - 未登录渲染为指向登录页的链接;
 * - 登录后通过 useActionState 调用 Server Action,成功后 toast + router.refresh(),
 *   计数与高亮状态始终以服务端返回为准(首版不做乐观更新)。
 * 样式与分类胶囊同族:圆角胶囊 + 计数。
 */

const pillBase =
  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors outline-none";

const pillIdle =
  "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground";

export function LikeButton({
  pluginId,
  count,
  liked,
  loggedIn,
  loginPath,
  nextPath,
}: {
  pluginId: string;
  /** 真实点赞计数(服务端聚合),空计数显示 0 */
  count: number;
  liked: boolean;
  loggedIn: boolean;
  /** 未登录时的登录页地址(含回跳参数) */
  loginPath: string;
  /** 未登录跳转记录用的当前页路径 */
  nextPath: string;
}) {
  if (!loggedIn) {
    return (
      <LoginGatePill loginPath={loginPath} icon={faHeart} label="点赞" count={count} />
    );
  }
  return (
    <SocialToggleForm
      action={toggleLikeAction}
      pluginId={pluginId}
      nextPath={nextPath}
      active={liked}
      count={count}
      icon={faHeart}
      iconActiveClass="text-red-400"
      activeTitle="取消点赞"
      inactiveTitle="点赞"
      ariaLabel="点赞本插件"
    />
  );
}

export function FavoriteButton({
  pluginId,
  count,
  favorited,
  loggedIn,
  loginPath,
  nextPath,
}: {
  pluginId: string;
  count: number;
  favorited: boolean;
  loggedIn: boolean;
  loginPath: string;
  nextPath: string;
}) {
  if (!loggedIn) {
    return (
      <LoginGatePill loginPath={loginPath} icon={faStar} label="收藏" count={count} />
    );
  }
  return (
    <SocialToggleForm
      action={toggleFavoriteAction}
      pluginId={pluginId}
      nextPath={nextPath}
      active={favorited}
      count={count}
      icon={faStar}
      iconActiveClass="text-amber-400"
      activeTitle="取消收藏"
      inactiveTitle="收藏"
      ariaLabel="收藏本插件"
    />
  );
}

/** 未登录:同一外观的胶囊,点击去登录 */
function LoginGatePill({
  loginPath,
  icon,
  label,
  count,
}: {
  loginPath: string;
  icon: IconDefinition;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={loginPath}
      title={`登录后${label}`}
      aria-label={`登录后${label},当前 ${count}`}
      className={cn(pillBase, pillIdle)}
    >
      <FontAwesomeIcon icon={icon} className="size-4" aria-hidden />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}

type SocialToggleAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>;

function SocialToggleForm({
  action,
  pluginId,
  nextPath,
  active,
  count,
  icon,
  iconActiveClass,
  activeTitle,
  inactiveTitle,
  ariaLabel,
}: {
  action: SocialToggleAction;
  pluginId: string;
  nextPath: string;
  active: boolean;
  count: number;
  icon: IconDefinition;
  iconActiveClass: string;
  activeTitle: string;
  inactiveTitle: string;
  ariaLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const router = useRouter();
  const handledStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (handledStateRef.current === state) return;
    handledStateRef.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      // 以服务端为准刷新计数与高亮
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="pluginId" value={pluginId} />
      <input type="hidden" name="next" value={nextPath} />
      <ToggleSubmit
        active={active}
        count={count}
        icon={icon}
        iconActiveClass={iconActiveClass}
        activeTitle={activeTitle}
        inactiveTitle={inactiveTitle}
        ariaLabel={ariaLabel}
      />
    </form>
  );
}

function ToggleSubmit({
  active,
  count,
  icon,
  iconActiveClass,
  activeTitle,
  inactiveTitle,
  ariaLabel,
}: {
  active: boolean;
  count: number;
  icon: IconDefinition;
  iconActiveClass: string;
  activeTitle: string;
  inactiveTitle: string;
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={active}
      aria-label={`${active ? activeTitle : inactiveTitle},${ariaLabel},当前 ${count}`}
      title={active ? activeTitle : inactiveTitle}
      className={cn(
        pillBase,
        "bg-card disabled:pointer-events-none disabled:opacity-60",
        pillIdle,
      )}
    >
      {pending ? (
        <FontAwesomeIcon
          icon={faSpinner}
          className="size-4 animate-spin"
          aria-hidden
        />
      ) : (
        <FontAwesomeIcon
          icon={icon}
          className={cn("size-4", active && iconActiveClass)}
          aria-hidden
        />
      )}
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
