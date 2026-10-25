import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";

import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CommunityPluginRow } from "@/features/catalog/database-types";
import { DeleteProjectForm } from "@/components/projects/delete-project-form";
import { StatusToggleForm } from "@/components/projects/status-toggle-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * 我的项目主体:仅列出当前登录用户的插件记录。
 * Supabase 未配置时给出诚实降级,不影响公开浏览页。
 */
export async function ProjectsList() {
  const user = await requireUser("/projects");
  const supabase = await createClient();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      {/* 新建入口在左侧导航栏的"+",这里不再重复放置 */}
      <h1 className="text-2xl font-semibold tracking-tight">我的项目</h1>

      {!supabase ? (
        <div className="rounded-2xl border bg-card/70 p-8 text-center">
          <FontAwesomeIcon
            icon={faCircleQuestion}
            className="size-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 text-sm text-muted-foreground">
            站点未配置数据库,暂时无法展示项目列表。
          </p>
        </div>
      ) : (
        <ProjectsRows userId={user.id} supabase={supabase} />
      )}
    </div>
  );
}

async function ProjectsRows({
  userId,
  supabase,
}: {
  userId: string;
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
}) {
  const { data } = await supabase
    .from("plugins")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const rows: CommunityPluginRow[] = data ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border bg-card/70 px-6 py-14 text-center">
        <h2 className="text-base font-medium">还没有发布过插件</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          关联 GitHub 后新建项目,插件会自动登记到你 GitHub
          账号名下的 viora-plugins-hub 仓库并出现在画廊中。
        </p>
        <Button asChild size="sm" className="mt-5">
          <Link href="/projects/new">去发布第一个插件</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="rounded-2xl border bg-card/70 p-4 transition-colors hover:border-primary/30"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/plugins/${encodeURIComponent(row.plugin_id)}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {row.name_zh}
                </Link>
                <Badge
                  variant={row.status === "published" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {row.status === "published" ? "已发布" : "已隐藏"}
                </Badge>
                <Badge variant="outline" className="font-mono text-[10px]">
                  v{row.version}
                </Badge>
              </div>
              <p className="truncate font-mono text-xs text-muted-foreground/70">
                {row.plugin_id}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/plugins/${encodeURIComponent(row.plugin_id)}`}>
                  查看详情
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${row.id}/edit`}>编辑</Link>
              </Button>
              <StatusToggleForm pluginId={row.id} status={row.status} />
              <DeleteProjectForm pluginId={row.id} name={row.name_zh} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
