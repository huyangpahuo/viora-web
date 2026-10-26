"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 画廊预览图的客户端包装(Pinterest 式懒加载):
 *
 * - 非首屏图 `loading="lazy"` + `decoding="async"`,进入视口附近才开始加载;
 * - 加载期间由父容器(或 fallback)显示与分类色相相关的暗色占位块,
 *   宽高比在布局时已锁定,不产生布局抖动;
 * - `onLoad` 后 opacity 0→1 淡入(约 250ms);加载失败时显示 fallback 占位;
 * - 首屏图传 `preload`(Next.js 16 中 priority 已由 preload 取代):
 *   立即加载且不做淡入,避免首屏出现"从占位块渐显"的延迟感。
 */
export function PreviewImage({
  alt,
  className,
  preload = false,
  fallback = null,
  ...props
}: Omit<ImageProps, "priority"> & {
  /** 首屏关键图:预加载且跳过淡入 */
  preload?: boolean;
  /** 加载失败时渲染的占位(如 PreviewPlaceholder);不传则露出父容器的暗色底 */
  fallback?: React.ReactNode;
}) {
  // 预加载图直接可见;懒加载图等 onLoad(或 ref 时已完成)再淡入
  const [loaded, setLoaded] = useState(preload);
  const [failed, setFailed] = useState(false);

  // 图片可能在水合前就已完成(缓存命中):ref 回调里补一次状态,防止永远透明
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  if (failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      ref={imgRef}
      alt={alt}
      // next/image 会给 <img> 输出 style="color:transparent";
      // Dark Reader 等扩展会往这行内样式注入 --darkreader-* 变量,
      // 造成属性不匹配的假警报。只抑制该元素自身的属性差异。
      suppressHydrationWarning
      // 预加载图用 eager + preload;其余显式声明 lazy + async
      loading={preload ? "eager" : "lazy"}
      decoding="async"
      preload={preload || undefined}
      className={cn(
        // opacity 负责淡入;transform 留给调用方的 group-hover 缩放
        "transition-[opacity,transform] duration-250 ease-out",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      {...props}
    />
  );
}
