"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 转换前/后对比滑块(纯 CSS 裁剪 + Pointer Events,无第三方依赖):
 * - after 图铺满容器,before 图用 clip-path 裁剪,只露出左侧部分;
 * - 在容器任意位置按下并拖动即可调整分割线;
 * - 手柄支持键盘:←/→ 以 5% 步进调整(符合 role="slider" 约定);
 * - prefers-reduced-motion 下无过渡动画。
 */
export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeAlt,
  afterAlt,
  className,
}: {
  beforeUrl: string;
  afterUrl: string;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromPointer = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const percent = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, percent)));
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative touch-none select-none overflow-hidden rounded-2xl border bg-card",
        className,
      )}
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event.clientX);
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;
        updateFromPointer(event.clientX);
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      {/* 转换后:铺满 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterUrl}
        alt={afterAlt}
        draggable={false}
        className="block aspect-[16/10] h-auto w-full object-cover"
      />
      {/* 转换前:绝对定位并按位置裁剪,只露出左半部分 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt={beforeAlt}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      {/* 分隔线与手柄 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_6px_rgba(0,0,0,0.5)]"
        style={{ left: `${position}%` }}
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label="对比滑块"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`转换前可见 ${Math.round(position)}%`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setPosition((value) => Math.max(0, value - 5));
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            setPosition((value) => Math.min(100, value + 5));
          }
        }}
        className="absolute top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-white/80 bg-white/20 outline-none backdrop-blur-sm transition-transform duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/60 motion-reduce:transition-none active:scale-95"
        style={{ left: `${position}%` }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold tracking-widest text-white drop-shadow"
        >
          ↔
        </span>
      </div>

      {/* 左右上角徽标 */}
      <span
        aria-hidden
        className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white backdrop-blur-sm"
      >
        前
      </span>
      <span
        aria-hidden
        className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white backdrop-blur-sm"
      >
        后
      </span>
    </div>
  );
}
