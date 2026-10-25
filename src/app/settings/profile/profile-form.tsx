"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import { updateProfileAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import type { ProfileRow } from "@/features/catalog/database-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

/**
 * 资料表单:username、显示名、简介、头像地址。
 * 成功后用 toast 提示;失败显示顶部错误条与字段级错误。
 */
export function ProfileForm({ profile }: { profile: ProfileRow | null }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateProfileAction,
    initialActionState,
  );
  const lastStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && lastStateRef.current !== state) {
      toast.success(state.message ?? "资料已保存。");
      lastStateRef.current = state;
    }
  }, [state]);

  return (
    <section className="rounded-2xl border bg-card/70 p-6">
      <h2 className="text-base font-semibold">资料</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        这些信息会展示在你的公开作者主页上。
      </p>

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">
            用户名
            <span className="text-destructive" aria-hidden>
              *
            </span>
          </Label>
          <Input
            id="username"
            name="username"
            required
            defaultValue={profile?.username ?? ""}
            placeholder="3-20 位小写字母/数字/_/-"
            aria-invalid={state.fieldErrors?.username ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            修改后你的作者主页地址会随之变化。
          </p>
          {state.fieldErrors?.username ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.username}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">显示名</Label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={profile?.display_name ?? ""}
            placeholder="展示在卡片与主页上的名字(可选)"
            aria-invalid={state.fieldErrors?.displayName ? true : undefined}
          />
          {state.fieldErrors?.displayName ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.displayName}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">简介</Label>
          <Textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={profile?.bio ?? ""}
            placeholder="一句话介绍你自己(可选)"
            aria-invalid={state.fieldErrors?.bio ? true : undefined}
          />
          {state.fieldErrors?.bio ? (
            <p className="text-xs text-destructive">{state.fieldErrors.bio}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl">头像地址</Label>
          <Input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            defaultValue={profile?.avatar_url ?? ""}
            placeholder="https://...(可选)"
            aria-invalid={state.fieldErrors?.avatarUrl ? true : undefined}
          />
          {state.fieldErrors?.avatarUrl ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.avatarUrl}
            </p>
          ) : null}
        </div>

        <Separator />

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <FontAwesomeIcon
              icon={faSpinner}
              className="size-4 animate-spin"
              aria-hidden
            />
          ) : null}
          保存资料
        </Button>
      </form>
    </section>
  );
}
