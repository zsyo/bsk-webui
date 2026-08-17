/**
 * 书源数据结构。
 *
 * 阅读(Legado)书源是字段非常多的 JSON 对象，不同源携带的字段差异很大，
 * 因此不逐一建模，只做少数已知字段的松散约束；所有变换都以
 * `Record<string, unknown>` 为基础操作，保留未知字段原样输出。
 */
export type BookSource = Record<string, unknown>;

/** 读取书源对象上的字符串字段，非字符串（缺失、数字等）返回 undefined。 */
export function getString(source: BookSource, key: string): string | undefined {
  const v = source[key];
  return typeof v === 'string' ? v : undefined;
}

/** 按 bookSourceUrl 的域名聚合后的重复组。 */
export interface DupGroup {
  /** 分组键：URL 的 host；无法解析 URL 时为原始字符串。 */
  key: string;
  /** 该组是否因为 URL 无法解析而成立（原始 URL 缺失或非法）。 */
  invalid: boolean;
  items: BookSource[];
}
