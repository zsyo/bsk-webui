import { useMemo, useState } from 'react';
import type { BookSource } from '../core/types';
import { clearCustom } from '../core/transforms';
import type { MessageKey } from '../i18n/messages';
import { useSettings } from '../settings';
import { Button, Callout, Field, TextInput } from './components';

type ValueType = 'text' | 'number' | 'boolean' | 'json';

const TYPE_LABEL_KEYS: Record<ValueType, MessageKey> = {
  text: 'custom.typeText',
  number: 'custom.typeNumber',
  boolean: 'custom.typeBoolean',
  json: 'custom.typeJson',
};

/** 按所选类型解析用户输入的值。 */
function parseValue(raw: string, type: ValueType): { value: unknown } | { error: MessageKey } {
  switch (type) {
    case 'text':
      return { value: raw };
    case 'number': {
      const n = Number(raw);
      return raw.trim() !== '' && !Number.isNaN(n) ? { value: n } : { error: 'custom.errNumber' };
    }
    case 'boolean':
      return { value: raw === 'true' };
    case 'json':
      try {
        return { value: JSON.parse(raw) };
      } catch {
        return { error: 'custom.errJson' };
      }
  }
}

export function CustomPanel({
  data,
  onApply,
}: {
  data: BookSource[];
  onApply: (d: BookSource[]) => void;
}) {
  const { t } = useSettings();
  const [key, setKey] = useState('bookSourceGroup');
  const [raw, setRaw] = useState('');
  const [type, setType] = useState<ValueType>('text');
  const [applied, setApplied] = useState<{ count: number; key: string } | null>(null);

  const parsed = useMemo(() => parseValue(raw, type), [raw, type]);
  const hasError = 'error' in parsed;
  const canApply = key.trim() !== '' && !hasError;

  const apply = () => {
    if (!canApply || !('value' in parsed)) return;
    onApply(clearCustom(data, key.trim(), parsed.value));
    setApplied({ count: data.length, key: key.trim() });
  };

  return (
    <div className="card card-pad">
      <h2 className="section-title">{t('tab.custom')}</h2>
      <p className="section-desc">{t('custom.desc')}</p>

      <div className="row">
        <Field label={t('custom.key')} hint={t('custom.keyHint')}>
          <TextInput
            value={key}
            onChange={(e) => setKey(e.currentTarget.value)}
            placeholder={t('custom.keyPlaceholder')}
          />
        </Field>
        <Field label={t('custom.type')}>
          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.currentTarget.value as ValueType)}
          >
            {(Object.keys(TYPE_LABEL_KEYS) as ValueType[]).map((v) => (
              <option key={v} value={v}>
                {t(TYPE_LABEL_KEYS[v])}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label={t('custom.value')}>
          {type === 'boolean' ? (
            <select className="select" value={raw} onChange={(e) => setRaw(e.currentTarget.value)}>
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          ) : (
            <TextInput
              value={raw}
              onChange={(e) => setRaw(e.currentTarget.value)}
              placeholder={type === 'json' ? t('custom.jsonPlaceholder') : t('custom.valuePlaceholder')}
            />
          )}
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        {hasError ? (
          <Callout tone="warning">{t((parsed as { error: MessageKey }).error)}</Callout>
        ) : (
          <Callout tone="info">
            {t('custom.willWrite', {
              key: key.trim() || t('custom.noKey'),
              value: 'value' in parsed ? JSON.stringify(parsed.value) : '',
            })}
          </Callout>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Button variant="primary" disabled={!canApply} onClick={apply}>
          {t('custom.apply', { n: data.length })}
        </Button>
      </div>

      {applied ? (
        <div style={{ marginTop: 16 }}>
          <Callout tone="success">
            {t('custom.done', { n: applied.count, key: applied.key })}
          </Callout>
        </div>
      ) : null}
    </div>
  );
}
