/**
 * 书源批量编辑的核心变换，自 Go CLI 版 bsk-go 移植。
 *
 * 全部为纯函数：不改写入参，返回新数组/新对象，便于 React 状态管理与测试。
 * 与 Go 版的有意差异（输出顺序稳定、无效 URL 条目不丢弃等）见 README。
 */
import emojiRegex from 'emoji-regex';
import type { BookSource, DupGroup } from './types';
import { getString } from './types';

export const DEFAULT_AUTHOR = 'Zephyr';

/** YYMMDD 格式日期，对应 Go 版 time.Format("060102")。 */
export function formatDate(d: Date): string {
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** 解析作者名：空白视为未填写，回退默认值。 */
export function buildGroup(author: string, now: Date): string {
  const name = author.trim() === '' ? DEFAULT_AUTHOR : author.trim();
  return `${name}@${formatDate(now)}`;
}

/** 统一设置 bookSourceGroup 为「作者@YYMMDD」。 */
export function clearGroups(data: BookSource[], author: string, now: Date): BookSource[] {
  const group = buildGroup(author, now);
  return data.map((s) => ({ ...s, bookSourceGroup: group }));
}

/** 去除名称首尾的指定符号，每个符号前后各最多剥一层（与 Go TrimPrefix/TrimSuffix 一致）。 */
function trimSymbolOnce(name: string, symbol: string): string {
  if (symbol === '') return name;
  let n = name;
  if (n.startsWith(symbol)) n = n.slice(symbol.length);
  if (n.endsWith(symbol)) n = n.slice(0, -symbol.length);
  return n;
}

/**
 * 按码点比较字符串，等价于 Go 字符串（UTF-8 字节序）比较；
 * JS 默认按 UTF-16 码元比较，对增补平面字符（Emoji 等）顺序不同。
 */
export function compareNames(a: string, b: string): number {
  if (a === b) return 0;
  const ai = Array.from(a);
  const bi = Array.from(b);
  const len = Math.min(ai.length, bi.length);
  for (let i = 0; i < len; i++) {
    const ca = ai[i]!.codePointAt(0)!;
    const cb = bi[i]!.codePointAt(0)!;
    if (ca !== cb) return ca - cb;
  }
  return ai.length - bi.length;
}

export interface NameChange {
  /** 排序后输出数组中的序号。 */
  index: number;
  before: string;
  after: string;
  changed: boolean;
}

export interface ClearNameResult {
  data: BookSource[];
  /** 处理前后对照，顺序与 data 一致（按名称排序后）。 */
  changes: NameChange[];
  /** 处理后的全部名称（names.txt 内容，每行一个）。 */
  names: string[];
}

/**
 * 规范化书源名称：去首尾符号 → 移除 Emoji → 去除所有 #数字 → 修剪空白，
 * 重名自动追加「 #N」编号（第二个开始），最后按（清理名, 出现序号）稳定排序。
 */
export function clearName(data: BookSource[], symbols: string[]): ClearNameResult {
  const counts = new Map<string, number>();
  const entries = data.map((source) => {
    const before = getString(source, 'bookSourceName') ?? '';
    let name = before;
    for (const symbol of symbols) {
      name = trimSymbolOnce(name, symbol);
    }
    name = name.replace(emojiRegex(), '');
    name = name.replace(/#\d+/g, '');
    name = name.trim();

    const seq = counts.get(name) ?? 0;
    counts.set(name, seq + 1);
    const finalName = seq > 0 ? `${name} #${seq}` : name;

    return { source, before, finalName, sortKey: name, seq };
  });

  entries.sort((a, b) => compareNames(a.sortKey, b.sortKey) || a.seq - b.seq);

  return {
    data: entries.map((e) => ({ ...e.source, bookSourceName: e.finalName })),
    changes: entries.map((e, i) => ({
      index: i,
      before: e.before,
      after: e.finalName,
      changed: e.before !== e.finalName,
    })),
    names: entries.map((e) => e.finalName),
  };
}

/** 将所有书源的指定字段设为给定值（值类型由调用方决定）。 */
export function clearCustom(data: BookSource[], key: string, value: unknown): BookSource[] {
  return data.map((s) => ({ ...s, [key]: value }));
}

/** 是否带有非空 exploreUrl（Go 版用其打印「发现分类」标记）。 */
export function hasExploreUrl(source: BookSource): boolean {
  const eu = getString(source, 'exploreUrl');
  return eu !== undefined && eu.trim() !== '';
}

/** 提取书源 URL 的 host（小写、含端口）；无有效 host 时返回 null。 */
export function hostOf(raw: string): string | null {
  try {
    const host = new URL(raw).host;
    return host !== '' ? host : null;
  } catch {
    return null;
  }
}

export interface DuplicateReport {
  /** host 唯一的条目，自动保留。 */
  unique: BookSource[];
  /** 缺少/无法解析 bookSourceUrl 的条目，无法参与去重，自动保留并提示。 */
  ungrouped: BookSource[];
  /** 需要人工决定保留哪些的重复组，按 host 排序。 */
  duplicates: DupGroup[];
}

/** 按 bookSourceUrl 的 host 聚合，找出重复组。 */
export function findDuplicates(data: BookSource[]): DuplicateReport {
  const groups = new Map<string, DupGroup>();
  const unique: BookSource[] = [];
  const ungrouped: BookSource[] = [];

  for (const item of data) {
    const raw = getString(item, 'bookSourceUrl');
    const host = raw === undefined ? null : hostOf(raw);
    if (host === null) {
      ungrouped.push(item);
      continue;
    }
    const g = groups.get(host);
    if (g) {
      g.items.push(item);
    } else {
      groups.set(host, { key: host, invalid: false, items: [item] });
    }
  }

  const duplicates: DupGroup[] = [];
  for (const g of groups.values()) {
    if (g.items.length === 1) {
      unique.push(g.items[0]!);
    } else {
      duplicates.push(g);
    }
  }
  duplicates.sort((a, b) => compareNames(a.key, b.key));

  return { unique, ungrouped, duplicates };
}

export interface DedupResolution {
  keep: boolean;
  /** 重命名；undefined 表示保留原名称。 */
  name?: string;
}

/**
 * 应用去重决定。输出保持原文件顺序（Go 版为 map 随机序）：
 * 不在重复组中的条目全部保留；组内条目按 resolve 的结果保留/重命名/移除。
 */
export function applyDedup(
  base: BookSource[],
  duplicates: DupGroup[],
  resolve: (item: BookSource) => DedupResolution,
): BookSource[] {
  const grouped = new Set(duplicates.flatMap((g) => g.items));
  return base.flatMap((item) => {
    if (!grouped.has(item)) return [item];
    const r = resolve(item);
    if (!r.keep) return [];
    return [r.name === undefined ? item : { ...item, bookSourceName: r.name }];
  });
}
