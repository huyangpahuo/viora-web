"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

import { deleteProjectAction } from "@/features/projects/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 删除项目入口与确认弹层。输入插件名称确认后提交 deleteProjectAction:
 * 站点记录被真删除;GitHub 侧尽力移除 plugin.json、registry 条目与安装包 zip,
 * 仓库本身和已上传的效果图会保留作为历史留档。
 */
export function DeleteProjectForm({
  pluginId,
  name,
}: {
  /** 数据库行 id(表单隐藏域) */
  pluginId: string;
  /** 插件名称,确认弹层要求原样输入 */
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`删除插件 ${name}`}
      >
        <FontAwesomeIcon icon={faTrash} className="size-3.5" aria-hidden />
        删除
      </Button>
      {open ? (
        <DeleteProjectDialog pluginId={pluginId} name={name} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function DeleteProjectDialog({
  pluginId,
  name,
  onClose,
}: {
  pluginId: string;
  name: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    deleteProjectAction,
    initialActionState,
  );
  const router = useRouter();
  const handledStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handledStateRef.current !== state) {
      handledStateRef.current = state;
      onClose();
      // 成功 message 可能携带“同步清理 GitHub 内容失败”的警告,用 toast 带出
      if (state.message?.includes("失败")) {
        toast.warning(state.message);
      } else {
        toast.success(state.message ?? "项目已删除。");
      }
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
        aria-labelledby="delete-project-title"
        className="w-full max-w-md space-y-4 rounded-2xl border border-destructive/40 bg-card p-6 shadow-lg"
      >
        <div className="space-y-1">
          <h3 id="delete-project-title" className="text-base font-semibold text-destructive">
            删除项目
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            将删除站点上的插件记录,并尽力从你的仓库移除对应文件;GitHub
            仓库本身不会被删除。已上传到仓库的效果图会保留,作为历史留档。
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="pluginId" value={pluginId} />
          <div className="space-y-1.5">
            <Label htmlFor="delete-project-confirm">
              请输入插件名称{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
                {name}
              </code>{" "}
              以确认
            </Label>
            <Input
              id="delete-project-confirm"
              name="confirm"
              required
              autoComplete="off"
              placeholder={name}
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
              永久删除
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
