"use client";

import { useState } from "react";

/**
 * 头部用户头像:有头像地址时显示图片,加载失败回退为首字母圆形。
 * 需要客户端状态来感知 img 的 onError,因此独立成客户端组件,
 * 服务端组件(site-header)可以直接渲染它。
 */
export function HeaderAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;

  if (showImage) {
    return (
      // 头像来自用户自填或 GitHub,域名不可枚举,使用原生 img
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="size-8 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
