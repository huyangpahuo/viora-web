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
