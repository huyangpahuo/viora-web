import Link from "next/link";

import type { CategoryInfo } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

/**
 * 分类筛选条。横向滚动,两端渐隐;选中项用 primary 高亮。
 * 点击分类进入 /categories/[slug],这样分类页可被直接分享。
 */
export function CategoryChips({
  categories,
  activeSlug,
  className,
}: {
  categories: CategoryInfo[];
  activeSlug?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="按分类筛选"
      className={cn("group relative", className)}
    >
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ChipLink href="/" active={!activeSlug}>
          全部
        </ChipLink>
        {categories.map((category) => (
          <ChipLink
            key={category.code}
            href={`/categories/${category.slug}`}
            active={activeSlug === category.slug}
          >
            {category.name.zh ?? category.code}
            <span className="ml-1.5 text-xs tabular-nums opacity-80">
              {category.count}
            </span>
          </ChipLink>
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent"
      />
    </nav>
  );
}

function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
