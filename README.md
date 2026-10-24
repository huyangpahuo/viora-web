# Viora Plugins 网站

Viora 风格插件的展示画廊与社区入口(建设中)。当前完成**阶段一:公开画廊**。

- 插件目录权威数据源:[huyangpahuo/Viora-plugins](https://github.com/huyangpahuo/Viora-plugins) 的 `registry.json`,网站不复制目录到数据库。
- 技术栈:Next.js 16(App Router + cacheComponents)· TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase(阶段二接入)· Vercel 部署。

## 本地运行

```bash
npm install
npm run dev        # http://localhost:3000
```

其他命令:

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # 生产构建
npm start           # 运行生产构建
```

环境变量见 [.env.example](.env.example)。阶段一无需任何必填变量即可运行;
`NEXT_PUBLIC_DEMO_PREVIEWS=true` 可开启演示预览模式(见下)。

## 功能(阶段一)

- 首页 Pinterest 风格非等高瀑布流(CSS multi-column,SSR、无布局抖动),桌面 4–5 列 / 平板 3 列 / 手机 2 列。
- 关键词搜索(名称/描述/标签/ID/分类,保留在 URL 中可分享)、分类筛选、标签筛选。
- `/plugins/[pluginId]` 详情页:以稳定的 `pluginId` 为路由键,展示名称、作者、分类、版本、标签、介绍与下载入口。
- 安装包下载地址只接受仓库内 `packages/*.zip` 路径,与客户端市场同源;不改动任何 ZIP 与 pluginId。
- 诚实的状态处理:加载骨架、无结果空状态、无效 ID 的 not-found、GitHub 拉取失败时回退内置快照并显示提示。

## 关于预览图

当前 registry 中**没有任何真实预览图字段**,因此默认情况下卡片显示按分类着色的占位色块,
不使用任何冒充插件效果的图片。

开发时如需验证"变高瀑布流"的真实观感,可设置 `NEXT_PUBLIC_DEMO_PREVIEWS=true`
启用演示预览模式:把 `public/demo-previews/` 中的本地测试图按 pluginId 稳定映射为卡片预览。
该模式会在页面顶部显示显著横幅,图片**不是插件的真实效果**,生产环境必须保持关闭。

## 代码结构

```
src/
  app/                        # 路由:首页、分类页、插件详情页与各类状态页
  components/                 # 通用 UI:头部、搜索、卡片、瀑布流、空状态等
  features/catalog/           # 目录适配器:拉取、校验、缓存、搜索、分类映射
    adapter.ts                #   use cache + cacheLife 的注册表读取与解析
    queries.ts                #   页面统一使用的查询入口
    fallback-registry.json    #   受版本管理的目录快照(GitHub 不可用时的回退)
    demo-previews.json        #   演示预览图清单
  lib/                        # cn 等工具
```

## 阶段规划

1. **阶段一(当前)**:公开画廊 —— 瀑布流、搜索、筛选、详情页。
2. **阶段二**:Supabase Auth(GitHub OAuth)+ 评分/评论/Bug 与功能建议反馈 + RLS。
3. **阶段三**:维护者私信(Supabase Realtime),RLS 强制参与者隔离。

详细规划文档见项目本地 `plan/` 目录(不入库)。
