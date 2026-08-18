/**
 * 交互式去重面板：把 Go CLI 的终端问答换成可视化的勾选/重命名界面。
 * 唯一 host 的条目自动保留；重复组逐组勾选保留项，可重命名、查看发现页规则。
 *
 * 性能：组卡片 memo 化（勾选/重命名只重渲染所在组）；exploreUrl 展开时才渲染
 * <pre>；重复组超过 PAGE_SIZE 时分页，逐页「确认本页并处理下一页」真应用，
 * 每页一次撤销点，「全选保留」的组用 confirmedHosts 记录、避免反复回到待处理列表。
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BookSource, DupGroup } from '../core/types';
import { getString } from '../core/types';
import { applyDedup, findDuplicates, hasExploreUrl } from '../core/transforms';
import { useSettings } from '../settings';
import { Button, Callout, Stat } from './components';

/** 重复组超过该数量时分页处理：每页展示并一次确认这么多组。 */
const PAGE_SIZE = 50;

interface Decision {
  keep: boolean;
  rename: string;
}

/**
 * 每组默认策略：优先勾选第一个「有发现页」的条目，否则回退到第一条；其余不保留。
 * 保留带发现页的源可尽量不丢失发现页能力。
 */
function defaultDecisionsFor(g: DupGroup): Decision[] {
  let preferred = 0;
  for (let i = 0; i < g.items.length; i++) {
    if (hasExploreUrl(g.items[i]!)) {
      preferred = i;
      break;
    }
  }
  return g.items.map((_, i) => ({ keep: i === preferred, rename: '' }));
}

/** 单条目行：exploreUrl 展开时才渲染 <pre>，收起时 DOM 中没有巨型文本。 */
function ItemRow({
  item,
  index,
  decision,
  onChange,
}: {
  item: BookSource;
  index: number;
  decision: Decision;
  onChange: (patch: Partial<Decision>) => void;
}) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const explore = getString(item, 'exploreUrl');
  return (
    <div className={`dup-item ${decision.keep ? 'is-kept' : ''}`}>
      <input
        className="dup-check"
        type="checkbox"
        checked={decision.keep}
        aria-label={t('dup.keepItem', { n: index + 1 })}
        onChange={(e) => onChange({ keep: e.currentTarget.checked })}
      />
      <div className="dup-item-main">
        <div className="dup-item-name">
          <span className="idx">{index + 1}.</span>
          <b>{getString(item, 'bookSourceName') ?? t('dup.noName')}</b>
          {hasExploreUrl(item) ? <span className="pill">{t('dup.hasExplore')}</span> : null}
        </div>
        {decision.keep ? (
          <input
            className="input dup-rename"
            type="text"
            value={decision.rename}
            placeholder={t('dup.renamePlaceholder')}
            onChange={(e) => onChange({ rename: e.currentTarget.value })}
          />
        ) : null}
        <details
          className="dup-explore"
          open={open}
          onToggle={(e) => setOpen(e.currentTarget.open)}
        >
          <summary>{t('dup.exploreSummary')}</summary>
          {open ? (
            <pre>{explore && explore.trim() !== '' ? explore : t('dup.exploreNone')}</pre>
          ) : null}
        </details>
      </div>
    </div>
  );
}

/** 组卡片：memo 化后，勾选/重命名只重渲染所在组，其余组引用不变被跳过。 */
const GroupCard = memo(function GroupCard({
  group,
  decisions,
  onItemChange,
  onGroupKeep,
}: {
  group: DupGroup;
  decisions: Decision[] | undefined;
  onItemChange: (host: string, idx: number, patch: Partial<Decision>) => void;
  onGroupKeep: (host: string, keep: boolean) => void;
}) {
  const { t } = useSettings();
  const ds = decisions ?? defaultDecisionsFor(group);
  return (
    <div className="dup-group">
      <div className="dup-group-head">
        <span className="dup-host">{group.key}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dup-count">{t('dup.count', { n: group.items.length })}</span>
          <Button sm onClick={() => onGroupKeep(group.key, true)}>
            {t('dup.selectAll')}
          </Button>
          <Button sm onClick={() => onGroupKeep(group.key, false)}>
            {t('dup.selectNone')}
          </Button>
        </span>
      </div>
      {group.items.map((item, i) => (
        <ItemRow
          key={i}
          item={item}
          index={i}
          decision={ds[i] ?? { keep: false, rename: '' }}
          onChange={(patch) => onItemChange(group.key, i, patch)}
        />
      ))}
    </div>
  );
});

