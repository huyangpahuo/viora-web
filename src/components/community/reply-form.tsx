"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import { createReplyAction } from "@/features/community/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";

/**
 * 讨论回复输入框(一级回复,无嵌套)。成功后清空输入并刷新详情页;
 * 失败时保留已输入内容。
 */
export function ReplyForm({ threadId }: { threadId: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createReplyAction,
    initialActionState,
  );
  const [body, setBody] = useState("");
  const router = useRouter();
  const handledStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handledStateRef.current !== state) {
      handledStateRef.current = state;
      setBody("");
      // 回复区是动态渲染的,refresh 后服务端重新拉取最新回复
      router.refresh();
    }
  }, [state, router]);

  const error = state.error ?? state.fieldErrors?.body;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="threadId" value={threadId} />
      <Textarea
        name="body"
        required
        rows={3}
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="友善回复,理性交流…"
        aria-label="回复内容"
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">最多 2000 字</p>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || body.trim().length === 0}
        >
          {isPending ? (
            <FontAwesomeIcon icon={faSpinner} className="size-3.5 animate-spin" aria-hidden />
          ) : null}
          发布回复
        </Button>
      </div>
    </form>
  );
}
