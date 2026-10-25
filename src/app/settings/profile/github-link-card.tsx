"use client";

import { useActionState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faLink, faSpinner } from "@fortawesome/free-solid-svg-icons";

import { unlinkGithubAction } from "@/features/auth/actions";
import type { ActionState } from "@/lib/actions/state";
import { initialActionState } from "@/lib/actions/state";
import type { ProfileRow } from "@/features/catalog/database-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * GitHub 关联卡片:已关联时显示身份与解除按钮;未关联时显示引导与关联入口。
 */
export function GithubLinkCard({ profile }: { profile: ProfileRow | null }) {
  const githubLogin = profile?.github_login ?? null;

  if (!githubLogin) {
    return (
      <section className="rounded-2xl border bg-card/70 p-6">
        <h2 className="text-base font-semibold">GitHub 关联</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          关联 GitHub 后可以一键创建插件仓库并发布插件
          (新建项目会自动在你的 GitHub 账号下创建 viora-plugins 公开仓库,
          所有插件统一登记在该仓库中)。
        </p>
        <Button asChild className="mt-4">
          <a href="/api/auth/github/link">
            <FontAwesomeIcon icon={faLink} className="size-4" aria-hidden />
            关联 GitHub
          </a>
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card/70 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">GitHub 关联</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            发布插件时,安装包会托管在这个 GitHub 账号名下的仓库。
          </p>
        </div>
        <Badge variant="secondary">已关联</Badge>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        {profile?.github_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.github_avatar_url}
            alt=""
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-muted">
            <FontAwesomeIcon
              icon={faGithub}
              className="size-5 text-muted-foreground"
              aria-hidden
            />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">@{githubLogin}</p>
          <a
            href={`https://github.com/${encodeURIComponent(githubLogin)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            查看主页
          </a>
        </div>
      </div>

      <UnlinkGithubForm />
    </section>
  );
}

/** 解除关联:提交前需要确认 */
function UnlinkGithubForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    unlinkGithubAction,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="mt-4"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "确定要解除 GitHub 关联吗?解除后将无法一键创建插件仓库。",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive" disabled={isPending}>
        {isPending ? (
          <FontAwesomeIcon
            icon={faSpinner}
            className="size-4 animate-spin"
            aria-hidden
          />
        ) : null}
        解除关联
      </Button>
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
