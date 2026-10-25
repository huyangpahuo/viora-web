"use client";

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faGoogle } from "@fortawesome/free-brands-svg-icons";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

/**
 * OAuth 登录按钮(GitHub / Google)。
 * 浏览器端 Supabase 未配置时按钮禁用并提示;signInWithOAuth
 * 失败(provider 未配置等)时用 toast 显示原始错误信息。
 */
export function OAuthButtons() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  async function signInWith(provider: "github" | "google") {
    const { error } = await supabase!.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!supabase}
          onClick={() => signInWith("github")}
        >
          <FontAwesomeIcon icon={faGithub} className="size-4" aria-hidden />
          使用 GitHub 登录
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!supabase}
          onClick={() => signInWith("google")}
        >
          <FontAwesomeIcon icon={faGoogle} className="size-4" aria-hidden />
          使用 Google 登录
        </Button>
      </div>
      {!supabase ? (
        <p className="text-center text-xs text-muted-foreground">
          站点未配置登录服务。
        </p>
      ) : null}
    </div>
  );
}
