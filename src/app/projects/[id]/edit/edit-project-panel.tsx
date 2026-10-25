import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { EditProjectForm } from "./edit-project-form";

type Params = Promise<{ id: string }>;

/** 编辑项目主体:校验登录与所有权,加载插件行后渲染表单 */
export async function EditProjectPanel({ params }: { params: Params }) {
  const user = await requireUser("/projects");
  const { id } = await params;
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">编辑项目</h1>
        <div className="rounded-2xl border bg-card/70 p-8 text-center">
          <FontAwesomeIcon
            icon={faCircleQuestion}
            className="size-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 text-sm text-muted-foreground">
            站点未配置数据库,暂时无法编辑项目。
          </p>
        </div>
      </div>
    );
  }

  const { data: row } = await supabase
    .from("plugins")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // 不存在或不是当前用户的项目一律按 404 处理,不泄露存在性
  if (!row || row.owner_id !== user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">编辑项目</h1>
      <EditProjectForm plugin={row} />
    </div>
  );
}
