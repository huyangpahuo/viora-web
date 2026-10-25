/**
 * Supabase 数据库行类型(手写,字段与 supabase/migrations 对齐)。
 */

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_login: string | null;
  github_avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type GithubIdentityRow = {
  user_id: string;
  github_id: number;
  github_login: string;
  avatar_url: string | null;
  access_token_encrypted: string;
  scopes: string | null;
  updated_at: string;
};

export type CommunityPluginRow = {
  id: string;
  plugin_id: string;
  owner_id: string;
  name_zh: string;
  name_en: string | null;
  description_zh: string | null;
  description_en: string | null;
  category: string;
  tags: string[];
  version: string;
  repo_full_name: string;
  repo_url: string;
  repo_branch: string;
  preview_before_url: string | null;
  preview_after_url: string | null;
  package_path: string | null;
  status: "published" | "hidden";
  created_at: string;
  updated_at: string;
};

export type PluginCommentRow = {
  id: string;
  plugin_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PluginOwnerInfo = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};
