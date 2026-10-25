"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";

import { requestPasswordResetAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { AuthCard, RequiredMark } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    initialActionState,
  );

  if (state.ok) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="size-10 text-primary"
            aria-hidden
          />
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            重置链接已发送
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            我们已向
            <span className="mx-1 font-medium text-foreground">
              {state.email}
            </span>
            发送了密码重置链接。请查收邮箱并按邮件指引重置密码;
            若没有收到,请检查垃圾箱后重试。
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">返回登录</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">忘记密码</h1>
        <p className="text-sm text-muted-foreground">
          输入注册邮箱,我们会发送一封包含重置链接的邮件。
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
            defaultValue={state.email ?? ""}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
          />
          {state.fieldErrors?.email ? (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
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
          发送重置链接
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        想起密码了?
        <Link
          href="/login"
          className="ml-1 text-primary underline-offset-4 hover:underline"
        >
          返回登录
        </Link>
      </p>
    </AuthCard>
  );
}
