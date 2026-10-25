"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import { updateProjectAction } from "@/features/projects/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import type { CommunityPluginRow } from "@/features/catalog/database-types";
import {
  FieldError,
  ProjectCategorySelect,
  ProjectTagsInput,
  RequiredMark,
} from "@/components/projects/project-form-fields";
import { PreviewUploadFields } from "@/components/projects/preview-upload-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * 编辑项目表单:pluginId 只读展示,不再包含 slug 字段。
 * 提交 updateProjectAction(隐藏域携带数据库行 id),
 * 成功后 toast 并跳转到插件详情页。
 */
export function EditProjectForm({ plugin }: { plugin: CommunityPluginRow }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateProjectAction,
    initialActionState,
  );
  const [category, setCategory] = useState(plugin.category);
  const [tags, setTags] = useState<string[]>(plugin.tags ?? []);
  const router = useRouter();
  const handledStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handledStateRef.current !== state) {
      handledStateRef.current = state;
      toast.success(state.message ?? "项目已更新。");
      router.push(`/plugins/${encodeURIComponent(plugin.plugin_id)}`);
    }
  }, [state, router, plugin.plugin_id]);

  return (
    <div className="space-y-4 rounded-2xl border bg-card/70 p-6 sm:p-8">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="pluginId" value={plugin.id} />
        {tags.map((tag) => (
          <input key={tag} type="hidden" name="tags" value={tag} />
        ))}

        <div className="space-y-1.5">
          <Label>插件标识(pluginId,只读)</Label>
          <p className="rounded-lg border bg-muted/40 px-2.5 py-1.5 font-mono text-sm text-muted-foreground">
            {plugin.plugin_id}
          </p>
          <p className="text-xs text-muted-foreground">
            插件标识发布后不可修改。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nameZh">
              名称(中文)
              <RequiredMark />
            </Label>
            <Input
              id="nameZh"
              name="nameZh"
              required
              maxLength={60}
              defaultValue={plugin.name_zh}
              aria-invalid={state.fieldErrors?.nameZh ? true : undefined}
            />
            <FieldError message={state.fieldErrors?.nameZh} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nameEn">英文名</Label>
            <Input
              id="nameEn"
              name="nameEn"
              maxLength={60}
              defaultValue={plugin.name_en ?? ""}
              aria-invalid={state.fieldErrors?.nameEn ? true : undefined}
            />
            <FieldError message={state.fieldErrors?.nameEn} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              分类
              <RequiredMark />
            </Label>
            <ProjectCategorySelect
              value={category}
              onValueChange={setCategory}
              invalid={Boolean(state.fieldErrors?.category)}
            />
            <input type="hidden" name="category" value={category} />
            <FieldError message={state.fieldErrors?.category} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="version">版本</Label>
            <Input
              id="version"
              name="version"
              defaultValue={plugin.version}
              placeholder="1.0.0"
              className="font-mono"
              aria-invalid={state.fieldErrors?.version ? true : undefined}
            />
            <FieldError message={state.fieldErrors?.version} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>标签</Label>
          <ProjectTagsInput tags={tags} onChange={setTags} />
          <FieldError message={state.fieldErrors?.tags} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descriptionZh">
            介绍(中文)
            <RequiredMark />
          </Label>
          <Textarea
            id="descriptionZh"
            name="descriptionZh"
            required
            rows={4}
            maxLength={500}
            defaultValue={plugin.description_zh ?? ""}
            aria-invalid={state.fieldErrors?.descriptionZh ? true : undefined}
          />
          <FieldError message={state.fieldErrors?.descriptionZh} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descriptionEn">英文介绍</Label>
          <Textarea
            id="descriptionEn"
            name="descriptionEn"
            rows={3}
            maxLength={500}
            defaultValue={plugin.description_en ?? ""}
            aria-invalid={state.fieldErrors?.descriptionEn ? true : undefined}
          />
          <FieldError message={state.fieldErrors?.descriptionEn} />
        </div>

        <PreviewUploadFields
          existingBeforeUrl={plugin.preview_before_url}
          existingAfterUrl={plugin.preview_after_url}
          serverErrors={state.fieldErrors}
        />

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? (
            <FontAwesomeIcon
              icon={faSpinner}
              className="size-4 animate-spin"
              aria-hidden
            />
          ) : null}
          保存修改
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          效果图公开可见,请确认你拥有上传图片的权利。
        </p>
      </form>
    </div>
  );
}
