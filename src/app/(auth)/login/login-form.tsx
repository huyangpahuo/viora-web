"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

import { signInAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AuthCard, RequiredMark } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signInAction,
    initialActionState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error") === "callback";

  return (
    <AuthCard>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">登录你的账户</h1>
        <p className="text-sm text-muted-foreground">
          欢迎回来,登录后可以发布与管理你的插件。
        </p>
      </div>

      {callbackError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden
          />
          <p>登录回调处理失败,请重试。</p>
        </div>
      ) : null}

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
          <Label htmlFor="email">
            邮箱
            <RequiredMark />
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            aria-invalid={state.fieldErrors?.email ? true : undefined}
          />
          {state.fieldErrors?.email ? (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">
            密码
            <RequiredMark />
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="输入密码"
              className="pr-9"
              aria-invalid={state.fieldErrors?.password ? true : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? (
            <FontAwesomeIcon
              icon={faSpinner}
              className="size-4 animate-spin"
              aria-hidden
            />
          ) : null}
          登 录
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">或</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButtons />

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          忘记密码?
        </Link>
        <p className="text-muted-foreground">
          还没有账户?
          <Link
            href="/signup"
            className="ml-1 text-primary underline-offset-4 hover:underline"
          >
            注册
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
