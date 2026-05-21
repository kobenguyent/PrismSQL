# PrismSQL

A modern, high-performance SQL database client for desktop — built with **Electron**, **React**, and an **Apple-inspired glassmorphism UI**.

![PrismSQL](https://img.shields.io/badge/version-1.0.0-7b7bea?style=flat-square)
![Electron](https://img.shields.io/badge/electron-29-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-4ade80?style=flat-square)

## ✨ Features

- **Apple Glassmorphism UI** — frosted-glass panels, backdrop blur, vibrancy (macOS), acrylic (Windows 11)
- **Multi-database support** — MySQL, MariaDB, PostgreSQL, SQLite, SQL Server (MSSQL)
- **Multi-tab query editor** — CodeMirror 6 SQL editor with syntax highlighting, autocompletion, and bracket matching
- **Schema browser** — expandable tree: connections → databases → tables/views → columns with types and PK flags
- **Results table** — sortable columns, global filter, CSV export, row count + query duration
- **Connection manager** — save, edit, delete and test connections; persisted across sessions
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

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Install

```bash
# Clone
git clone https://github.com/kobenguyent/PrismSQL.git
cd PrismSQL

# Install dependencies (skip native-module compilation at this stage)
npm install --ignore-scripts

# Rebuild native modules against Electron headers
npm run rebuild:sqlite
```

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
