# AGENTS.md

面向 AI 编码工具的项目协作说明。人类开发者请看 [README.md](README.md)。

## 项目是什么

阅读（Legado）书源批量编辑工具的 Web 版（bsk-webui，github.com/zsyo/bsk-webui），由 Go CLI 版 [bsk-go](https://github.com/zsyo/bsk-go)（私有）重写而来（React 18 + Vite 6 + TypeScript，纯前端）。**核心原则：所有书源处理都在浏览器完成，没有任何服务端逻辑**；部署形态是 Cloudflare Workers 静态资源（assets-only，无 Worker 脚本）。

## 常用命令

```bash
pnpm install        # 安装依赖（包管理器用 pnpm，Node ≥ 20）
pnpm dev            # Vite 开发服务器
pnpm typecheck      # tsc --noEmit（strict）
pnpm test           # vitest 单元测试
pnpm build          # 生产构建 → dist/
pnpm deploy         # wrangler deploy（Workers 静态资源，先 build）
```

改完代码必须 `pnpm typecheck && pnpm test`；涉及 UI 时 `pnpm build` 确认可构建。

## 架构

```
src/
├─ App.tsx            # 状态中枢：上传/示例加载、tab 切换、操作历史(撤销)、导出下载
├─ main.tsx           # 入口（SettingsProvider 包裹 App）
├─ settings.tsx       # 语言(zh/en)与主题(light/dark/auto)上下文，localStorage 持久化
├─ i18n/messages.ts   # 中英文词典（key 一一对应，类型强制两份都写）
├─ core/              # 纯函数，禁止 import DOM/React —— 这是单测的对象
│  ├─ types.ts        # BookSource = Record<string, unknown>（书源字段松散，保留未知字段）
│  └─ transforms.ts   # clearGroups / clearName / clearCustom / findDuplicates / applyDedup
└─ ui/
   ├─ components.tsx  # Button/Callout/Field/Stat/Switch/TextInput/TagInput
   ├─ GroupsPanel.tsx / NamePanel.tsx / CustomPanel.tsx / DupPanel.tsx
   └─ download.ts     # 浏览器下载 + 输出文件名（<原名>_new.json）
```

- 数据流：面板通过 `onApply(newData)` 把变换结果交回 App；App 压入历史栈并替换数据。变换一律**返回新数组**（不可变），不改写入参。
- 样式：全部在 `src/styles.css`，组件只引用既有类名（`.card` `.btn--primary` `.dup-item` 等），不引入 CSS 框架。
- **i18n**：界面文案一律走 `src/i18n/messages.ts`（`useSettings().t(key, params)`），新增 key 必须中英两份同时补（类型强制）；面板内禁止硬编码文案。产品名「书源工具箱」两种语言下保持中文不变。
- **主题**：`<html data-theme="light|dark">` 驱动（`src/settings.tsx` 解析 auto 后写入）；`index.html` 里有首帧前应用设置的防闪烁内联脚本，改逻辑时两处要同步。
- `public/sample/bookSource.json` 是「载入示例数据」的数据源；`tests/fixtures/bookSource.json` 是单测回归用的真实样本（两者独立，互不影响）。

## Go 版语义对照（改动 core 前必读）

行为必须与原 Go 版 bsk-go 保持一致，单测已固化以下要点（原实现已不在本仓库，语义以此处记录为准）：

- **clearGroups**：`作者@YYMMDD`（Go `Format("060102")`），作者空白时回退 `Zephyr`（本项目有意变更）。
- **clearName**：
  - 每个符号仅去**一层**首尾（等价 Go `TrimPrefix`/`TrimSuffix` 各一次），按传入顺序；
  - 移除**所有** `#\d+`（不限结尾），Emoji 用 emoji-regex 移除，然后 trim；
  - 重名编号：同清理名第 2 个起追加 ` #1`、` #2`…（编号从 1 开始）；
  - 排序键是（清理名, 出现序号）的稳定排序，比较必须用**码点序**（`compareNames`，等价 Go 字节序；JS 默认 UTF-16 序在增补平面字符上会不同）。
- **dup**：分组键是 `new URL(url).host`（小写、含端口；端口不同即不同组）。唯一组自动保留。
- 输出 JSON 用 **tab 缩进**、文件名 `_new` 后缀（已带则不重复追加）。

**有意差异**（不要"修回去"）：输出保持原文件顺序（Go 是 map 随机序）；无/非法 URL 的条目自动保留并提示（Go 静默丢弃）；custom 支持数字/布尔/JSON；名称非字符串按空名处理。

## 约定

- TypeScript `strict` + `verbatimModuleSyntax`：类型导入必须 `import type`；无未用变量。
- 新依赖保持克制；现有运行时依赖仅 react/react-dom/emoji-regex。
- pnpm 配置在 `pnpm-workspace.yaml`（`allowBuilds` 已放行 esbuild/workerd 的安装脚本）。
- 部署配置在 `wrangler.jsonc`：`assets.directory=./dist` + SPA fallback；没有 Worker 入口，别加 `main`。
- 页面中文标题「书源工具箱」固定不变，项目名一律用 bsk-webui；页脚有 GitHub 仓库链接。
- 文档双语：`README.md`（中文，默认）/ `README.en.md`，顶部互相跳转；改动功能需同步两份与本文。
