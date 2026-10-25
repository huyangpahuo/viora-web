/**
 * 社区讨论相关数据库行类型(手写,字段与
 * supabase/migrations/20261027000000_stage4_community.sql 对齐)。
 */

export type CommunityThreadRow = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityReplyRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
