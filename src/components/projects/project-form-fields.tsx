"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { CATEGORY_CODES } from "@/features/projects/schemas";
import { makeCategoryInfo } from "@/features/catalog/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** 新建/编辑项目表单共用的字段级错误文本 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

/** 必填星号 */
export function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  );
}

/**
 * 分类下拉:遍历 20 个官方分类代码,展示中文名,值为原始分类代码。
 */
export function ProjectCategorySelect({
  value,
  onValueChange,
  invalid,
}: {
  value: string;
  onValueChange: (code: string) => void;
  invalid?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger
        className="w-full"
        aria-invalid={invalid ? true : undefined}
      >
        <SelectValue placeholder="选择一个分类" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORY_CODES.map((code) => {
          const info = makeCategoryInfo(code, 0);
          return (
            <SelectItem key={code} value={code}>
              {info.name.zh}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * 标签输入:输入 + 回车添加,最多 max 个,chip 可删除。
 * 提交时请把 tags 数组以同名隐藏输入的形式写进表单。
 */
export function ProjectTagsInput({
  tags,
  onChange,
  max = 3,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const tag = draft.trim();
    if (!tag || tag.length > 20 || tags.includes(tag) || tags.length >= max) {
      setDraft("");
      return;
    }
    onChange([...tags, tag]);
    setDraft("");
  }

  return (
    <div className="flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input px-2.5 py-1 dark:bg-input/30">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
        >
          {tag}
          <button
            type="button"
            aria-label={`删除标签 ${tag}`}
            className="text-muted-foreground transition-colors hover:text-destructive"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            <FontAwesomeIcon icon={faXmark} className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      {tags.length >= max ? (
        <span className="text-xs text-muted-foreground">最多 {max} 个标签</span>
      ) : (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder={tags.length === 0 ? "输入后按回车添加,最多 3 个" : "继续添加…"}
          maxLength={20}
          className="min-w-36 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}
