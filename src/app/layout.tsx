import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Viora Plugins — 风格插件画廊",
    template: "%s · Viora Plugins",
  },
  description:
    "浏览、搜索 Viora 的风格化插件:找到喜欢的风格,查看详情并下载安装包。插件目录与 Viora 客户端插件市场同源。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>Viora Plugins · 风格插件画廊(阶段一:公开画廊)</p>
        <p>
          插件安装包均托管在作者的 GitHub 仓库
        </p>
      </div>
    </footer>
  );
}
