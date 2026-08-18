import { useEffect, useMemo, useState } from 'react';
import type { BookSource } from '../core/types';
import type { ClearNameResult } from '../core/transforms';
import { clearName } from '../core/transforms';
import { useSettings } from '../settings';
import { Button, Callout, Field, Stat, Switch, TagInput } from './components';

export function NamePanel({
  data,
  onApply,
}: {
  data: BookSource[];
  onApply: (d: BookSource[]) => void;
}) {
  const { t } = useSettings();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  // 用户在「处理后名称」上的手动覆盖：键为 changes 中的 index（即排序后输出位置）。
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  // 实时预览：符号变化即重新计算（数百条量级，开销可忽略）
  const result: ClearNameResult = useMemo(() => clearName(data, symbols), [data, symbols]);

  // 符号或数据变化后，规范化结果重排、index 语义已变，清空手动覆盖避免错位。
  useEffect(() => {
    setOverrides({});
  }, [symbols, data]);

  // 切换符号后旧的成功提示不再反映当前预览，清掉以免误导；
  // 注意不依赖 data——应用规范化本身会改写 data，若这里也清，成功提示一闪即逝。
  useEffect(() => {
    setApplied(null);
  }, [symbols]);

  // 应用覆盖后的最终「after」名称。
  const finalAfter = (c: { index: number; after: string }) =>
    overrides[c.index] ?? c.after;

  const changedCount = useMemo(
    () =>
      result.changes.filter((c) => finalAfter(c) !== c.before).length,
    [result, overrides],
  );
  const numberedCount = useMemo(
    () => result.names.filter((n) => /#\d+$/.test(n)).length,
    [result],
  );
  const editedCount = useMemo(
    () =>
      Object.entries(overrides).filter(([idx, v]) => {
        const c = result.changes[Number(idx)];
        return c && v !== c.after;
      }).length,
    [overrides, result],
  );

  const rows = showUnchanged ? result.changes : result.changes.filter((c) => finalAfter(c) !== c.before);

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setDraft(finalAfter(result.changes[idx]!));
  };

  const commitEdit = () => {
    if (editingIdx === null) return;
    const trimmed = draft;
    const c = result.changes[editingIdx]!;
    const sameAsComputed = trimmed === c.after;
    setOverrides((prev) => {
      const next = { ...prev };
      if (sameAsComputed) delete next[editingIdx];
      else next[editingIdx] = trimmed;
      return next;
    });
    setEditingIdx(null);
  };

  const cancelEdit = () => {
    setEditingIdx(null);
  };

  const resetEdits = () => {
    setOverrides({});
  };

  const apply = () => {
    // 用规范化后的数据作为基底，再叠加用户在 after 名称上的手动覆盖。
    const out = result.data.map((source, i) => {
      const ov = overrides[i];
      return ov === undefined ? source : { ...source, bookSourceName: ov };
    });
    onApply(out);
    setApplied(changedCount);
  };

  return (
    <div className="card card-pad">
      <h2 className="section-title">{t('tab.name')}</h2>
      <p className="section-desc">{t('name.desc')}</p>

      <Field label={t('name.symbols')} hint={t('name.symbolsHint')}>
        <TagInput
          value={symbols}
          onChange={setSymbols}
          placeholder={t('name.symbolsPlaceholder')}
        />
      </Field>

      <div className="stats" style={{ marginTop: 16 }}>
        <Stat tone="primary" value={changedCount} label={t('name.statChanged')} />
        <Stat value={data.length} label={t('name.statTotal')} />
        <Stat tone="warning" value={numberedCount} label={t('name.statNumbered')} />
      </div>

      <div
        style={{
          marginTop: 16,
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span className="muted" style={{ fontSize: 13 }}>
          {t('name.diffTitle')}
          {editedCount > 0 ? ` · ${t('name.edited', { n: editedCount })}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {editedCount > 0 ? (
            <Button sm variant="ghost" onClick={resetEdits}>
              {t('name.resetEdits')}
            </Button>
          ) : null}
          <Switch checked={showUnchanged} onChange={setShowUnchanged}>
            {t('name.showUnchanged')}
          </Switch>
        </div>
      </div>

      {rows.length === 0 ? (
        <Callout tone="info">{t('name.noChange')}</Callout>
      ) : (
        <div className="change-list">
          {rows.map((c) => {
            const idx = c.index;
            const isEditing = editingIdx === idx;
            const finalName = finalAfter(c);
            const isEdited = overrides[idx] !== undefined && overrides[idx] !== c.after;
            return (
              <div key={idx} className={`change-row ${c.changed || isEdited ? '' : 'is-unchanged'}`}>
                <span className="change-idx">{idx + 1}.</span>
                <span className="change-before">{c.before || t('common.empty')}</span>
                <span className="change-arrow" aria-hidden>
                  →
                </span>
                {isEditing ? (
                  <input
                    className="change-after-input change-after is-editable"
                    value={draft}
                    autoFocus
                    aria-label={t('name.editLabel', { n: idx + 1 })}
                    onChange={(e) => setDraft(e.currentTarget.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                  />
                ) : (
                  <span
                    className={`change-after is-editable ${isEdited ? 'is-edited' : ''}`}
                    role="button"
                    tabIndex={0}
                    title={t('name.editHint')}
                    aria-label={t('name.editLabel', { n: idx + 1 })}
                    onClick={() => startEdit(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startEdit(idx);
                      }
                    }}
                  >
                    <span>{finalName || t('common.empty')}</span>
                    <span className="change-after-edit-icon" aria-hidden>
                      ✎
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="toolbar-actions" style={{ marginTop: 16 }}>
        <Button variant="primary" onClick={apply}>
          {t('name.apply')}
        </Button>
      </div>

      {applied !== null ? (
        <div style={{ marginTop: 16 }}>
          <Callout tone="success">{t('name.done', { n: applied })}</Callout>
        </div>
      ) : null}
    </div>
  );
}
