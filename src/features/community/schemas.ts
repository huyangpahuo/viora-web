import { z } from "zod";

/**
 * 社区讨论输入校验。长度上限与迁移文件中的
 * thread_title_len / thread_body_len / reply_body_len 约束一致。
 */
export const createThreadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "标题不能为空")
    .max(120, "标题最多 120 字"),
  body: z
    .string()
    .trim()
    .min(1, "正文不能为空")
    .max(5000, "正文最多 5000 字"),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const createReplySchema = z.object({
  threadId: z.string().trim().uuid("讨论不存在"),
  body: z
    .string()
    .trim()
    .min(1, "回复内容不能为空")
    .max(2000, "回复最多 2000 字"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
