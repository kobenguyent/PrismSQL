# PrismSQL

A modern, high-performance SQL database client for desktop — built with **Electron**, **React**, and an **Apple-inspired glassmorphism UI**.

![PrismSQL](https://img.shields.io/badge/version-1.0.0-7b7bea?style=flat-square)
![Electron](https://img.shields.io/badge/electron-29-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-4ade80?style=flat-square)

## 📸 Screenshots

### Add connection flow — test connection successfully, then save
![Add connection flow](docs/screenshots/flow-add-connection.png)

### Querying data flow — run queries successfully and view results
![Querying data flow](docs/screenshots/flow-query-data.png)

### SQL editor flow — compose and run SQL
![Query editor flow](docs/screenshots/flow-query-editor.png)

## ✨ Features

- **Apple Glassmorphism UI** — frosted-glass panels, backdrop blur, vibrancy (macOS), acrylic (Windows 11)
- **Multi-database support** — MySQL, MariaDB, PostgreSQL, SQLite, SQL Server (MSSQL)
- **Multi-tab query editor** — CodeMirror 6 SQL editor with syntax highlighting, autocompletion, and bracket matching
- **Schema browser** — expandable tree: connections → databases → tables/views → columns with types and PK flags
- **Results table** — sortable columns, global filter, CSV export, row count + query duration
- **Connection manager** — save, edit, delete and test connections; persisted across sessions
- **Connection import/export** — portable JSON backup/restore with validation and duplicate handling
- **SQL beautify** — one-click SQL formatting in the editor toolbar
- **Local AI (Ollama only)** — generate, explain, and optimize SQL without cloud APIs
- **Keyboard shortcuts** — `Ctrl/⌘+Enter` to run, `Ctrl/⌘+T` for new tab
- **Resizable layout** — drag sidebar and results-panel dividers

## 🗄️ Supported Databases

| Database     | Driver    | Default Port |
|-------------|-----------|-------------|
| MySQL        | mysql2    | 3306        |
| MariaDB      | mysql2    | 3306        |
| PostgreSQL   | pg        | 5432        |
| SQLite       | better-sqlite3 | —       |
| SQL Server   | mssql     | 1433        |

## ⬇️ Download

Pre-built installers for every platform are attached to each [GitHub Release](https://github.com/kobenguyent/PrismSQL/releases/latest):

| Platform | File |
|----------|------|
| 🍎 macOS | `.dmg` / `.zip` |
| 🪟 Windows | `.exe` (NSIS installer / portable) |
| 🐧 Linux | `.AppImage` / `.deb` |

Head to the [Releases page](https://github.com/kobenguyent/PrismSQL/releases/latest) and download the asset for your platform.

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Build from source

```bash
# Clone
git clone https://github.com/kobenguyent/PrismSQL.git
cd PrismSQL

# Install dependencies (skip native-module compilation at this stage)
npm install --ignore-scripts

# Rebuild native modules against Electron headers
npm run rebuild:sqlite
```

> **macOS — running a downloaded release:** The distributed app is not notarized with an Apple Developer certificate. After copying `PrismSQL.app` to `/Applications`, strip the quarantine attribute so Gatekeeper allows it to open:
>
> ```bash
> xattr -cr /Applications/PrismSQL.app
> ```

### Development

```bash
npm run dev
```

Opens the app in Electron with hot-reload for the renderer.

### Build

```bash
npm run build        # compile main + preload + renderer
npm run package      # build + create OS-specific installer
```

Packaged output lands in `dist/`.

> **macOS note:** CI builds are unsigned (no Apple Developer certificate). macOS Gatekeeper may block the app with *"PrismSQL is damaged and can't be opened"*. To open it anyway, remove the quarantine attribute after mounting the DMG and copying the app to `/Applications`:
>
> ```bash
> xattr -cr /Applications/PrismSQL.app
> ```
>
> Alternatively, right-click the app in Finder and choose **Open**, then confirm in the dialog.

## 🗂️ Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # BrowserWindow creation, app lifecycle
│   ├── store.ts           # JSON-based connection persistence
│   ├── ipc/index.ts       # IPC handler registration
│   └── db/
│       ├── adapter.ts     # DatabaseAdapter interface
│       ├── manager.ts     # ConnectionManager (pooling, routing)
│       └── adapters/      # Per-driver implementations
│           ├── mysql.ts
│           ├── postgres.ts
│           ├── sqlite.ts
│           └── mssql.ts
├── preload/
│   └── index.ts           # Secure contextBridge → window.db API
└── renderer/
    └── src/
        ├── App.tsx                     # Root layout
        ├── types/index.ts              # Shared renderer types
        ├── store/index.ts              # Zustand + Immer state
        ├── styles/globals.css          # Glassmorphism design system
        └── components/
            ├── ConnectionModal/        # Add / edit connection form
            ├── Sidebar/                # Connection + schema tree
            ├── TabBar/                 # Multi-tab navigation
            ├── QueryEditor/            # CodeMirror SQL editor
            └── ResultsTable/           # @tanstack/react-table results grid
tests/
├── types.test.ts       # DB_COLORS / DB_DEFAULT_PORTS constants
├── manager.test.ts     # ConnectionManager unit tests (mocked adapters)
└── store.test.ts       # Connection persistence (load/save JSON)
```

## 🧪 Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

Tests use **Vitest** and mock all database drivers so no live server is needed.

## 🤖 Local AI (Ollama-only)

PrismSQL AI is designed with a strict **local-only** policy:

- Only **Ollama** is supported in the initial release.
- No cloud AI provider integrations.
- No telemetry or analytics pipeline for AI prompts/results.
- Your prompts and SQL stay local to your machine when using Ollama.

### Setup

1. Install and run Ollama locally.
2. Pull at least one model (default expected by PrismSQL: `llama3.1`).
3. Keep Ollama running at `http://127.0.0.1:11434` (default).

Optional overrides:
- `PRISMSQL_OLLAMA_URL` — override Ollama base URL (localhost/loopback only)
- `PRISMSQL_OLLAMA_MODEL` — override default model name

In the Query Editor toolbar you can use:
- **AI Generate** (from a natural-language prompt)
- **AI Explain** (explains current SQL)
- **AI Optimize** (returns improved SQL)

## 🧰 Connections: Import / Export

- Use the sidebar header buttons to import/export connection files.
- Import validates connection entries and applies conflict handling:
  - Replace on matching `id`
  - Skip exact duplicates (same connection fingerprint)
  - Skip invalid records
- Export defaults to omitting passwords for safer sharing.

## 🧾 Logging & Diagnostics

- PrismSQL writes local logs using `electron-log`.
- Use the status-bar bug icon to open the logs folder quickly.
- When reporting issues, share relevant log excerpts and redact sensitive values.

## 🛠️ Tech Stack

| Layer        | Technology |
|-------------|------------|
| Shell        | Electron 29 |
| Build        | electron-vite + Vite 5 |
| UI           | React 18 + TypeScript |
| State        | Zustand + Immer |
| SQL editor   | CodeMirror 6 (@uiw/react-codemirror) |
| Data grid    | @tanstack/react-table |
| Icons        | lucide-react |
| DB drivers   | mysql2, pg, better-sqlite3, mssql |
| Tests        | Vitest |

## 📜 License

MIT © 2024 kobenguyent
