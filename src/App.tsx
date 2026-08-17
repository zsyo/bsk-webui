/**
 * 应用外壳：上传书源 JSON → 四个功能面板（分组 / 名称 / 字段 / 去重）→ 导出结果。
 * 所有处理都在浏览器内完成，支持撤销上一步与重新上传。
 * 界面文案与语言/主题设置见 src/i18n 与 src/settings。
 */
import { useMemo, useRef, useState } from 'react';
import type { BookSource } from './core/types';
import { findDuplicates } from './core/transforms';
import type { MessageKey } from './i18n/messages';
import { useSettings } from './settings';
import type { TParams } from './settings';
import { CustomPanel } from './ui/CustomPanel';
import { DupPanel } from './ui/DupPanel';
import { GroupsPanel } from './ui/GroupsPanel';
import { NamePanel } from './ui/NamePanel';
import { Button, Callout } from './ui/components';
import { downloadText, outputFileName } from './ui/download';

type Panel = 'groups' | 'name' | 'custom' | 'dup';

interface AppError {
  key: MessageKey;
  params?: TParams;
}

/** 解析并校验书源 JSON 文本：顶层必须是对象数组。文案以 key 返回，渲染时再翻译。 */
function parseBookSourceJson(text: string): { data: BookSource[] } | { error: AppError } {
  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    return { error: { key: 'err.jsonParse', params: { msg: e instanceof Error ? e.message : String(e) } } };
  }
  if (!Array.isArray(json)) {
    return { error: { key: 'err.notArray' } };
  }
  for (let i = 0; i < json.length; i++) {
    const item = json[i];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { error: { key: 'err.item', params: { n: i + 1 } } };
    }
  }
  return { data: json as BookSource[] };
}

export function App() {
  const { lang, theme, setLang, setTheme, t } = useSettings();

  const [fileName, setFileName] = useState<string | null>(null);
  const [data, setData] = useState<BookSource[] | null>(null);
  const [history, setHistory] = useState<BookSource[][]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [panel, setPanel] = useState<Panel>('groups');
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadText = (name: string, result: { data: BookSource[] } | { error: AppError }) => {
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setFileName(name);
    setData(result.data);
    setHistory([]);
    setError(null);
  };

  const loadFile = async (file: File) => {
    loadText(file.name, parseBookSourceJson(await file.text()));
  };

  // 没有书源文件时可以先体验：加载随站点分发的示例数据
  const loadSample = async () => {
    try {
      const res = await fetch('sample/bookSource.json');
      if (!res.ok) {
        loadText('', { error: { key: 'err.sampleHttp', params: { status: res.status } } });
        return;
      }
      loadText('示例书源.json', parseBookSourceJson(await res.text()));
    } catch (e) {
      setError({ key: 'err.sampleHttp', params: { status: e instanceof Error ? e.message : String(e) } });
    }
  };

  const apply = (next: BookSource[]) => {
    if (!data) return;
    setHistory((h) => [...h.slice(-19), data]);
    setData(next);
  };

  const undo = () => {
    if (history.length === 0) return;
    setData(history[history.length - 1]!);
    setHistory(history.slice(0, -1));
  };

  const reset = () => {
    setFileName(null);
    setData(null);
    setHistory([]);
    setError(null);
  };

  const download = () => {
    if (!data || !fileName) return;
    downloadText(outputFileName(fileName), JSON.stringify(data, null, '\t'));
  };

  // 去重 Tab 上的角标：当前重复组数量
  const dupCount = useMemo(
    () => (data ? findDuplicates(data).duplicates.length : 0),
    [data],
  );

  const panels: { id: Panel; label: string }[] = [
    { id: 'groups', label: t('tab.groups') },
    { id: 'name', label: t('tab.name') },
    { id: 'custom', label: t('tab.custom') },
    { id: 'dup', label: t('tab.dup') },
  ];

  const features: { icon: string; title: string; desc: string }[] = [
    { icon: '🗂️', title: t('tab.groups'), desc: t('feat.groups.desc') },
    { icon: '✏️', title: t('tab.name'), desc: t('feat.name.desc') },
    { icon: '🧩', title: t('tab.custom'), desc: t('feat.custom.desc') },
    { icon: '🔍', title: t('tab.dup'), desc: t('feat.dup.desc') },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">
            书源工具箱
            <span className="badge">bsk-webui</span>
          </h1>
          <p className="app-subtitle">{t('app.subtitle')}</p>
        </div>
        <div className="header-side">
          <div className="header-controls">
            <select
              className="select select--sm"
              value={lang}
              aria-label={t('header.langLabel')}
              onChange={(e) => setLang(e.currentTarget.value as 'zh' | 'en')}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
            <select
              className="select select--sm"
              value={theme}
              aria-label={t('header.themeLabel')}
              onChange={(e) => setTheme(e.currentTarget.value as 'light' | 'dark' | 'auto')}
            >
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
              <option value="auto">{t('theme.auto')}</option>
            </select>
          </div>
          {data && fileName ? (
            <div className="header-actions">
              <Button sm disabled={history.length === 0} onClick={undo}>
                {t('header.undo')}
              </Button>
              <Button sm variant="ghost" onClick={reset}>
                {t('header.reupload')}
              </Button>
              <Button sm variant="primary" onClick={download}>
                {t('header.download', { name: outputFileName(fileName) })}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <div style={{ marginBottom: 16 }}>
          <Callout tone="warning">{t(error.key, error.params)}</Callout>
        </div>
      ) : null}

      {!data ? (
        <>
          <div
            className={`dropzone ${dragOver ? 'is-over' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={t('drop.aria')}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) void loadFile(f);
            }}
          >
            <div className="dropzone-icon" aria-hidden>
              📚
            </div>
            <div className="dropzone-title">{t('drop.title')}</div>
            <div className="dropzone-hint">{t('drop.hint')}</div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void loadFile(f);
              e.currentTarget.value = '';
            }}
          />
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Button variant="ghost" onClick={() => void loadSample()}>
              {t('sample.button')}
            </Button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            {features.map((f) => (
              <div className="card card-pad" key={f.title}>
                <div style={{ fontSize: 22 }} aria-hidden>
                  {f.icon}
                </div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>{f.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {fileName ? (
            <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>
              {t('loaded.info', { name: fileName, n: data.length })}
              {history.length > 0 ? ` · ${t('loaded.ops', { n: history.length })}` : ''}
            </p>
          ) : null}

          <div className="tabs" role="tablist">
            {panels.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={panel === p.id}
                className={`tab ${panel === p.id ? 'is-active' : ''}`}
                onClick={() => setPanel(p.id)}
              >
                {p.label}
                {p.id === 'dup' && dupCount > 0 ? (
                  <span className="tab-num">{dupCount}</span>
                ) : null}
              </button>
            ))}
          </div>

          {panel === 'groups' ? <GroupsPanel data={data} onApply={apply} /> : null}
          {panel === 'name' ? <NamePanel data={data} onApply={apply} /> : null}
          {panel === 'custom' ? <CustomPanel data={data} onApply={apply} /> : null}
          {panel === 'dup' ? <DupPanel data={data} onApply={apply} /> : null}
        </>
      )}

      <footer className="app-footer">
        {t('footer.text')} ·{' '}
        <a href="https://github.com/zsyo/bsk-webui" target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </footer>
    </div>
  );
}
