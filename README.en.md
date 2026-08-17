# bsk-webui · Book Source Toolbox

[中文](README.md) | **[English](README.en.md)**

A web-based batch editor for Legado ("阅读") book sources: unify groups, normalize names, set custom fields, and deduplicate interactively. Rewritten from [bsk-go](https://github.com/zsyo/bsk-go) (the Go CLI version, private repo) for the web — **all processing happens in your browser; no data ever leaves your machine** — and deployable to Cloudflare Workers in one step.

## Features

| Panel | CLI equivalent | Description |
|---|---|---|
| 🗂️ Unify Groups | `clear groups` | Set every `bookSourceGroup` to `Author@YYMMDD` (default author `Zephyr`) |
| ✏️ Normalize Names | `clear name` | Strip leading/trailing symbols (e.g. 《》【】), remove emoji and `#number`, trim whitespace; auto-number duplicates as `#1/#2` and sort by name; the before/after diff list is numbered and zebra-striped — turn on "show unchanged" to review every name, and **click any new name after the arrow to edit it inline** before applying |
| 🧩 Custom Field | `clear custom` | Set any field to a unified value — text / number / boolean / JSON |
| 🔍 Deduplicate | `dup` | Group by the host of `bookSourceUrl`; unique hosts are kept automatically; for duplicate groups, check the entries to keep, rename them, and inspect their explore rules |

Web-only enhancements:

- **Live preview** of every operation (before/after name diff, dedup stats, generated group name)
- **Undo** the last step or re-upload at any time
- Drag-and-drop or click to upload; download the result as `<name>_new.json` (same naming and tab indentation as the CLI)
- **Load sample data** to explore without a file
- **Chinese / English UI** (Chinese by default) and **light / dark / auto** theme, saved locally
- Mobile friendly

## Usage

### Online

Open the deployed site (a pure static app with no server-side logic) after deploying to Cloudflare Workers.

### Locally

```bash
pnpm install
pnpm dev        # dev server
pnpm build      # build to dist/
pnpm preview    # preview the production build
```

> This project uses pnpm (Node ≥ 20). npm/yarn also work, but don't mix lockfiles.

## Deployment

### Cloudflare Workers (recommended)

`wrangler.jsonc` is included, using [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) mode (no Worker script):

```bash
pnpm build
npx wrangler deploy
```

Run `npx wrangler login` once to authenticate with your Cloudflare account.

### Cloudflare Pages (alternative)

```bash
pnpm build
npx wrangler pages deploy dist
```

## Differences from the Go CLI

Behavior matches the original Go version [bsk-go](https://github.com/zsyo/bsk-go) (duplicate numbering starts at `#1` for the second entry, code-point sort order, lowercase hosts with ports, etc. — see `src/core/transforms.ts` and its tests), with a few **intentional improvements**:

| Item | Go CLI | Web |
|---|---|---|
| Output order after dedup | random (map iteration) | original file order preserved |
| Entries with a missing/unparseable `bookSourceUrl` | silently dropped | kept automatically with a notice |
| `clear custom` value types | text only | text / number / boolean / JSON |
| Non-string names | panics | treated as empty, no crash |
| Output | writes `<name>_new.json` (`-r` overwrites) | browser download; your file is untouched |

## Development

```bash
pnpm typecheck  # strict TypeScript check
pnpm test       # vitest unit tests (port-parity checks + real-sample regression)
```

Project layout:

```
├─ index.html            # entry (Chinese UI)
├─ src/
│  ├─ App.tsx            # app shell: upload → panels → export/undo
│  ├─ core/              # pure-function core logic (UI-independent, unit-tested)
│  │  ├─ types.ts        # BookSource and friends
│  │  └─ transforms.ts   # group/name/custom/dedup transforms (ported from Go)
│  └─ ui/                # panels and shared components
├─ tests/fixtures/       # real book-source sample (unit-test regression data)
├─ public/sample/        # sample book sources
└─ wrangler.jsonc        # Cloudflare Workers static-assets deploy config
```

See [AGENTS.md](AGENTS.md) for collaboration notes aimed at AI tools.

## License

[MIT](LICENSE) © Zephyr
