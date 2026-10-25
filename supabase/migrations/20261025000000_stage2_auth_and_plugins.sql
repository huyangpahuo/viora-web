-- ============================================================
-- Viora Plugins 阶段二:账户、社区插件目录、GitHub 关联
--
-- 设计要点(与 plan/04-数据库设计.md、05-认证权限与安全.md 对齐):
-- 1. profiles 与 auth.users 一一对应,由触发器自动创建,用户不能自设权限。
-- 2. plugins(社区插件)通过稳定的 plugin_id 逻辑关联,不与 GitHub 目录建外键。
--    官方条目(builtin.*)仍以 registry.json 为权威,不进数据库。
-- 3. github_identities 存储创建仓库所需的 OAuth 令牌(应用层 AES-256-GCM 加密),
--    对 anon / authenticated 全部拒绝访问,仅服务端以 service role 读写。
-- 4. 所有表启用 RLS;权限按"默认拒绝,按需开放"配置。
-- ============================================================

-- ---------- 通用:updated_at 自动更新 ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  github_login text,
  github_avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_-]{3,20}$')
);

comment on table public.profiles is '用户公开资料,id 与 auth.users 一致';
comment on column public.profiles.github_login is '关联的 GitHub 登录名(展示用);令牌保存在 github_identities,不落在这里';

alter table public.profiles enable row level security;

create policy "profiles:所有人可读"
  on public.profiles for select
  using (true);

create policy "profiles:仅本人可更新"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 插入与删除只允许数据库触发器 / 服务端完成
revoke insert, delete on public.profiles from anon, authenticated;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 新用户注册 → 自动创建资料行。
-- username 取注册时提交的 meta,冲突时追加序号兜底(应用层会先行查重)。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  slug text;
  n integer := 0;
begin
  base := lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(coalesce(new.email, 'user'), '@', 1)
  ));
  base := regexp_replace(base, '[^a-z0-9_-]', '-', 'g');
  base := regexp_replace(base, '^[-_]+|[-_]+$', '');
  if length(base) < 3 then
    base := 'user-' || base;
  end if;
  if length(base) > 20 then
    base := left(base, 20);
  end if;

  slug := base;
  while exists (select 1 from public.profiles where username = slug) loop
    n := n + 1;
    slug := left(base, 20 - length('-' || n::text)) || '-' || n;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    slug,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'username', '')
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- plugins(社区插件) ----------
create table public.plugins (
  id uuid primary key default gen_random_uuid(),
  plugin_id text not null unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name_zh text not null,
  name_en text,
  description_zh text,
  description_en text,
  category text not null,
  tags text[] not null default '{}',
  version text not null,
  repo_full_name text not null,
  repo_url text not null,
  repo_branch text not null default 'main',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- pluginId 采用官方 README 的社区格式 <作者>.<插件>;保留 builtin.* 给官方条目
  constraint plugin_id_format check (plugin_id ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]\.[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  constraint plugin_id_not_builtin check (plugin_id not like 'builtin.%'),
  constraint repo_url_host check (repo_url like 'https://github.com/%'),
  constraint version_format check (version ~ '^\d+\.\d+\.\d+$'),
  constraint status_allowed check (status in ('published', 'hidden')),
  constraint tags_size check (cardinality(tags) <= 3),
  constraint name_zh_len check (char_length(name_zh) between 1 and 60),
  constraint description_zh_len check (description_zh is null or char_length(description_zh) <= 500)
);

comment on table public.plugins is '社区作者发布的插件;官方 95 个 builtin 条目仍以 GitHub registry.json 为权威,不进此表';

create index plugins_owner_idx on public.plugins (owner_id);
create index plugins_status_created_idx on public.plugins (status, created_at desc);
create index plugins_category_idx on public.plugins (category);

alter table public.plugins enable row level security;

create policy "plugins:已发布公开可读,作者始终可读自己的"
  on public.plugins for select
  using (status = 'published' or auth.uid() = owner_id);

create policy "plugins:仅作者可插入"
  on public.plugins for insert
  with check (auth.uid() = owner_id);

create policy "plugins:仅作者可更新"
  on public.plugins for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "plugins:仅作者可删除"
  on public.plugins for delete
  using (auth.uid() = owner_id);

create trigger plugins_touch_updated_at
  before update on public.plugins
  for each row execute function public.touch_updated_at();

-- ---------- github_identities(GitHub 关联令牌) ----------
create table public.github_identities (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  github_id bigint not null unique,
  github_login text not null,
  avatar_url text,
  -- 应用层 AES-256-GCM 加密后的 OAuth 令牌(用于代用户创建仓库)
  access_token_encrypted text not null,
  scopes text,
  updated_at timestamptz not null default now()
);

comment on table public.github_identities is 'GitHub 关联令牌(加密存储);对客户端全部拒绝,仅服务端 service role 读写';

alter table public.github_identities enable row level security;

-- 不创建任何 policy,并显式回收客户端权限 → 默认拒绝
revoke all on public.github_identities from anon, authenticated;
