import { useState } from 'react';
import type { BookSource } from '../core/types';
import { buildGroup, clearGroups, DEFAULT_AUTHOR, formatDate } from '../core/transforms';
import { useSettings } from '../settings';
import { Button, Callout, Field, TextInput } from './components';

export function GroupsPanel({
  data,
  onApply,
}: {
  data: BookSource[];
  onApply: (d: BookSource[]) => void;
}) {
  const { t } = useSettings();
  const [author, setAuthor] = useState(DEFAULT_AUTHOR);
  const [now] = useState(() => new Date());
  const [applied, setApplied] = useState<{ count: number; group: string } | null>(null);

  const preview = buildGroup(author, now);

  const apply = () => {
    onApply(clearGroups(data, author, now));
    setApplied({ count: data.length, group: preview });
  };

  return (
    <div className="card card-pad">
      <h2 className="section-title">{t('tab.groups')}</h2>
      <p className="section-desc">{t('groups.desc')}</p>

      <Field label={t('groups.author')} hint={t('groups.authorHint')}>
        <TextInput
          value={author}
          placeholder={DEFAULT_AUTHOR}
          onChange={(e) => setAuthor(e.currentTarget.value)}
        />
      </Field>

      <div style={{ marginTop: 16 }}>
        <Callout tone="info">
          {t('groups.preview')} <b className="mono">{preview}</b>{' '}
          <span className="muted">{t('groups.today', { date: formatDate(now) })}</span>
        </Callout>
      </div>

      <div style={{ marginTop: 16 }}>
        <Button variant="primary" onClick={apply}>
          {t('groups.apply', { n: data.length })}
        </Button>
      </div>

      {applied ? (
        <div style={{ marginTop: 16 }}>
          <Callout tone="success">
            {t('groups.done', { n: applied.count, group: applied.group })}
          </Callout>
        </div>
      ) : null}
    </div>
  );
}
