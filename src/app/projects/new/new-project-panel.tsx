import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faLink } from "@fortawesome/free-solid-svg-icons";

import { requireUser, getCurrentProfile } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { NewProjectForm } from "./new-project-form";

/**
 * 新建项目主体:
 * - 未关联 GitHub → 整页引导卡,说明发布流程;
 * - 已关联 → 渲染新建项目表单(pluginId 预览需要 github_login)。
 */
export async function NewProjectPanel() {
  await requireUser("/projects/new");
  const profile = await getCurrentProfile();

  if (!profile?.github_login) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">新建项目</h1>
        <div className="rounded-2xl border bg-card/70 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faGithub} className="size-5" aria-hidden />
            <h2 className="text-base font-semibold">先关联 GitHub 账号</h2>
          </div>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <StepNumber>1</StepNumber>
              <span>注册并登录 Viora 账户(已完成)。</span>
            </li>
            <li className="flex gap-2.5">
              <StepNumber>2</StepNumber>
              <span>
                在账号设置中关联你的 GitHub 账号,用于托管插件仓库。
              </span>
            </li>
            <li className="flex gap-2.5">
              <StepNumber>3</StepNumber>
              <span>
                新建项目时会自动在你的 GitHub 账号下创建一个公开仓库
                viora-plugins-hub,插件的元数据与安装包都登记在该仓库,
                安装包直接从该仓库下载。
              </span>
            </li>
          </ol>
          <Button asChild className="mt-6">
            <a href="/api/auth/github/link">
              <FontAwesomeIcon icon={faLink} className="size-4" aria-hidden />
              关联 GitHub
            </a>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            已在其他页面发起了关联?
            <Link
              href="/settings/profile"
              className="ml-1 text-primary underline-offset-4 hover:underline"
            >
              前往账号设置查看
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">新建项目</h1>
      <NewProjectForm githubLogin={profile.github_login} />
    </div>
  );
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
      {children}
    </span>
  );
}
