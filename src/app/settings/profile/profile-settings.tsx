import { requireUser, getCurrentProfile } from "@/features/auth/session";
import { ProfileForm } from "./profile-form";
import { GithubLinkCard } from "./github-link-card";
import { DangerZone } from "./danger-zone";

type SearchParams = Promise<{ github?: string | string[] }>;

/**
 * 设置页主体:requireUser 未登录时会 redirect 到登录页。
 * searchParams / 会话读取都在外层 <Suspense> 内,符合 cacheComponents 约束。
 */
export async function ProfileSettings({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser("/settings/profile");
  const profile = await getCurrentProfile();
  const { github } = await searchParams;
  const githubStatus = Array.isArray(github) ? github[0] : github;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">账号设置</h1>

      {githubStatus ? <GithubStatusNotice status={githubStatus} /> : null}

      <ProfileForm profile={profile} />
      <GithubLinkCard profile={profile} />
      <DangerZone username={profile?.username ?? null} />
    </div>
  );
}

/** GitHub 关联回跳后的状态提示条(来自 /api/auth/github/link 的回跳参数) */
function GithubStatusNotice({ status }: { status: string }) {
  const messages: Record<string, { tone: "success" | "error"; text: string }> = {
    linked: { tone: "success", text: "GitHub 账号已成功关联。" },
    error: { tone: "error", text: "GitHub 关联失败,请重试。" },
    state_error: { tone: "error", text: "关联会话已过期,请重新操作。" },
    not_configured: {
      tone: "error",
      text: "站点未配置 GitHub 关联(需要环境变量)。",
    },
  };
  const notice = messages[status];
  if (!notice) return null;

  if (notice.tone === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground"
      >
        {notice.text}
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {notice.text}
    </div>
  );
}