export function DupPanel({
  data,
  onApply,
}: {
  data: BookSource[];
  onApply: (d: BookSource[]) => void;
}) {
  const { t } = useSettings();
  const report = useMemo(() => findDuplicates(data), [data]);

  // 已逐页确认过的 host。「全选保留」的组去重后仍是重复组，靠它排除出待处理列表。
  const [confirmedHosts, setConfirmedHosts] = useState<Set<string>>(() => new Set());
  const [pagesDone, setPagesDone] = useState(0);
  // 只保存被改动过的组；未保存的组渲染与统计时回退默认勾选。
  const [decisions, setDecisions] = useState<Record<string, Decision[]>>({});
  const [applied, setApplied] = useState<{ kept: number; removed: number; total: number } | null>(
    null,
  );

  const groupByKey = useMemo(
    () => new Map<string, DupGroup>(report.duplicates.map((g) => [g.key, g])),
    [report],
  );

  const pending = useMemo(
    () => report.duplicates.filter((g) => !confirmedHosts.has(g.key)),
    [report, confirmedHosts],
  );
  const paged = pending.length > PAGE_SIZE;
  const pageGroups = paged ? pending.slice(0, PAGE_SIZE) : pending;

  // 数据变化后重建勾选：本面板自己应用的变更（换页）只清勾选；
  // 外部变化（撤销 / 重传 / 其他面板应用）则连确认记录一起清空，从头开始。
  const selfApplied = useRef(false);
  useEffect(() => {
    setDecisions({});
    if (!selfApplied.current) {
      setConfirmedHosts(new Set());
      setPagesDone(0);
    }
    selfApplied.current = false;
  }, [report]);

  // 统计只反映当前页的勾选情况；累计进度看头部的「已应用 N 个操作」。
  const totalInPage = pageGroups.reduce((n, g) => n + g.items.length, 0);
  const keptCount = pageGroups.reduce((n, g) => {
    const ds = decisions[g.key] ?? defaultDecisionsFor(g);
    return n + ds.filter((d) => d.keep).length;
  }, 0);
  const removedCount = totalInPage - keptCount;

  const defaultsFor = useCallback(
    (host: string): Decision[] => {
      const g = groupByKey.get(host);
      return g ? defaultDecisionsFor(g) : [];
    },
    [groupByKey],
  );

  const onItemChange = useCallback(
    (host: string, idx: number, patch: Partial<Decision>) => {
      setDecisions((prev) => {
        const next = (prev[host] ?? defaultsFor(host)).slice();
        next[idx] = { ...(next[idx] ?? { keep: false, rename: '' }), ...patch };
        return { ...prev, [host]: next };
      });
    },
    [defaultsFor],
  );

  const onGroupKeep = useCallback(
    (host: string, keep: boolean) => {
      setDecisions((prev) => ({
        ...prev,
        [host]: (prev[host] ?? defaultsFor(host)).map((d) => ({ ...d, keep })),
      }));
    },
    [defaultsFor],
  );

  /** 应用当前页：本页之外的条目一律原样保留，避免误删未审阅的组。 */
  const applyPage = () => {
    const pageItems = new Set(pageGroups.flatMap((g) => g.items));
    const result = applyDedup(data, report.duplicates, (item) => {
      if (!pageItems.has(item)) return { keep: true };
      for (const g of pageGroups) {
        const idx = g.items.indexOf(item);
        if (idx === -1) continue;
        const d = (decisions[g.key] ?? defaultDecisionsFor(g))[idx] ?? {
          keep: false,
          rename: '',
        };
        const rename = d.rename.trim();
        return { keep: d.keep, name: rename === '' ? undefined : rename };
      }
      return { keep: true };
    });
    selfApplied.current = true;
    setConfirmedHosts((prev) => {
      const next = new Set(prev);
      for (const g of pageGroups) next.add(g.key);
      return next;
    });
    setPagesDone((n) => n + 1);
    onApply(result);
    setApplied((prev) =>
      prev
        ? {
            kept: prev.kept + keptCount,
            removed: prev.removed + removedCount,
            total: result.length,
          }
        : { kept: keptCount, removed: removedCount, total: result.length },
    );
  };

  const hasPending = pageGroups.length > 0;
  const totalPages = pagesDone + Math.max(1, Math.ceil(pending.length / PAGE_SIZE));

  return (
    <div className="card card-pad">
      <h2 className="section-title">{t('tab.dup')}</h2>
      <p className="section-desc">{t('dup.desc')}</p>

      {applied && !hasPending ? (
        <div style={{ marginBottom: 16 }}>
          <Callout tone="success">
            {t('dup.done', { kept: applied.kept, removed: applied.removed, total: applied.total })}
          </Callout>
        </div>
      ) : null}

      {!hasPending ? (
        <Callout tone="info">
          {applied ? t('dup.noDupAfter') : t('dup.noDup', { n: data.length })}
        </Callout>
      ) : (
        <>
          <div className="stats" style={{ marginBottom: 16 }}>
            <Stat tone="warning" value={pageGroups.length} label={t('dup.statGroups')} />
            <Stat value={totalInPage} label={t('dup.statItems')} />
            <Stat tone="success" value={keptCount} label={t('dup.statKeep')} />
            <Stat tone="warning" value={removedCount} label={t('dup.statRemove')} />
          </div>

          {report.ungrouped.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <Callout tone="warning">{t('dup.ungrouped', { n: report.ungrouped.length })}</Callout>
            </div>
          ) : null}

          {pageGroups.map((g) => (
            <GroupCard
              key={g.key}
              group={g}
              decisions={decisions[g.key]}
              onItemChange={onItemChange}
              onGroupKeep={onGroupKeep}
            />
          ))}

          <div className="sticky-bar">
            <div>
              <span className="muted" style={{ fontSize: 13 }}>
                {t('dup.barSummary', {
                  kept: keptCount,
                  removed: removedCount,
                  groups: pageGroups.length,
                })}
              </span>
              {paged ? (
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {t('dup.pagerStatus', {
                    page: pagesDone + 1,
                    pages: totalPages,
                    n: pending.length,
                  })}
                </div>
              ) : null}
            </div>
            <Button variant="primary" onClick={applyPage}>
              {paged ? t('dup.confirmNext') : t('dup.apply')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
