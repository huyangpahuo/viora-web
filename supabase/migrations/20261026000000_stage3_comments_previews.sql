-- ============================================================
-- 阶段三(第一批):评论系统 + 转换前/后预览图 + 单仓库发布
--
-- 1. plugin_comments:每个插件下的评论与一级回复,软删除。
-- 2. plugins 增加 before/after 预览图 URL(存 Supabase Storage 公开链接)
--    与作者仓库内的安装包路径(作者后续自行上传 zip)。
-- 3. 启用 Storage 桶 plugin-previews:公开可读,登录用户只能写自己
--    用户 ID 命名的目录。
-- ============================================================

-- ---------- 评论区 ----------
create table public.plugin_comments (
  id uuid primary key default gen_random_uuid(),
  plugin_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.plugin_comments (id) on delete cascade,
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_body_len check (char_length(body) between 1 and 1000)
);

comment on table public.plugin_comments is '插件评论;parent_id 非空为一级回复,必须与父评论同插件(应用层校验)';

create index plugin_comments_plugin_created_idx
  on public.plugin_comments (plugin_id, created_at);
create index plugin_comments_parent_idx
  on public.plugin_comments (parent_id);

alter table public.plugin_comments enable row level security;

create policy "comments:所有人可读未删除评论"
  on public.plugin_comments for select
  using (deleted_at is null);

create policy "comments:登录用户可发表"
  on public.plugin_comments for insert
  with check (auth.uid() = user_id);

-- 编辑与软删除都是 update:只能改自己的行
create policy "comments:仅本人可编辑或软删除"
  on public.plugin_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke delete on public.plugin_comments from anon, authenticated;

create trigger plugin_comments_touch_updated_at
  before update on public.plugin_comments
  for each row execute function public.touch_updated_at();

-- ---------- 插件预览图与安装包路径 ----------
alter table public.plugins
  add column preview_before_url text,
  add column preview_after_url text,
  add column package_path text;

comment on column public.plugins.preview_before_url is '转换前效果图的公开 URL(Supabase Storage)';
comment on column public.plugins.preview_after_url is '转换后效果图的公开 URL(Supabase Storage)';
comment on column public.plugins.package_path is '作者仓库内的安装包相对路径,如 packages/<pluginId>.zip;由作者上传后生效';

alter table public.plugins
  add constraint plugins_preview_before_host
    check (preview_before_url is null or preview_before_url like 'https://%'),
  add constraint plugins_preview_after_host
    check (preview_after_url is null or preview_after_url like 'https://%'),
  add constraint plugins_package_path_format
    check (package_path is null or package_path ~ '^packages/[A-Za-z0-9][A-Za-z0-9._-]*\.zip$');

-- ---------- Storage:插件预览图桶 ----------
insert into storage.buckets (id, name, public)
values ('plugin-previews', 'plugin-previews', true)
on conflict (id) do nothing;

create policy "预览图:所有人可读"
  on storage.objects for select
  using (bucket_id = 'plugin-previews');

create policy "预览图:登录用户可上传到自己目录"
  on storage.objects for insert
  with check (
    bucket_id = 'plugin-previews'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "预览图:本人可更新自己目录"
  on storage.objects for update
  using (
    bucket_id = 'plugin-previews'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "预览图:本人可删除自己目录"
  on storage.objects for delete
  using (
    bucket_id = 'plugin-previews'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
