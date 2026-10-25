import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { RailUser } from "@/components/rail-user";
import { SearchBar } from "@/components/search-bar";
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

/* 展示性字体:仅品牌标与页面大标题使用,拉丁子集,中文自然回退系统黑体 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
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

/* 与 globals.css 的 --background 保持一致,浏览器地址栏颜色跟随画布 */
export const viewport: Viewport = {
  themeColor: "#0a0b0e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      // suppressHydrationWarning:Dark Reader / 沉浸翻译等浏览器插件会往 <html>
      // 注入属性,开发模式会误报 hydration 错误;只抑制这一层的属性差异
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body
        // 同上:部分插件(如划词翻译类)会往 <body> 注入 data-* 属性
        suppressHydrationWarning
        className="bg-background text-foreground"
      >
        <AppShell
          searchSlot={
            // SearchBar 读取 URL 查询参数,预渲染时先出骨架,水合后填充当前关键词
            <Suspense
              fallback={<div aria-hidden className="h-10 w-full rounded-full bg-muted/60" />}
            >
              <SearchBar />
            </Suspense>
          }
          railUserSlot={
            <Suspense
              fallback={<div aria-hidden className="size-8 animate-pulse rounded-full bg-muted" />}
            >
              <RailUser />
            </Suspense>
          }
        >
          {children}
        </AppShell>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
