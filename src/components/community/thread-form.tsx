"use client";

import { useActionState, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import { createThreadAction } from "@/features/community/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";

/**
 * 发布讨论表单。成功后由 createThreadAction 服务端跳转到详情页;
 * 失败时保留已输入内容并展示错误。
 */
export function ThreadForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createThreadAction,
    initialActionState,
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const canSubmit =
    !isPending && title.trim().length > 0 && body.trim().length > 0;

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="thread-title">标题</Label>
        <Input
          id="thread-title"
          name="title"
          required
          maxLength={120}
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="一句话说清你要讨论的话题"
          aria-invalid={state.fieldErrors?.title ? true : undefined}
        />
        {state.fieldErrors?.title ? (
          <p role="alert" className="text-xs text-destructive">
            {state.fieldErrors.title}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {title.length}/120 字
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="thread-body">正文</Label>
        <Textarea
          id="thread-body"
          name="body"
          required
          rows={12}
          maxLength={5000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="详细描述你的问题、想法或分享的内容…"
          aria-label="讨论正文"
          aria-invalid={state.fieldErrors?.body ? true : undefined}
          className="min-h-56"
        />
        {state.fieldErrors?.body ? (
          <p role="alert" className="text-xs text-destructive">
            {state.fieldErrors.body}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {body.length}/5000 字
          </p>
        )}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? (
            <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" aria-hidden />
          ) : null}
          发布讨论
        </Button>
      </div>
    </form>
  );
}
