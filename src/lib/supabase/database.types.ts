import type {
  CommunityPluginRow,
  GithubIdentityRow,
  PluginCommentRow,
  ProfileRow,
} from "@/features/catalog/database-types";
import type {
  CommunityReplyRow,
  CommunityThreadRow,
} from "@/features/community/database-types";

/**
 * 手写的最小数据库类型。
 *
 * 阶段二只用到三张表;等表结构稳定后可以改用 supabase cli 的
 * `supabase gen types typescript` 生成完整类型替换这里。
 *
 * 注意:supabase-js v2.118+ 要求 Schema 满足 GenericSchema
 * (Tables/Views/Functions 三者缺一不可,表还必须带 Relationships),
 * 否则 from() 的结果类型会整体退化为 never。这里按官方生成类型的
 * 最小形状补齐了这些空壳字段。
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; username: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      github_identities: {
        Row: GithubIdentityRow;
        Insert: GithubIdentityRow;
        Update: Partial<GithubIdentityRow>;
        Relationships: [];
      };
      plugins: {
        Row: CommunityPluginRow;
        Insert: Omit<CommunityPluginRow, "id" | "created_at" | "updated_at" | "status"> &
          { id?: string; status?: CommunityPluginRow["status"] };
        Update: Partial<CommunityPluginRow>;
        Relationships: [];
      };
      plugin_comments: {
        Row: PluginCommentRow;
        Insert: {
          plugin_id: string;
          user_id: string;
          parent_id?: string | null;
          body: string;
        };
        Update: Partial<Pick<PluginCommentRow, "body" | "deleted_at" | "parent_id">>;
        Relationships: [];
      };
      community_threads: {
        Row: CommunityThreadRow;
        Insert: {
          author_id: string;
          title: string;
          body: string;
        };
        Update: Partial<Pick<CommunityThreadRow, "title" | "body" | "deleted_at">>;
        Relationships: [];
      };
      community_replies: {
        Row: CommunityReplyRow;
        Insert: {
          thread_id: string;
          author_id: string;
          body: string;
        };
        Update: Partial<Pick<CommunityReplyRow, "body" | "deleted_at">>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};
