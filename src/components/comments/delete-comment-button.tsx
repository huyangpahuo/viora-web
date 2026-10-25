"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";

import { deleteCommentAction } from "@/features/comments/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";

/**
 * 删除自己的评论(软删除)。提交前弹确认;
 * 成功后刷新页面,评论即从列表消失。
 */
export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteCommentAction,
    initialActionState,
  );
  const router = useRouter();
  const handledStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handledStateRef.current !== state) {
      handledStateRef.current = state;
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-1.5"
      onSubmit={(event) => {
        if (!window.confirm("确定删除这条评论吗?删除后不再展示。")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="commentId" value={commentId} />
      <DeleteSubmitButton />
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground outline-none transition-colors hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {pending ? (
        <FontAwesomeIcon icon={faSpinner} className="size-3 animate-spin" aria-hidden />
      ) : (
        <FontAwesomeIcon icon={faTrash} className="size-3" aria-hidden />
      )}
      删除
    </button>
  );
}
