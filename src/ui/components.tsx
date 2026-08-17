/**
 * 通用 UI 小组件，样式全部对应 src/styles.css 中已有的类名。
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from '../settings';

/* ------------------------------ Button ------------------------------ */

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

export function Button({
  variant = 'default',
  sm = false,
  block = false,
  disabled = false,
  onClick,
  children,
}: {
  variant?: ButtonVariant;
  sm?: boolean;
  block?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const cls = [
    'btn',
    variant !== 'default' ? `btn--${variant}` : '',
    sm ? 'btn--sm' : '',
    block ? 'btn--block' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/* ------------------------------ Callout ------------------------------ */

type CalloutTone = 'info' | 'success' | 'warning';

const CALLOUT_ICONS: Record<CalloutTone, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
};

export function Callout({
  tone = 'info',
  children,
}: {
  tone?: CalloutTone;
  children: ReactNode;
}) {
  return (
    <div className={`callout callout--${tone}`}>
      <span className="callout-icon" aria-hidden>
        {CALLOUT_ICONS[tone]}
      </span>
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------ Field ------------------------------ */

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint ? <span className="field-hint">　{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------ Stat ------------------------------ */

type StatTone = 'default' | 'primary' | 'success' | 'warning';

export function Stat({
  tone = 'default',
  value,
  label,
}: {
  tone?: StatTone;
  value: ReactNode;
  label: ReactNode;
}) {
  const cls = ['stat', tone !== 'default' ? `stat--${tone}` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ------------------------------ Switch ------------------------------ */

export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      {children}
    </label>
  );
}

/* ------------------------------ TextInput ------------------------------ */

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="input"
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}

/* ------------------------------ TagInput ------------------------------ */

/**
 * 标签输入：输入符号后回车（或失焦）添加，× 移除；空输入时退格删除最后一个。
 */
export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const { t } = useSettings();
  const [draft, setDraft] = useState('');

  const addDraft = () => {
    const tag = draft.trim();
    if (tag === '' || value.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span className="tag" key={tag}>
          {tag}
          <button
            type="button"
            aria-label={t('tag.remove', { tag })}
            onClick={() => onChange(value.filter((x) => x !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addDraft();
          } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={addDraft}
      />
    </div>
  );
}
