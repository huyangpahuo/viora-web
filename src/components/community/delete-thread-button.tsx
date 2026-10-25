"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";

import { deleteThreadAction } from "@/features/community/actions";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";

/**
 * 删除自己的讨论帖(软删除)。点击后弹出手写蒙层确认弹层,
 * 确认后提交 deleteThreadAction:成功后由服务端跳回社区列表页。
 */
export function DeleteThreadButton({ threadId }: { threadId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="删除该讨论"
        className="text-muted-foreground hover:text-destructive"
      >
        <FontAwesomeIcon icon={faTrash} className="size-3.5" aria-hidden />
        删除
      </Button>
      {open ? (
        <DeleteThreadDialog threadId={threadId} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function DeleteThreadDialog({
  threadId,
  onClose,
}: {
  threadId: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    deleteThreadAction,
    initialActionState,
  );
  const router = useRouter();

  // 成功后服务端 redirect 跳回列表页,通常不会走到这里;兜底收起并刷新
  useEffect(() => {
    if (state.ok) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

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
        aria-labelledby="delete-thread-title"
        className="w-full max-w-md space-y-4 rounded-2xl border border-destructive/40 bg-card p-6 shadow-lg"
      >
        <div className="space-y-1">
          <h3 id="delete-thread-title" className="text-base font-semibold text-destructive">
            删除讨论
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            删除后该讨论将不再展示,已有回复一并隐藏。此操作仅你本人可以执行。
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

        <form action={formAction} className="flex justify-end gap-2">
          <input type="hidden" name="threadId" value={threadId} />
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            取消
          </Button>
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? (
              <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" aria-hidden />
            ) : null}
            删除讨论
          </Button>
        </form>
      </div>
    </div>
  );
}
