/**
 * Server Action 与 useActionState 约定的通用状态形状。
 * 所有表单 action 返回可序列化的普通对象;成功后的页面跳转
 * 由 action 内部 redirect() 完成,不走 state。
 */
export type ActionState = {
  /** 是否成功(用于无跳转的成功提示) */
  ok?: boolean;
  /** 顶部错误信息(已映射为中文) */
  error?: string;
  /** 字段级错误,键为表单字段名 */
  fieldErrors?: Record<string, string>;
  /** 注册后等待邮箱确认 */
  needsConfirmation?: boolean;
  /** 附带信息(如已提交的邮箱、成功提示文案) */
  email?: string;
  message?: string;
};

export const initialActionState: ActionState = {};
