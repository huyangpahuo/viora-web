"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faEye,
  faEyeSlash,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import { signUpAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AuthCard, RequiredMark } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/** 密码强度:按长度 + 字符类别打分,0-4 对应 弱/一般/强/很强 */
function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["弱", "一般", "强", "很强"];
const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-amber-500/80",
  "bg-primary",
  "bg-primary",
];

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signUpAction,
    initialActionState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  if (state.needsConfirmation) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="size-10 text-primary"
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            验证邮件已发送
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            我们已向
            <span className="mx-1 font-medium text-foreground">
              {state.email}
            </span>
            发送了一封验证邮件。请查收邮箱并点击邮件中的链接完成验证;
            若没有收到,请检查垃圾箱后重试。
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">返回登录</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  const score = passwordScore(password);

  return (
    <AuthCard>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">创建账户</h1>
        <p className="text-sm text-muted-foreground">
          注册后即可关联 GitHub 并发布你的插件。
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
          <Label htmlFor="username">
            用户名
            <RequiredMark />
          </Label>
          <Input
            id="username"
            name="username"
            required
            autoComplete="username"
            placeholder="小写字母、数字、_ 或 -"
            aria-invalid={state.fieldErrors?.username ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            3-20 位小写字母/数字/_/-,注册后将作为你的主页地址。
          </p>
          {state.fieldErrors?.username ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.username}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            邮箱
            <RequiredMark />
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
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
              required
              autoComplete="new-password"
              placeholder="至少 8 位"
              className="pr-9"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  aria-hidden
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    score >= level ? STRENGTH_COLORS[score - 1] : "bg-muted",
                  )}
                />
              ))}
            </div>
            <span className="w-8 text-right text-xs text-muted-foreground">
              {score > 0 ? STRENGTH_LABELS[score - 1] : ""}
            </span>
          </div>
          {state.fieldErrors?.password ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">
            确认密码
            <RequiredMark />
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="再输入一次密码"
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
          创建账户
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">或</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButtons />

      <p className="text-center text-sm text-muted-foreground">
        已有账户?
        <Link
          href="/login"
          className="ml-1 text-primary underline-offset-4 hover:underline"
        >
          登录
        </Link>
      </p>
    </AuthCard>
  );
}
