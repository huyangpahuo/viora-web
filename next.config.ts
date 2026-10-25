import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  experimental: {
    serverActions: {
      // 发布表单经 Server Action 上传:两张预览图 + 打包 zip(≤20MB),
      // 留足 multipart 边界与字段的额外开销
      bodySizeLimit: "32mb",
    },
  },
  images: {
    remotePatterns: [
      // 社区插件预览图:作者 hub 仓库的 raw 直链
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      // 改造前上传到 Supabase Storage 的存量预览图
      ...process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [{
            protocol: "https",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
          }]
        : [],
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
