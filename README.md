# 书源工具箱 · bsk-webui

**[中文](README.md)** | [English](README.en.md)

阅读（Legado）书源在线批量编辑工具：统一分组、规范名称、自定义字段、交互式去重。由 [bsk-go](https://github.com/zsyo/bsk-go)（Go CLI 版，私有仓库）重写为 Web 版，**所有处理均在浏览器内完成，数据不出本机**，可一键部署到 Cloudflare Workers。

## 功能

| 面板 | 对应 CLI 命令 | 说明 |
|---|---|---|
| 🗂️ 统一分组 | `clear groups` | 将 `bookSourceGroup` 统一设为「作者@YYMMDD」，作者名默认 `Zephyr` |
| ✏️ 规范名称 | `clear name` | 去首尾符号（如《》【】）、移除 Emoji、去除 `#数字`、修剪空白；重名自动追加 `#1/#2` 编号并按名称排序；前后对照列表带序号与斑马纹，开启「显示未变化的项」即可核对全部名称，**点击箭头后的新名称可直接编辑**，再「应用规范化」生效 |
| 🧩 自定义字段 | `clear custom` | 任意字段统一设值，支持文本 / 数字 / 布尔 / JSON 类型 |
| 🔍 交互去重 | `dup` | 按 `bookSourceUrl` 域名分组；唯一域名自动保留，重复组勾选保留项，可重命名、查看发现页规则 |

Web 版增强：

- 处理结果**实时预览**（名称前后对照、去重统计、将生成的分组名）
- **撤销上一步** / 重新上传，随时回退误操作
- 拖拽或点击上传，处理完下载 `<原名>_new.json`（与 CLI 输出命名一致，tab 缩进）
- 没有书源文件时可**载入示例数据**体验
- **中英文界面切换**（默认中文）、**亮色 / 暗色 / 跟随系统**三种主题，选择自动保存在本地
- 移动端可用

## 使用

### 在线使用

部署到 Cloudflare Workers 后直接打开网页即可（纯静态应用，无服务端逻辑）。

### 本地运行

```bash
pnpm install
pnpm dev        # 开发服务器
pnpm build      # 产出 dist/
pnpm preview    # 本地预览构建产物
```

> 本项目使用 pnpm（Node ≥ 20）。npm / yarn 亦可，但请勿混用锁文件。

## 部署

### Cloudflare Workers（推荐）

项目已包含 `wrangler.jsonc`（[Workers 静态资源](https://developers.cloudflare.com/workers/static-assets/)模式，无 Worker 脚本）：

```bash
pnpm build
npx wrangler deploy
```

首次使用需 `npx wrangler login` 登录 Cloudflare 账号。

### Cloudflare Pages（可选）

```bash
pnpm build
npx wrangler pages deploy dist
```

## 与 Go CLI 版的差异

行为与原 Go 版 [bsk-go](https://github.com/zsyo/bsk-go) 保持一致（重名编号从第二个开始追加 `#1`、按码点排序、域名小写且含端口等，详见 `src/core/transforms.ts` 与对应测试），仅做了以下**有意改进**：

| 项 | Go CLI | Web 版 |
|---|---|---|
| 重复判定后的输出顺序 | map 随机序 | 保持原文件顺序 |
| 缺少/无法解析 `bookSourceUrl` 的条目 | 静默丢弃 | 自动保留并提示 |
| `clear custom` 值类型 | 仅文本 | 文本/数字/布尔/JSON |
| 名称非字符串 | 直接 panic | 按空名处理，不崩溃 |
| 输出方式 | 写 `<原名>_new.json`（`-r` 覆盖） | 浏览器下载，原件不动 |

## 开发

```bash
pnpm typecheck  # TypeScript 严格检查
pnpm test       # vitest 单元测试（含移植一致性对照与真实样本回归）
```

项目结构：

```
├─ index.html            # 入口（中文）
├─ src/
│  ├─ App.tsx            # 应用外壳：上传 → 功能面板 → 导出/撤销
│  ├─ core/              # 纯函数核心逻辑（与 UI 解耦，含单元测试）
│  │  ├─ types.ts        # BookSource 等类型
│  │  └─ transforms.ts   # 分组/名称/字段/去重变换（自 Go 移植）
│  └─ ui/                # 面板与通用组件
├─ tests/fixtures/       # 真实书源样本（单测回归用）
├─ public/sample/        # 示例书源数据
└─ wrangler.jsonc        # Cloudflare Workers 静态资源部署配置
```

面向 AI 工具的协作说明见 [AGENTS.md](AGENTS.md)。

## 许可

[MIT](LICENSE) © Zephyr
