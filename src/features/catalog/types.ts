/**
 * 插件目录类型定义。
 *
 * 权威数据源是 GitHub 仓库 huyangpahuo/Viora-plugins 的 registry.json,
 * 这里的类型描述的是"经过解析校验后"的内部模型;原始 JSON 的字段
 * 以解析器为准,可能缺失或格式异常,不能假设全部存在。
 */

export type LocalizedText = {
  zh?: string;
  en?: string;
};

/** 单个插件的规范化记录。pluginId 是稳定业务标识,不允许用显示名代替。 */
export type PluginRecord = {
  pluginId: string;
  presetId?: string;
  name: LocalizedText;
  author?: string;
  /** 原始分类代码,例如 "Style.Cat.Anime" */
  category?: string;
  version?: string;
  /** 仓库内安装包相对路径,例如 "packages/builtin.viora.xxx.zip" */
  package: string;
  /** 插件作者自己的仓库地址(可选,当前目录中没有) */
  repository?: string;
  tags?: string[];
  description?: LocalizedText;
};

export type CatalogMeta = {
  version?: number;
  updated?: string;
  declaredCount?: number;
};

/** 目录整体来源,用于在 GitHub 不可用时向用户诚实提示 */
export type CatalogSource = "remote" | "snapshot";

export type PluginCatalog = {
  meta: CatalogMeta;
  plugins: PluginRecord[];
  /** 解析时跳过的无效条目数 */
  skipped: number;
  source: CatalogSource;
};

export type CategoryInfo = {
  /** 原始分类代码,例如 "Style.Cat.Anime" */
  code: string;
  /** URL 用的稳定短横线标识,例如 "anime" */
  slug: string;
  name: LocalizedText;
  count: number;
};

export type SearchFilters = {
  q?: string;
  categorySlug?: string;
  tag?: string;
};
