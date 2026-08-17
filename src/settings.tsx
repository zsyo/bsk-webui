/**
 * 全局设置：界面语言（zh/en，默认 zh）与主题（light/dark/auto，默认 auto 跟随系统）。
 * 持久化到 localStorage；主题解析后写入 <html data-theme>，语言同步 <html lang> 与文档标题。
 * index.html 中的内联脚本会在首帧前做同样的事，避免刷新时闪烁。
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { messages } from './i18n/messages';
import type { Lang, MessageKey } from './i18n/messages';

export type ThemeMode = 'light' | 'dark' | 'auto';

const LANG_KEY = 'bsk.lang';
const THEME_KEY = 'bsk.theme';

const DARK_MQ = '(prefers-color-scheme: dark)';

const DOC_TITLE: Record<Lang, string> = {
  zh: '书源工具箱 · bsk-webui',
  en: 'Book Source Toolbox · bsk-webui',
};

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'zh' || v === 'en') return v;
  } catch {
    /* 隐私模式等场景下不可用，回退默认 */
  }
  return 'zh';
}

function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* 同上 */
  }
  return 'auto';
}

export type TParams = Record<string, string | number>;

export interface Settings {
  lang: Lang;
  theme: ThemeMode;
  /** auto 解析后的实际主题。 */
  resolvedTheme: 'light' | 'dark';
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeMode) => void;
  /** 取词；{name} 占位符用 params 填充。 */
  t: (key: MessageKey, params?: TParams) => string;
}

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const [theme, setThemeState] = useState<ThemeMode>(readTheme);
  const [systemDark, setSystemDark] = useState<boolean>(
    () => window.matchMedia(DARK_MQ).matches,
  );

  // auto 模式下跟随系统
  useEffect(() => {
    const mq = window.matchMedia(DARK_MQ);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = DOC_TITLE[lang];
  }, [lang]);

  const value = useMemo<Settings>(() => {
    const setLang = (l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem(LANG_KEY, l);
      } catch {
        /* 忽略持久化失败 */
      }
    };
    const setTheme = (tm: ThemeMode) => {
      setThemeState(tm);
      try {
        localStorage.setItem(THEME_KEY, tm);
      } catch {
        /* 忽略持久化失败 */
      }
    };
    const t = (key: MessageKey, params?: TParams): string => {
      let s = messages[lang][key] ?? messages.zh[key];
      if (params) {
        s = s.replace(/\{(\w+)\}/g, (m, k: string) =>
          k in params ? String(params[k]) : m,
        );
      }
      return s;
    };
    return { lang, theme, resolvedTheme, setLang, setTheme, t };
  }, [lang, theme, resolvedTheme]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用');
  return ctx;
}
