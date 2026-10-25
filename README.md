# Viora Plugins 网站

Viora 风格插件的展示画廊与社区入口(建设中)。

- **阶段一(已完成)**:公开画廊 —— 瀑布流、搜索、筛选、详情页。
- **阶段二(当前)**:账户系统 + 作者发布插件 —— 邮箱/密码与 OAuth 登录、GitHub 关联、新建项目自动创建仓库。
- **阶段三(计划)**:评分/评论/Bug 与功能建议反馈 + RLS 强化。
- **阶段四(计划)**:维护者私信(Supabase Realtime)。

设计原则:**所有作者的插件在站内一律平等展示**。站点的插件数据来自两条并列管道——
GitHub 上的 `registry.json`(如 [huyangpahuo/Viora-plugins](https://github.com/huyangpahuo/Viora-plugins),
它只是其中一个独立来源)与作者在站点发布的项目(记录在数据库,安装包托管在作者自己的
GitHub 仓库)——UI 不区分、不标记任何来源。

- 技术栈:Next.js 16(App Router + cacheComponents)· TypeScript · Tailwind CSS v4 · shadcn/ui · Font Awesome · Supabase(Auth + PostgreSQL)· Vercel 部署。

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

环境变量见 [.env.example](.env.example)。**未配置任何变量时站点可以运行**
(纯公开画廊形态,登录/发布入口显示"未配置"提示);接入账户与发布功能需要:

1. 创建 Supabase 项目 → 在 SQL Editor 执行
   [supabase/migrations/20261025000000_stage2_auth_and_plugins.sql](supabase/migrations/20261025000000_stage2_auth_and_plugins.sql)
2. 配置 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (以及服务端 `SUPABASE_SERVICE_ROLE_KEY`,用于加密读写 GitHub 令牌表)
3. Supabase → Authentication → URL Configuration:Site URL 与 Redirect URLs
   加入 `http://localhost:3000/auth/callback`(生产域名同理);如需邮箱注册,
   配置 SMTP 或使用 Supabase 内置邮件服务
4. 登录方式按需开启:Email(password)、GitHub provider、Google provider
5. 发布插件(自动创建仓库)还需:GitHub OAuth App
   (callback 填 `https://<域名>/api/auth/github/callback`)→
   配置 `GITHUB_OAUTH_CLIENT_ID/SECRET` 与 `GITHUB_TOKEN_ENCRYPTION_KEY`
   (`openssl rand -hex 32` 生成)

## 功能

### 阶段一:公开画廊
- Pinterest 风格非等高瀑布流(CSS multi-column,SSR、无布局抖动),桌面 4–5 列 / 平板 3 列 / 手机 2 列。
- 关键词搜索(名称/描述/标签/ID/分类,保留在 URL 中可分享)、分类筛选、标签筛选。
- `/plugins/[pluginId]` 详情页:以稳定的 `pluginId` 为路由键。
- 诚实的状态处理:加载骨架、无结果空状态、无效 ID 的 not-found、registry 拉取失败时回退内置快照并显示提示。

### 阶段二:账户与作者发布
- 邮箱/密码注册(带用户名、密码强度条、邮箱确认)、GitHub / Google OAuth 登录、找回密码。
- `profiles` 自动创建(数据库触发器),`/users/[username]` 公开作者主页。
- 账号设置:资料编辑、GitHub 关联(独立 OAuth App,`repo` scope,令牌 AES-256-GCM 加密存储,客户端全程不可见)。
- 新建项目:填写名称/分类/标签/介绍 → 站点在**作者自己的 GitHub 账号**下创建公开仓库
  (含 `plugin.json` 初始化)→ 插件以 `<github登录名>.<项目标识>` 的稳定 pluginId 进入目录。
- 我的插件:发布/隐藏、编辑元数据。
- 目录合并:registry 来源 + 站点来源平等合并展示,站点记录变更后缓存即时失效。

## 代码结构

```
src/
  app/                        # 路由:画廊、认证、项目发布、作者主页与状态页
  components/                 # 通用 UI(图标体系:Font Awesome)
  features/
    catalog/                  # 目录适配器:registry 拉取/校验/缓存 + 站点插件读取 + 合并
    auth/                     # 会话入口、输入校验、认证 Server Actions
    projects/                 # 发布流程校验与 Server Actions
  lib/
    supabase/                 # browser/server/admin 客户端、proxy 会话刷新
    github/                   # 关联 OAuth 与创建仓库封装
    crypto/                   # 令牌加密(AES-256-GCM)
  proxy.ts                    # Next 16 proxy:刷新 Supabase 会话 cookie
supabase/migrations/          # 数据库结构(profiles/plugins/github_identities + RLS)
```

## 安全边界

- 令牌表 `github_identities` 对所有客户端角色默认拒绝,仅服务端经 service role 读写,令牌加密落库。
- 所有写入经 Server Action 服务端校验 + 数据库 RLS 双重约束;身份校验使用 `getUser()`(服务端验证 JWT)。
- `SUPABASE_SERVICE_ROLE_KEY`、`GITHUB_OAUTH_CLIENT_SECRET`、`GITHUB_TOKEN_ENCRYPTION_KEY` 只存在
  于服务端环境变量;`.env*` 不入库。
- 不伪造预览图/评分/下载量;registry 拉取失败时展示快照并明确提示。

