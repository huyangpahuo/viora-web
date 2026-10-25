import "server-only";

import { commitBinaryFile, getFileSha } from "@/lib/github/repos";

/**
 * 插件安装包(zip)上传:直接提交到作者 hub 仓库的 packages/<pluginId>.zip,
 * 作者无需再手动往 GitHub 传包。上传成功后站点记录的 package_path 指向该文件,
 * 详情页下载直链即为 raw.githubusercontent.com 上的真实 zip;
 * 未上传时站点回退到仓库源码压缩包(package_path 为空)。
 */

export const PACKAGE_MAX_BYTES = 20 * 1024 * 1024;

/**
 * 类型/大小校验:通过返回 null,不通过返回中文错误。
 * 浏览器对 zip 的 MIME 不统一(Windows 常见 application/x-zip-compressed),
 * 因此以 .zip 扩展名为准。
 */
export function validatePackageFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return "安装包只支持 .zip 文件";
  }
  // 浏览器允许选中 0 字节文件:name 非空但内容为空,不能当作有效安装包提交
  if (file.size <= 0) {
    return "安装包文件是空的,请重新选择";
  }
  if (file.size > PACKAGE_MAX_BYTES) {
    return "安装包不能超过 20MB";
  }
  return null;
}

/**
 * 把 zip 安装包提交到作者仓库的 packages/<pluginId>.zip(已存在则覆盖),
 * 返回仓库内相对路径(写入站点数据库的 package_path)。
 * 校验失败或提交失败时抛出带中文信息的错误;调用方应先用
 * validatePackageFile 把可预期的校验问题映射为字段级错误。
 */
export async function uploadPackageToRepo(options: {
  file: File;
  token: string;
  /** 作者仓库 full_name,如 "someone/viora-plugins-hub" */
  fullName: string;
  branch: string;
  pluginId: string;
}): Promise<string> {
  const typeError = validatePackageFile(options.file);
  if (typeError) throw new Error(typeError);

  const path = `packages/${options.pluginId}.zip`;
  // 覆盖已有文件必须带上当前 sha;不存在则为新建
  const current = await getFileSha({
    token: options.token,
    fullName: options.fullName,
    branch: options.branch,
    path,
  });
  if (!current.ok) throw new Error(current.message);

  const base64 = Buffer.from(await options.file.arrayBuffer()).toString("base64");
  const committed = await commitBinaryFile({
    token: options.token,
    fullName: options.fullName,
    branch: options.branch,
    path,
    base64Content: base64,
    existingSha: current.sha ?? undefined,
  });
  if (!committed.ok) throw new Error(committed.message);

  return path;
}
