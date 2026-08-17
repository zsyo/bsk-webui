/**
 * 核心变换的移植一致性测试（对照原 Go CLI 版 bsk-go 的行为）。
 * 真实样本见 tests/fixtures/bookSource.json。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BookSource } from './types';
import {
  applyDedup,
  buildGroup,
  clearCustom,
  clearGroups,
  clearName,
  compareNames,
  findDuplicates,
  formatDate,
  hostOf,
} from './transforms';

const D = (s: string) => new Date(s); // 本地时区，测试用固定日期

describe('formatDate / buildGroup', () => {
  it('YYMMDD 格式（对应 Go 060102）', () => {
    expect(formatDate(D('2026-08-16T12:00:00'))).toBe('260816');
    expect(formatDate(D('1999-01-05T00:00:00'))).toBe('990105');
  });

  it('作者@日期，空白回退默认作者 Zephyr', () => {
    expect(buildGroup('张三', D('2026-08-16T12:00:00'))).toBe('张三@260816');
    expect(buildGroup('', D('2026-08-16T12:00:00'))).toBe('Zephyr@260816');
    expect(buildGroup('   ', D('2026-08-16T12:00:00'))).toBe('Zephyr@260816');
  });
});

describe('clearGroups', () => {
  it('统一设置 bookSourceGroup 且不改入参', () => {
    const data: BookSource[] = [
      { bookSourceName: 'a', bookSourceGroup: '旧' },
      { bookSourceName: 'b' },
    ];
    const out = clearGroups(data, '作者', D('2026-08-16T12:00:00'));
    expect(out.map((s) => s.bookSourceGroup)).toEqual(['作者@260816', '作者@260816']);
    expect(data[0]!.bookSourceGroup).toBe('旧');
    expect(data[1]).not.toHaveProperty('bookSourceGroup');
  });
});

describe('clearName', () => {
  const run = (names: string[], symbols: string[] = []) =>
    clearName(
      names.map((n) => ({ bookSourceName: n })),
      symbols,
    );

  it('去首尾符号：每个符号前后各剥一层', () => {
    const r = run(['《《书源A》', '【书源B】'], ['《', '》', '【', '】']);
    expect(r.names).toEqual(['《书源A', '书源B']); // 《(U+300A) 排在 书(U+4E66) 之前
  });

  it('移除 Emoji', () => {
    const r = run(['📚书源🎉A']);
    expect(r.names).toEqual(['书源A']);
  });

  it('移除所有 #数字（不只是结尾）', () => {
    const r = run(['书源#12', 'a#1b#23']);
    expect(r.names).toEqual(['ab', '书源']);
  });

  it('修剪首尾空白', () => {
    const r = run(['  书源 A  ']);
    expect(r.names).toEqual(['书源 A']);
  });

  it('重名自动编号：第二个起追加 #1、#2', () => {
    const r = run(['书源', '书源', '书源', '别的']);
    // 排序后：书源, 书源 #1, 书源 #2, 别的 —— '书源' 码点最小
    expect(r.names).toEqual(['书源', '书源 #1', '书源 #2', '别的']);
  });

  it('规范化清理后再判重（带符号/Emoji 的同名也算重名）', () => {
    const r = run(['《书源》', '📚书源', '书源'], ['《', '》']);
    expect(r.names).toEqual(['书源', '书源 #1', '书源 #2']);
  });

  it('同名组保持原始出现顺序', () => {
    const r = run(['B1', 'A', 'B2', 'B3']);
    expect(r.names).toEqual(['A', 'B1', 'B2', 'B3']);
  });

  it('changes 提供前后对照且顺序与 data 一致', () => {
    const r = run(['《A》', 'B'], ['《', '》']);
    expect(r.data.map((s) => s.bookSourceName)).toEqual(['A', 'B']);
    expect(r.changes.map((c) => [c.before, c.after, c.changed])).toEqual([
      ['《A》', 'A', true],
      ['B', 'B', false],
    ]);
  });

  it('名称缺失或非字符串时按空名处理（不崩溃）', () => {
    const data: BookSource[] = [{}, { bookSourceName: 123 }];
    const r = clearName(data, []);
    expect(r.names).toEqual(['', ' #1']);
  });
});

describe('compareNames（码点序 = Go 字节序）', () => {
  it('增补平面字符排在 BMP 之后（UTF-16 码元序会得到相反结果）', () => {
    expect('\uFFFF' < '\u{1F600}').toBe(false); // JS 默认比较：高位代理项在前
    expect(compareNames('\uFFFF', '\u{1F600}')).toBeLessThan(0); // 码点序，与 Go 一致
  });

  it('前缀相同时短者在前', () => {
    expect(compareNames('ab', 'abc')).toBeLessThan(0);
    expect(compareNames('abc', 'ab')).toBeGreaterThan(0);
    expect(compareNames('x', 'x')).toBe(0);
  });
});

describe('clearCustom', () => {
  it('统一设值，支持任意类型', () => {
    const data: BookSource[] = [{ a: 1 }, { b: 'x' }];
    expect(clearCustom(data, 'bookSourceGroup', '我的分组').map((s) => s.bookSourceGroup)).toEqual(
      ['我的分组', '我的分组'],
    );
    expect(clearCustom(data, 'weight', 100).map((s) => s.weight)).toEqual([100, 100]);
    expect(clearCustom(data, 'flag', false).map((s) => s.flag)).toEqual([false, false]);
  });
});

describe('hostOf', () => {
  it('提取小写 host（含端口）', () => {
    expect(hostOf('https://WWW.Example.com')).toBe('www.example.com');
    expect(hostOf('http://a.com:8080/path')).toBe('a.com:8080');
  });
  it('非法 URL / 无 host 返回 null', () => {
    expect(hostOf('不是网址')).toBeNull();
    expect(hostOf('/relative/path')).toBeNull();
    expect(hostOf('')).toBeNull();
  });
});

describe('findDuplicates / applyDedup', () => {
  const mk = (name: string, url?: string): BookSource =>
    url === undefined ? { bookSourceName: name } : { bookSourceName: name, bookSourceUrl: url };

  it('域名唯一自动保留，重复的成组', () => {
    const data = [
      mk('A', 'https://a.com'),
      mk('B', 'https://b.com'),
      mk('A2', 'https://a.com'),
      mk('A3', 'https://a.com'),
    ];
    const r = findDuplicates(data);
    expect(r.unique).toEqual([data[1]]);
    expect(r.duplicates).toHaveLength(1);
    expect(r.duplicates[0]!.key).toBe('a.com');
    expect(r.duplicates[0]!.items).toEqual([data[0], data[2], data[3]]);
  });

  it('host 大小写归一（与 Go url.Parse 行为一致）', () => {
    const data = [mk('A', 'https://Example.com'), mk('B', 'https://example.com')];
    expect(findDuplicates(data).duplicates).toHaveLength(1);
  });

  it('端口不同视为不同域名', () => {
    const data = [mk('A', 'https://a.com'), mk('B', 'https://a.com:8443')];
    expect(findDuplicates(data).duplicates).toHaveLength(0);
  });

  it('缺少/非法 URL 的条目归入 ungrouped，不参与去重', () => {
    const data = [mk('无URL'), mk('坏', '???'), mk('A', 'https://a.com')];
    const r = findDuplicates(data);
    expect(r.ungrouped).toEqual([data[0], data[1]]);
    expect(r.unique).toEqual([data[2]]);
    expect(r.duplicates).toHaveLength(0);
  });

  it('applyDedup 保持原文件顺序并应用重命名', () => {
    const data = [
      mk('首', 'https://a.com'),
      mk('唯一', 'https://b.com'),
      mk('次', 'https://a.com'),
      mk('三', 'https://a.com'),
      mk('无URL'),
    ];
    const { duplicates } = findDuplicates(data);
    const out = applyDedup(data, duplicates, (item) => {
      if (item.bookSourceName === '首') return { keep: true, name: '改名' };
      return { keep: false };
    });
    expect(out).toEqual([
      { bookSourceName: '改名', bookSourceUrl: 'https://a.com' },
      { bookSourceName: '唯一', bookSourceUrl: 'https://b.com' },
      { bookSourceName: '无URL' },
    ]);
  });
});

describe('真实样本（tests/fixtures/bookSource.json）', () => {
  const raw = readFileSync('tests/fixtures/bookSource.json', 'utf-8');
  const data = JSON.parse(raw) as BookSource[];

  it('可被完整解析为对象数组', () => {
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((s) => typeof s === 'object' && s !== null)).toBe(true);
  });

  it('clearName 结果不再含 Emoji/#数字（重名编号后缀除外）', () => {
    const r = clearName(data, ['《', '》']);
    expect(r.names).toHaveLength(data.length);
    expect(r.names.every((n) => n.trim() === n)).toBe(true);
    // 残留的 #数字 只允许是结尾的重名编号后缀
    expect(r.names.some((n) => /#\d+/.test(n) && !/ #\d+$/.test(n))).toBe(false);
  });

  it('names 与 data 一致（names.txt 语义）', () => {
    const r = clearName(data, []);
    expect(r.names).toEqual(r.data.map((s) => s.bookSourceName as string));
  });
});
