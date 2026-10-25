-- ============================================================
-- 阶段四第二批:点赞、收藏、关注
--
-- 设计要点:
-- - 点赞/收藏按 (user_id, plugin_id) 唯一,取消即硬删除(开关语义);
-- - 关注按 (follower_id, followed_id) 唯一,禁止自关注;
-- - 计数一律由真实行聚合得出,前端不得虚构;
-- - plugin_id 与目录逻辑关联(无外键),插件删除后其点赞/收藏行
--   成为孤儿但不可达,与评论同一处理口径。
-- ============================================================

-- ---------- 点赞 ----------
create table public.plugin_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  plugin_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, plugin_id)
);

comment on table public.plugin_likes is '插件点赞;计数由真实行聚合';

create index plugin_likes_plugin_idx on public.plugin_likes (plugin_id);
create index plugin_likes_user_created_idx on public.plugin_likes (user_id, created_at desc);

alter table public.plugin_likes enable row level security;

create policy "likes:所有人可读" on public.plugin_likes for select using (true);
create policy "likes:登录用户可点赞" on public.plugin_likes for insert with check (auth.uid() = user_id);
create policy "likes:本人可取消" on public.plugin_likes for delete using (auth.uid() = user_id);

-- ---------- 收藏 ----------
create table public.plugin_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  plugin_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, plugin_id)
);

comment on table public.plugin_favorites is '插件收藏;个人收藏列表与热度统计的数据源';

create index plugin_favorites_plugin_idx on public.plugin_favorites (plugin_id);
create index plugin_favorites_user_created_idx on public.plugin_favorites (user_id, created_at desc);

alter table public.plugin_favorites enable row level security;

create policy "favorites:所有人可读" on public.plugin_favorites for select using (true);
create policy "favorites:登录用户可收藏" on public.plugin_favorites for insert with check (auth.uid() = user_id);
create policy "favorites:本人可取消" on public.plugin_favorites for delete using (auth.uid() = user_id);

-- ---------- 关注 ----------
create table public.user_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint no_self_follow check (follower_id <> followed_id)
);

comment on table public.user_follows is '作者关注关系;粉丝数/关注数由真实行聚合';

create index user_follows_followed_idx on public.user_follows (followed_id);
create index user_follows_follower_created_idx on public.user_follows (follower_id, created_at desc);

alter table public.user_follows enable row level security;

create policy "follows:所有人可读" on public.user_follows for select using (true);
create policy "follows:登录用户可关注" on public.user_follows for insert with check (auth.uid() = follower_id);
create policy "follows:本人可取关" on public.user_follows for delete using (auth.uid() = follower_id);
