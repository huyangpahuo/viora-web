"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEyeSlash, faSpinner, faUpload } from "@fortawesome/free-solid-svg-icons";

import { toggleProjectStatusAction } from "@/features/projects/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";

/**
 * 发布/隐藏切换表单:服务端 action(toggleProjectStatusAction)
 * 读取 formData 里的 pluginId 与目标 status("published" | "hidden")。
 */
export function StatusToggleForm({
  pluginId,
  status,
}: {
  pluginId: string;
  status: "published" | "hidden";
}) {
  const [, formAction] = useActionState<ActionState, FormData>(
    toggleProjectStatusAction,
    initialActionState,
  );
  const nextStatus = status === "published" ? "hidden" : "published";

  return (
    <form action={formAction}>
      <input type="hidden" name="pluginId" value={pluginId} />
      <input type="hidden" name="status" value={nextStatus} />
      <ToggleSubmitButton published={status === "published"} />
    </form>
  );
}

function ToggleSubmitButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={published ? "隐藏该插件" : "发布该插件"}
    >
      {pending ? (
        <FontAwesomeIcon
          icon={faSpinner}
          className="size-3.5 animate-spin"
          aria-hidden
        />
      ) : (
        <FontAwesomeIcon
          icon={published ? faEyeSlash : faUpload}
          className="size-3.5"
          aria-hidden
        />
      )}
      {published ? "隐藏" : "发布"}
    </Button>
  );
}
