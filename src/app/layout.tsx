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
    "浏览、搜索 Viora 的风格化插件:找到喜欢的风格,查看详情并下载安装包。所有作者的插件平等收录。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      // suppressHydrationWarning:Dark Reader / 沉浸翻译等浏览器插件会往 <html>
      // 注入属性,开发模式会误报 hydration 错误;只抑制这一层的属性差异
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body
        // 同上:部分插件(如划词翻译类)会往 <body> 注入 data-* 属性
        suppressHydrationWarning
        className="flex min-h-dvh flex-col"
      >
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
        <p>Viora Plugins · 风格插件画廊</p>
        <p>插件安装包均托管在作者的 GitHub 仓库</p>
      </div>
    </footer>
  );
}
