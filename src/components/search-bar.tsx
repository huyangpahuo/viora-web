"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * 全局搜索框:提交后跳转到 /?q=...,与首页结果区共享 URL 状态。
 * 保留在 URL 中,搜索结果可以被分享和刷新。
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";

  const [value, setValue] = useState(currentQuery);
  const [syncedQuery, setSyncedQuery] = useState(currentQuery);

  // 浏览器前进/后退或点击标签链接改变了 URL 时,在渲染期同步输入框内容
  // (React 官方推荐的 render-phase state adjustment,避免多余的 effect)
  if (currentQuery !== syncedQuery) {
    setSyncedQuery(currentQuery);
    setValue(currentQuery);
  }

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
      }}
    >
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索插件、风格或标签…"
        aria-label="搜索插件"
        className="h-9 rounded-full bg-muted/60 pl-9 pr-8 text-sm"
      />
      {value ? (
        <button
          type="button"
          aria-label="清空搜索"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            setValue("");
            if (currentQuery) router.push("/");
          }}
        >
          <FontAwesomeIcon icon={faXmark} className="size-4" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}
