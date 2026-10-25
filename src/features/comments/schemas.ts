import { z } from "zod";

/**
 * 评论输入校验。
 * parentId 是 plugin_comments 的 uuid 主键;空串表示一级评论。
 */
export const createCommentSchema = z.object({
  pluginId: z.string().trim().min(1, "插件标识缺失"),
  parentId: z.string().trim().uuid("回复目标无效").optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(1, "评论内容不能为空")
    .max(1000, "评论最多 1000 字"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
