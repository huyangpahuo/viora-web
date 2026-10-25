/**
 * 点赞/收藏/关注三张表的行类型(手写,与
 * supabase/migrations/20261028000000_stage4_likes_favorites_follows.sql 对齐)。
 */

export type PluginLikeRow = {
  user_id: string;
  plugin_id: string;
  created_at: string;
};

export type PluginFavoriteRow = {
  user_id: string;
  plugin_id: string;
  created_at: string;
};

export type UserFollowRow = {
  follower_id: string;
  followed_id: string;
  created_at: string;
};
