import type { CategoryInfo } from "./types";

/**
 * 官方 20 个大类。中文名来自 Viora-plugins 仓库 README 的官方定义,
 * slug 是网站自己的稳定 URL 标识,与分类代码互相独立。
 *
 * registry 中出现不在此表的新分类时,queries 会按代码自动生成
 * slug 与显示名兜底,保证未来新增分类不会渲染失败。
 */
const OFFICIAL_CATEGORY_CODES = [
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

const OFFICIAL_CATEGORY_NAMES: Record<string, { zh: string; en: string }> = {
  "Style.Cat.Anime": { zh: "动漫", en: "Anime" },
  "Style.Cat.Illustration": { zh: "插画", en: "Illustration" },
  "Style.Cat.OilPainting": { zh: "油画", en: "Oil Painting" },
  "Style.Cat.Watercolor": { zh: "水彩", en: "Watercolor" },
  "Style.Cat.Sketch": { zh: "素描", en: "Sketch" },
  "Style.Cat.Printmaking": { zh: "版画", en: "Printmaking" },
  "Style.Cat.Pixel": { zh: "像素艺术", en: "Pixel Art" },
  "Style.Cat.RetroFilm": { zh: "复古胶片", en: "Retro Film" },
  "Style.Cat.ThreeD": { zh: "3D 立体", en: "3D" },
  "Style.Cat.Cyberpunk": { zh: "赛博朋克", en: "Cyberpunk" },
  "Style.Cat.Neon": { zh: "霓虹灯光", en: "Neon" },
  "Style.Cat.Handcraft": { zh: "手工艺", en: "Handcraft" },
  "Style.Cat.PaperCraft": { zh: "纸艺纸雕", en: "Paper Craft" },
  "Style.Cat.Collage": { zh: "拼贴混合", en: "Collage" },
  "Style.Cat.Photography": { zh: "摄影暗房", en: "Photography" },
  "Style.Cat.GlassMosaic": { zh: "玻璃马赛克", en: "Glass Mosaic" },
  "Style.Cat.Metallic": { zh: "金属质感", en: "Metallic" },
  "Style.Cat.LightParticles": { zh: "光影粒子", en: "Light Particles" },
  "Style.Cat.Traditional": { zh: "国风传统", en: "Traditional" },
  "Style.Cat.Experimental": { zh: "实验创意", en: "Experimental" },
};

/** "Style.Cat.OilPainting" -> "oil-painting" */
export function categoryCodeToSlug(code: string): string {
  const suffix = code.includes(".") ? code.slice(code.lastIndexOf(".") + 1) : code;
  return suffix
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 未知分类的兜底显示名:直接用代码末段 */
export function categoryCodeFallbackName(code: string): { zh: string; en: string } {
  const suffix = code.includes(".") ? code.slice(code.lastIndexOf(".") + 1) : code;
  const spaced = suffix.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return { zh: spaced, en: spaced };
}

export function makeCategoryInfo(code: string, count: number): CategoryInfo {
  const names = OFFICIAL_CATEGORY_NAMES[code] ?? categoryCodeFallbackName(code);
  return {
    code,
    slug: categoryCodeToSlug(code),
    name: { zh: names.zh, en: names.en },
    count,
  };
}

/** 官方分类按 README 顺序排列,未收录的分类排在后面 */
export function sortCategories(categories: CategoryInfo[]): CategoryInfo[] {
  const officialIndex = new Map<string, number>(
    OFFICIAL_CATEGORY_CODES.map((code, i) => [code, i]),
  );
  return [...categories].sort((a, b) => {
    const ia = officialIndex.get(a.code) ?? Number.MAX_SAFE_INTEGER;
    const ib = officialIndex.get(b.code) ?? Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return a.code.localeCompare(b.code);
  });
}
