"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import { createCommentAction } from "@/features/comments/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * 评论/回复输入框。成功后清空输入并刷新详情页;
 * 失败时保留已输入内容。回复场景传 parentId,并可取消返回。
 */
export function CommentForm({
  pluginId,
  parentId,
  replyToName,
  autoFocus = false,
  onDone,
  onCancel,
}: {
  pluginId: string;
  parentId?: string;
  replyToName?: string;
  autoFocus?: boolean;
  /** 提交成功后的回调(如收起内联回复框) */
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createCommentAction,
    initialActionState,
  );
  const [body, setBody] = useState("");
  const router = useRouter();
  const handledStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handledStateRef.current !== state) {
      handledStateRef.current = state;
      setBody("");
      onDone?.();
      // 评论区是动态渲染的,refresh 后服务端重新拉取最新评论
      router.refresh();
    }
  }, [state, onDone, router]);

  const error = state.error ?? state.fieldErrors?.body;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="pluginId" value={pluginId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <Textarea
        name="body"
        required
        rows={parentId ? 2 : 3}
        maxLength={1000}
        autoFocus={autoFocus}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentId && replyToName ? `回复 @${replyToName}…` : "友善评论,理性交流…"}
        aria-label={parentId ? "回复内容" : "评论内容"}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">最多 1000 字</p>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              取消
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={isPending || body.trim().length === 0}>
            {isPending ? (
              <FontAwesomeIcon icon={faSpinner} className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            发布
          </Button>
        </div>
      </div>
    </form>
  );
}
