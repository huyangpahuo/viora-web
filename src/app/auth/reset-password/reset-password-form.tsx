"use client";

import { useActionState, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faSpinner } from "@fortawesome/free-solid-svg-icons";

import { resetPasswordAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { AuthCard, RequiredMark } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 重置密码表单。成功后由 resetPasswordAction 服务端跳转 /login?reset=1,
 * 客户端只负责展示校验错误与提交状态。
 */
export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    initialActionState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthCard>
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">设置新密码</h1>
        <p className="text-sm text-muted-foreground">
          请输入你的新密码,完成后需要使用新密码重新登录。
        </p>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">
            新密码
            <RequiredMark />
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="至少 8 位"
              className="pr-9"
              aria-invalid={state.fieldErrors?.password ? true : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 before:absolute before:-inset-1 before:rounded-full before:content-['']"
            >
              <FontAwesomeIcon
                icon={showPassword ? faEyeSlash : faEye}
                className="size-4"
                aria-hidden
              />
            </button>
          </div>
          {state.fieldErrors?.password ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">
            确认新密码
            <RequiredMark />
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="再输入一次新密码"
            aria-invalid={state.fieldErrors?.confirmPassword ? true : undefined}
          />
          {state.fieldErrors?.confirmPassword ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? (
            <FontAwesomeIcon
              icon={faSpinner}
              className="size-4 animate-spin"
              aria-hidden
            />
          ) : null}
          更新密码
        </Button>
      </form>
    </AuthCard>
  );
}
