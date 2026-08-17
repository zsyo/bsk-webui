/**
 * 交互式去重面板：把 Go CLI 的终端问答换成可视化的勾选/重命名界面。
 * 唯一 host 的条目自动保留；重复组逐组勾选保留项，可重命名、查看发现页规则。
 */
import { useEffect, useMemo, useState } from 'react';
import type { BookSource, DupGroup } from '../core/types';
import { getString } from '../core/types';
import { applyDedup, findDuplicates, hasExploreUrl } from '../core/transforms';
import { useSettings } from '../settings';
import { Button, Callout, Stat } from './components';

interface Decision {
  keep: boolean;
  rename: string;
}

type Decisions = Map<BookSource, Decision>;

/** 默认策略：每组预勾选第一条，其余不保留。 */
function defaultDecisions(groups: DupGroup[]): Decisions {
  const m: Decisions = new Map();
  for (const g of groups) {
    g.items.forEach((item, i) => m.set(item, { keep: i === 0, rename: '' }));
  }
  return m;
}

export function DupPanel({
  data,
  onApply,
}: {
  data: BookSource[];
  onApply: (d: BookSource[]) => void;
}) {
  const { t } = useSettings();
  const report = useMemo(() => findDuplicates(data), [data]);
  const [decisions, setDecisions] = useState<Decisions>(() =>
    defaultDecisions(report.duplicates),
  );
  const [applied, setApplied] = useState<{ kept: number; removed: number; total: number } | null>(
    null,
  );

  // 数据变化（应用其它功能 / 撤销）后重置勾选状态
  useEffect(() => {
    setDecisions(defaultDecisions(report.duplicates));
  }, [report]);

  const totalInGroups = report.duplicates.reduce((n, g) => n + g.items.length, 0);
  const keptCount = report.duplicates.reduce(
    (n, g) => n + g.items.filter((it) => decisions.get(it)?.keep).length,
    0,
  );
  const removedCount = totalInGroups - keptCount;

  const update = (item: BookSource, patch: Partial<Decision>) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      const d = next.get(item) ?? { keep: false, rename: '' };
      next.set(item, { ...d, ...patch });
      return next;
    });
  };

  const setGroupKeep = (g: DupGroup, keep: boolean) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      for (const item of g.items) {
        const d = next.get(item) ?? { keep: false, rename: '' };
        next.set(item, { ...d, keep });
      }
      return next;
    });
  };

  const apply = () => {
    const result = applyDedup(data, report.duplicates, (item) => {
      const d = decisions.get(item);
      const rename = d?.rename.trim() ?? '';
      return { keep: d?.keep ?? false, name: rename === '' ? undefined : rename };
    });
    onApply(result);
    setApplied({ kept: keptCount, removed: removedCount, total: result.length });
  };

  const hasDuplicates = report.duplicates.length > 0;

  return (
    <div className="card card-pad">
      <h2 className="section-title">{t('tab.dup')}</h2>
      <p className="section-desc">{t('dup.desc')}</p>

      {applied && !hasDuplicates ? (
        <div style={{ marginBottom: 16 }}>
          <Callout tone="success">
            {t('dup.done', { kept: applied.kept, removed: applied.removed, total: applied.total })}
          </Callout>
        </div>
      ) : null}

      {!hasDuplicates ? (
        <Callout tone="info">
          {applied ? t('dup.noDupAfter') : t('dup.noDup', { n: data.length })}
        </Callout>
      ) : (
        <>
          <div className="stats" style={{ marginBottom: 16 }}>
            <Stat tone="warning" value={report.duplicates.length} label={t('dup.statGroups')} />
            <Stat value={totalInGroups} label={t('dup.statItems')} />
            <Stat tone="success" value={keptCount} label={t('dup.statKeep')} />
            <Stat tone="warning" value={removedCount} label={t('dup.statRemove')} />
          </div>

          {report.ungrouped.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <Callout tone="warning">{t('dup.ungrouped', { n: report.ungrouped.length })}</Callout>
            </div>
          ) : null}

          {report.duplicates.map((g) => (
            <div className="dup-group" key={g.key}>
              <div className="dup-group-head">
                <span className="dup-host">{g.key}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="dup-count">{t('dup.count', { n: g.items.length })}</span>
                  <Button sm onClick={() => setGroupKeep(g, true)}>
                    {t('dup.selectAll')}
                  </Button>
                  <Button sm onClick={() => setGroupKeep(g, false)}>
                    {t('dup.selectNone')}
                  </Button>
                </span>
              </div>
              {g.items.map((item, i) => {
                const d = decisions.get(item);
                const keep = d?.keep ?? false;
                const explore = getString(item, 'exploreUrl');
                return (
                  <div className={`dup-item ${keep ? 'is-kept' : ''}`} key={i}>
                    <input
                      className="dup-check"
                      type="checkbox"
                      checked={keep}
                      aria-label={t('dup.keepItem', { n: i + 1 })}
                      onChange={(e) => update(item, { keep: e.currentTarget.checked })}
                    />
                    <div className="dup-item-main">
                      <div className="dup-item-name">
                        <span className="idx">{i + 1}.</span>
                        <b>{getString(item, 'bookSourceName') ?? t('dup.noName')}</b>
                        {hasExploreUrl(item) ? (
                          <span className="pill">{t('dup.hasExplore')}</span>
                        ) : null}
                      </div>
                      {keep ? (
                        <input
                          className="input dup-rename"
                          type="text"
                          value={d?.rename ?? ''}
                          placeholder={t('dup.renamePlaceholder')}
                          onChange={(e) => update(item, { rename: e.currentTarget.value })}
                        />
                      ) : null}
                      <details className="dup-explore">
                        <summary>{t('dup.exploreSummary')}</summary>
                        <pre>{explore && explore.trim() !== '' ? explore : t('dup.exploreNone')}</pre>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="sticky-bar">
            <span className="muted" style={{ fontSize: 13 }}>
              {t('dup.barSummary', { kept: keptCount, removed: removedCount, groups: report.duplicates.length })}
            </span>
            <Button variant="primary" onClick={apply}>
              {t('dup.apply')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
