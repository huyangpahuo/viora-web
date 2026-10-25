import { z } from "zod";

import { makeCategoryInfo } from "@/features/catalog/categories";

/**
 * 新建/编辑项目的输入校验。
 * pluginId 由服务端根据 GitHub 用户名 + slug 拼接,用户不能自由指定完整 ID。
 */

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const versionSchema = z
  .string()
  .trim()
  .regex(/^\d+\.\d+\.\d+$/, "版本号格式为主.次.修订,例如 1.0.0");

export const categorySchema = z
  .string()
  .refine((code) => {
    try {
      return makeCategoryInfo(code, 0).slug.length > 0;
    } catch {
      return false;
    }
  }, "请选择一个有效的分类");

/** 20 个官方大类代码,新建项目表单的分类下拉直接使用 */
export const CATEGORY_CODES = [
  "Style.Cat.Anime",
  "Style.Cat.Illustration",
  "Style.Cat.OilPainting",
  "Style.Cat.Watercolor",
  "Style.Cat.Sketch",
  "Style.Cat.Printmaking",
  "Style.Cat.Pixel",
  "Style.Cat.RetroFilm",
  "Style.Cat.ThreeD",
  "Style.Cat.Cyberpunk",
  "Style.Cat.Neon",
  "Style.Cat.Handcraft",
  "Style.Cat.PaperCraft",
  "Style.Cat.Collage",
  "Style.Cat.Photography",
  "Style.Cat.GlassMosaic",
  "Style.Cat.Metallic",
  "Style.Cat.LightParticles",
  "Style.Cat.Traditional",
  "Style.Cat.Experimental",
] as const;

export const createProjectSchema = z.object({
  nameZh: z.string().trim().min(1, "请填写插件名称").max(60, "名称最多 60 个字符"),
  nameEn: z.string().trim().max(60, "英文名最多 60 个字符").optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_PATTERN, "项目标识只能包含小写字母、数字和短横线,长度 3-40,以字母或数字结尾"),
  descriptionZh: z
    .string()
    .trim()
    .min(1, "请填写插件介绍")
    .max(500, "介绍最多 500 个字符"),
  descriptionEn: z.string().trim().max(500, "英文介绍最多 500 个字符").optional().or(z.literal("")),
  category: categorySchema,
  tags: z.array(z.string().trim().min(1).max(20, "单个标签最多 20 个字符")).max(3, "最多 3 个标签"),
  version: versionSchema,
});

export const updateProjectSchema = z.object({
  pluginId: z.string().trim().min(1),
  nameZh: z.string().trim().min(1, "请填写插件名称").max(60, "名称最多 60 个字符"),
  nameEn: z.string().trim().max(60, "英文名最多 60 个字符").optional().or(z.literal("")),
  descriptionZh: z.string().trim().min(1, "请填写插件介绍").max(500, "介绍最多 500 个字符"),
  descriptionEn: z.string().trim().max(500, "英文介绍最多 500 个字符").optional().or(z.literal("")),
  category: categorySchema,
  tags: z.array(z.string().trim().min(1).max(20)).max(3, "最多 3 个标签"),
  version: versionSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** 由任意名称生成 slug 建议:非 ASCII 全部丢弃,空结果返回 null 由用户自填 */
export function suggestSlug(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return SLUG_PATTERN.test(slug) ? slug : null;
}
