"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

import { createProjectAction } from "@/features/projects/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import { SLUG_PATTERN, suggestSlug } from "@/features/projects/schemas";
import {
  FieldError,
  ProjectCategorySelect,
  ProjectTagsInput,
  RequiredMark,
} from "@/components/projects/project-form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** 由英文名优先、中文名兜底生成 slug 建议 */
function autoSlug(nameEn: string, nameZh: string): string {
  return suggestSlug(nameEn) ?? suggestSlug(nameZh) ?? "";
}

/**
 * 新建项目表单。提交 createProjectAction:
 * 成功由服务端 redirect 到详情页;未关联 GitHub 时返回 message === "link"。
 */
export function NewProjectForm({ githubLogin }: { githubLogin: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createProjectAction,
    initialActionState,
  );

  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [version, setVersion] = useState("1.0.0");

  const slugInvalid = slug.length > 0 && !SLUG_PATTERN.test(slug);
  const pluginIdPreview = useMemo(
    () => (slug && !slugInvalid ? `${githubLogin}.${slug}` : null),
    [githubLogin, slug, slugInvalid],
  );

  const needsLink = state.message === "link";

  return (
    <div className="space-y-4 rounded-2xl border bg-card/70 p-6 sm:p-8">
      {state.error && !needsLink ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {needsLink ? (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm"
        >
          <p className="flex items-start gap-2 text-destructive">
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            {state.error ?? "请先关联 GitHub 账号后再发布插件。"}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/profile">前往账号设置关联 GitHub</Link>
          </Button>
        </div>
      ) : null}

      <form action={formAction} className="space-y-5">
        {/* tags 以同名隐藏输入提交,服务端用 getAll("tags") 读取 */}
        {tags.map((tag) => (
          <input key={tag} type="hidden" name="tags" value={tag} />
        ))}

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
              value={nameZh}
              onChange={(event) => {
                const value = event.target.value;
                setNameZh(value);
                if (!slugTouched) setSlug(autoSlug(nameEn, value));
              }}
              placeholder="例如:水彩梦境"
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
              value={nameEn}
              onChange={(event) => {
                const value = event.target.value;
                setNameEn(value);
                if (!slugTouched) setSlug(autoSlug(value, nameZh));
              }}
              placeholder="可选,用于 slug 生成"
              aria-invalid={state.fieldErrors?.nameEn ? true : undefined}
            />
            <FieldError message={state.fieldErrors?.nameEn} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">
            项目标识(slug)
            <RequiredMark />
          </Label>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value.toLowerCase());
            }}
            placeholder="小写字母、数字和短横线,3-40 位"
            className="font-mono"
            aria-invalid={slugInvalid ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            插件全局唯一标识为 你的 GitHub 用户名 . slug,发布后不可修改。
          </p>
          {slugInvalid ? (
            <p className="text-xs text-destructive">
              slug 只能包含小写字母、数字和短横线,长度 3-40,并以字母或数字结尾。
            </p>
          ) : null}
          {!slugInvalid && pluginIdPreview ? (
            <p className="text-xs text-muted-foreground">
              pluginId 预览:
              <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
                {pluginIdPreview}
              </code>
            </p>
          ) : null}
          <FieldError message={state.fieldErrors?.slug} />
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
            <Label htmlFor="version">初始版本</Label>
            <Input
              id="version"
              name="version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
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
            placeholder="描述插件的风格与适用场景(最多 500 字)"
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
            placeholder="可选,英文版介绍"
            aria-invalid={state.fieldErrors?.descriptionEn ? true : undefined}
          />
          <FieldError message={state.fieldErrors?.descriptionEn} />
        </div>

        <div className="space-y-2 border-t pt-4">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending || slugInvalid}
          >
            {isPending ? (
              <FontAwesomeIcon
                icon={faSpinner}
                className="size-4 animate-spin"
                aria-hidden
              />
            ) : (
              <FontAwesomeIcon icon={faGithub} className="size-4" aria-hidden />
            )}
            创建项目并创建 GitHub 仓库
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            提交后会自动在你的 GitHub 账号({githubLogin})下创建公开仓库。
          </p>
        </div>
      </form>
    </div>
  );
}
