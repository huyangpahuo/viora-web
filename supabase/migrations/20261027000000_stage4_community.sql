-- ============================================================
-- 阶段四:公共讨论社区
--
-- community_threads:公开讨论帖(标题 + 正文)
-- community_replies:帖子回复(一级回复,软删除)
--
-- RLS 吸取评论软删除的教训:SELECT 策略从一开始就允许
-- 作者读到自己的已删除行,避免更新返回行时触发 RLS 报错。
-- ============================================================

-- ---------- 讨论帖 ----------
create table public.community_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint thread_title_len check (char_length(title) between 1 and 120),
  constraint thread_body_len check (char_length(body) between 1 and 5000)
);

comment on table public.community_threads is '公共讨论社区的讨论帖,所有登录用户可发';

create index community_threads_created_idx
  on public.community_threads (created_at desc);

alter table public.community_threads enable row level security;

create policy "threads:所有人可读未删除,作者可读自己的"
  on public.community_threads for select
  using (deleted_at is null or auth.uid() = author_id);

create policy "threads:登录用户可发帖"
  on public.community_threads for insert
  with check (auth.uid() = author_id);

create policy "threads:仅作者可编辑或软删除"
  on public.community_threads for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

revoke delete on public.community_threads from anon, authenticated;

create trigger community_threads_touch_updated_at
  before update on public.community_threads
  for each row execute function public.touch_updated_at();

-- ---------- 帖子回复 ----------
create table public.community_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reply_body_len check (char_length(body) between 1 and 2000)
);

create index community_replies_thread_idx
  on public.community_replies (thread_id, created_at);

alter table public.community_replies enable row level security;

create policy "replies:所有人可读未删除,作者可读自己的"
  on public.community_replies for select
  using (deleted_at is null or auth.uid() = author_id);

create policy "replies:登录用户可回复"
  on public.community_replies for insert
  with check (auth.uid() = author_id);

create policy "replies:仅作者可编辑或软删除"
  on public.community_replies for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

revoke delete on public.community_replies from anon, authenticated;

create trigger community_replies_touch_updated_at
  before update on public.community_replies
  for each row execute function public.touch_updated_at();
