"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import { deleteAccountAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 危险区:注销账号。输入用户名确认后提交 deleteAccountAction,
 * 成功由服务端跳回首页。GitHub 上的仓库不会被删除,文案如实说明。
 */
export function DangerZone({ username }: { username: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-destructive/30 bg-card/70 p-6">
      <h2 className="text-base font-semibold text-destructive">危险区</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        注销后,你的账号、资料、发布的插件与评论将被删除且不可恢复;
        GitHub 上的仓库不会被自动删除,需要你自行处理。
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-4"
        onClick={() => setOpen(true)}
        disabled={!username}
      >
        <FontAwesomeIcon icon={faTriangleExclamation} className="size-4" aria-hidden />
        注销账号
      </Button>
      {!username ? (
        <p className="mt-2 text-xs text-muted-foreground">资料加载中,暂时无法注销。</p>
      ) : null}

      {open && username ? (
        <DeleteAccountDialog username={username} onClose={() => setOpen(false)} />
      ) : null}
    </section>
  );
}

function DeleteAccountDialog({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    deleteAccountAction,
    initialActionState,
  );
  const handledStateRef = useRef<ActionState | null>(null);

  // 注销成功后 action 会 redirect,正常不会停在弹层;
  // 这里只处理意外残留的确认输入状态
  useEffect(() => {
    if (state.ok && handledStateRef.current !== state) {
      handledStateRef.current = state;
      onClose();
    }
  }, [state, onClose]);

  // Esc 关闭弹层
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="w-full max-w-md space-y-4 rounded-2xl border border-destructive/40 bg-card p-6 shadow-lg"
      >
        <div className="space-y-1">
          <h3 id="delete-account-title" className="text-base font-semibold text-destructive">
            确认注销账号
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            账号、资料、发布的插件与评论将被删除且不可恢复;
            GitHub 上的仓库需你自行处理。此操作无法撤销。
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="delete-account-confirm">
              请输入你的用户名{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
                {username}
              </code>{" "}
              以确认
            </Label>
            <Input
              id="delete-account-confirm"
              name="confirm"
              required
              autoComplete="off"
              placeholder={username}
              aria-invalid={state.fieldErrors?.confirm ? true : undefined}
            />
            {state.fieldErrors?.confirm ? (
              <p role="alert" className="text-xs text-destructive">
                {state.fieldErrors.confirm}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? (
                <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" aria-hidden />
              ) : null}
              永久注销账号
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
