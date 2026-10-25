-- ============================================================
-- 修补:评论软删除后的可见性
--
-- 问题:UPDATE 将 deleted_at 置为非空后,新行不再满足
-- "只读未删除评论"的 SELECT 策略,PostgREST 返回更新行时
-- 触发 "new row violates row-level security policy"。
-- 修复:作者始终可读自己(含已软删除)的评论;
-- 列表查询仍显式过滤 deleted_at is null,展示不受影响。
-- ============================================================

drop policy "comments:所有人可读未删除评论" on public.plugin_comments;

create policy "comments:所有人可读未删除,作者可读自己的"
  on public.plugin_comments for select
  using (deleted_at is null or auth.uid() = user_id);
