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

/**
 * 插件记录的数据来源,仅用于内部管道:
 * - "registry":来自某个 GitHub 仓库的 registry.json(如 huyangpahuo/Viora-plugins,
 *   它只是众多来源中的一个独立个体,没有任何特殊地位)
 * - "site":作者在站点发布的项目,记录在数据库
 * UI 一律平等展示,不区分、不标记来源。
 */
export type PluginSource = "registry" | "site";

/** 单个插件的规范化记录。pluginId 是稳定业务标识,不允许用显示名代替。 */
export type PluginRecord = {
  pluginId: string;
  presetId?: string;
  name: LocalizedText;
  author?: string;
  /** 原始分类代码,例如 "Style.Cat.Anime" */
  category?: string;
  version?: string;
  /**
   * registry 来源:该来源仓库内的安装包相对路径,例如 "packages/xxx.zip";
   * site 来源:不使用(下载走 downloadUrl)
   */
  package: string;
  /** site 来源:安装包直链,仅允许 github.com 域名,入库时由服务端拼接 */
  downloadUrl?: string;
  /** 插件作者的仓库地址 */
  repository?: string;
  tags?: string[];
  description?: LocalizedText;
  source: PluginSource;
  /** site 来源:发布者信息(registry 来源的作者只有 author 显示名) */
  owner?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
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
  /** 解析 registry 来源时跳过的无效条目数 */
  skipped: number;
  /** registry 来源的目录状态(remote=在线拉取;snapshot=回退快照) */
  source: CatalogSource;
  /** 其中来自站点数据库的插件数量(未配置 Supabase 时为 0) */
  sitePluginCount: number;
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
