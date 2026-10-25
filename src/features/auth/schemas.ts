import { z } from "zod";

/**
 * 认证与资料输入的校验 schema。
 * 前端校验只为体验,服务端(Server Action)必须再用这些 schema 校验一次。
 */

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "login",
  "logout",
  "signup",
  "settings",
  "account",
  "projects",
  "plugins",
  "categories",
  "users",
  "messages",
  "help",
  "support",
  "security",
  "official",
  "team",
  "viora",
  "root",
  "system",
  "moderator",
  "mod",
  "null",
  "undefined",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "用户名至少 3 个字符")
  .max(20, "用户名最多 20 个字符")
  .regex(/^[a-z0-9_-]+$/, "用户名只能包含小写字母、数字、下划线和短横线")
  .refine((value) => !RESERVED_USERNAMES.has(value), "该用户名被保留,请换一个");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("请输入有效的邮箱地址")
  .max(254, "邮箱长度超出限制");

export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .max(72, "密码最多 72 位");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "请输入密码"),
});

export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .max(30, "显示名最多 30 个字符")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().max(200, "简介最多 200 个字符").optional().or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .url("头像地址必须是合法 URL")
    .max(500)
    .optional()
    .or(z.literal("")),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** 把 zod 错误展开成"字段名 → 第一条错误"的简单结构,供表单显示 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}
