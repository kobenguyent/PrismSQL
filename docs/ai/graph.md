# PrismSQL Knowledge Graph

This file is the canonical relationship map for AI agents. Every session should
treat it as ground truth for "what talks to what, and why." Update it when
structure changes.

---

## Process Boundary Overview

```
┌─────────────────────────────────────────────────────────┐
│  Renderer Process (React / Zustand)                     │
│  src/renderer/src/                                      │
│    App.tsx                                              │
│    store/index.ts  ──── window.db.*  ──────────────┐   │
│    components/                                      │   │
│      Sidebar          QueryEditor   ResultsTable    │   │
│      ConnectionModal  TabBar                        │   │
└─────────────────────────────────────────────────────────┘
                                                      │ IPC (contextBridge)
┌─────────────────────────────────────────────────────────┐
│  Preload  src/preload/index.ts                          │
│    exposes window.db → ipcRenderer.invoke('db:*')       │
│    exposes window.electron → electronAPI                │
└─────────────────────────────────────────────────────────┘
                                                      │ ipcMain.handle
┌─────────────────────────────────────────────────────────┐
│  Main Process  src/main/                                │
│    index.ts          (app bootstrap, BrowserWindow)     │
│    ipc/index.ts      (all ipcMain.handle registrations) │
│    store.ts          (disk persistence, encryption)     │
│    db/manager.ts     (ConnectionManager, adapter map)   │
│    db/adapter.ts     (DatabaseAdapter interface)        │
│    db/types.ts       (shared type contracts)            │
│    db/adapters/                                         │
│      mysql.ts  postgres.ts  sqlite.ts  mssql.ts         │
└─────────────────────────────────────────────────────────┘
```

---

## Node Catalogue

Each node lists its **role**, **direct dependencies**, and **consumers**.

### `src/main/index.ts`
- **Role**: Electron entry point. Creates `BrowserWindow`, enforces dark mode,
  calls `registerIpcHandlers`, tears down on quit.
- **Instantiates**: `ConnectionManager` (singleton for the process lifetime).
- **Calls**: `registerIpcHandlers(manager)`, `manager.disconnectAll()`.
- **Consumed by**: Electron itself (main entry in `package.json`).

### `src/main/ipc/index.ts`
- **Role**: Single registration point for every `ipcMain.handle` channel.
  Bridges renderer requests to `ConnectionManager` and `store.ts`.
- **IPC channels exposed**:

  | Channel | Action |
  |---|---|
  | `db:get-connections` | `loadConnections()` from store |
  | `db:save-connection` | upsert into store |
  | `db:delete-connection` | filter store + `manager.disconnect` |
  | `db:test-connection` | `manager.testConnection` (no persist) |
  | `db:connect` | `manager.connect` (live socket) |
  | `db:disconnect` | `manager.disconnect` |
  | `db:is-connected` | `manager.isConnected` |
  | `db:query` | `manager.query` |
  | `db:get-databases` | `manager.getDatabases` |
  | `db:get-tables` | `manager.getTables` |
  | `db:get-columns` | `manager.getColumns` |
  | `db:get-procedures` | `manager.getProcedures` |
  | `queries:get` | `loadSavedQueries()` from store |
  | `queries:save` | `writeSavedQueries()` |
  | `queries:delete` | filter + `writeSavedQueries()` |

- **Depends on**: `ConnectionManager`, `store.ts`, `db/types.ts`.

### `src/main/store.ts`
- **Role**: File-system persistence layer. Reads/writes `connections.json` and
  `saved-queries.json` under Electron's `userData` directory. Encrypts
  passwords with `safeStorage`; falls back to plaintext for legacy data.
- **Key functions**: `loadConnections`, `saveConnections`, `loadSavedQueries`,
  `writeSavedQueries`.
- **Encryption contract**: Encrypted values are prefixed with `enc:` + base64.
  Any value without the prefix is treated as legacy plaintext.
- **Depends on**: `electron` (`app`, `safeStorage`), `db/types.ts`.
- **Consumed by**: `ipc/index.ts`.

### `src/main/db/manager.ts` — `ConnectionManager`
- **Role**: Runtime registry of live database connections. Owns the `Map<id,
  DatabaseAdapter>`. Creates adapter instances per connection type, manages
  connect/disconnect lifecycle, delegates all queries.
- **Factory logic** (`createAdapter`):
  - `mysql` | `mariadb` → `MySQLAdapter`
  - `postgres` → `PostgresAdapter`
  - `sqlite` → `SQLiteAdapter`
  - `mssql` → `MSSQLAdapter`
- **Key invariant**: `testConnection` always creates a *temporary* adapter,
  pings, then disconnects — it never mutates `this.connections`.
- **Depends on**: all four adapter files, `db/adapter.ts`, `db/types.ts`.
- **Consumed by**: `ipc/index.ts`, `main/index.ts` (for `disconnectAll`).

### `src/main/db/adapter.ts`
- **Role**: `DatabaseAdapter` interface — the contract every engine adapter must
  satisfy.
- **Methods**: `connect`, `disconnect`, `query`, `getDatabases`, `getTables`,
  `getColumns`, `getProcedures`, `ping`.
- **Consumed by**: `manager.ts`, all four adapter implementations.

### `src/main/db/types.ts`
- **Role**: Shared TypeScript contracts used across main, preload, and renderer.
- **Key types**: `DatabaseType`, `ConnectionConfig`, `QueryResult`, `ColumnDef`,
  `TableInfo`, `ColumnInfo`, `ProcedureInfo`, `SchemaInfo`.
- **Import note**: Preload imports directly from `../main/db/types`; renderer
  receives the types via the `export type` re-exports in `preload/index.ts`.

### `src/main/db/adapters/mysql.ts`
- **Role**: MySQL and MariaDB adapter using `mysql2/promise`.
- **Consumed by**: `ConnectionManager.createAdapter`.

### `src/main/db/adapters/postgres.ts`
- **Role**: PostgreSQL adapter using `pg`.
- **Consumed by**: `ConnectionManager.createAdapter`.

### `src/main/db/adapters/sqlite.ts`
- **Role**: SQLite adapter using `better-sqlite3`.
- **Consumed by**: `ConnectionManager.createAdapter`.

### `src/main/db/adapters/mssql.ts`
- **Role**: SQL Server adapter using `mssql`.
- **Consumed by**: `ConnectionManager.createAdapter`.

### `src/preload/index.ts`
- **Role**: Secure bridge. Uses `contextBridge` to expose `window.db` (typed
  `dbAPI` object) and `window.electron` to the renderer. Each `window.db.*`
  method calls `ipcRenderer.invoke` with the matching `db:*` channel.
- **Security**: `nodeIntegration: false`, `contextIsolation: true` — renderer
  has no Node access beyond what is explicitly exposed here.
- **Consumed by**: `src/renderer/src/store/index.ts` via `window.db`.

### `src/renderer/src/store/index.ts` — Zustand store
- **Role**: All renderer-side state and async actions. Built with Zustand +
  Immer. Single source of truth for the UI.
- **State slices**:
  - `connections` / `connectedIds` / `schema` — database tree
  - `tabs` / `activeTabId` — query workspace
  - `savedQueries` — saved SQL snippets
  - `sidebarWidth` / `isSidebarCollapsed` / `theme` / `statusMessage` — UI
- **All async actions call `window.db.*`** — no direct IPC, no Node APIs.
- **Consumed by**: every component via `useStore(...)` selector hooks.

### `src/renderer/src/App.tsx`
- **Role**: Root component. Composes the layout: `Sidebar`, `TabBar`, and the
  active tab content. Loads connections on mount.

### `src/renderer/src/components/`

| Component | Responsibility |
|---|---|
| `Sidebar/` | Connection tree, schema browser (databases → tables → columns → procedures), saved queries panel |
| `ConnectionModal/` | Add / edit connection form; calls `testConnection` and `saveConnection` |
| `QueryEditor/` | Monaco-powered SQL editor for a single tab |
| `ResultsTable/` | Renders `QueryResult` rows with column headers, row count, duration |
| `TabBar/` | Tab strip; add / close / switch tabs |

---

## Critical Data Flows

### 1. Connect to a database (happy path)

```
ConnectionModal (renderer)
  → store.connect(config)
    → window.db.connect(config)
      → ipcRenderer.invoke('db:connect', config)
        → ipcMain.handle('db:connect')
          → ConnectionManager.connect(config)
            → createAdapter(config.type) → Adapter.connect(config)
  ← { success: true }
  → store adds id to connectedIds
  → Sidebar re-renders with green indicator
```

### 2. Failed connection must NOT persist

```
ConnectionModal
  → store.testConnection(config)         // test first
    → window.db.testConnection(config)
      → ConnectionManager.testConnection  // temp adapter, no Map mutation
  ← { success: false, error: '...' }
  → UI shows error, does NOT call saveConnection
  → store.connections unchanged
```
**Rule**: `db:save-connection` is only called after a successful connect or
explicit user save action — never as a side-effect of a failed test.

### 3. Persist a new connection

```
store.saveConnection(config)
  → window.db.saveConnection(config)
    → ipcMain.handle('db:save-connection')
      → loadConnections() + upsert
      → encryptPassword(config.password)
      → saveConnections([...]) → fs.writeFileSync(connections.json)
```

### 4. Execute a query

```
QueryEditor (renderer)
  → store.runQuery(tabId, sql)
    → window.db.query(connectionId, sql)
      → ipcMain.handle('db:query')
        → ConnectionManager.query(connectionId, sql)
          → adapter.query(sql)
  ← QueryResult { columns, rows, rowCount, duration }
  → store updates tab.result
  → ResultsTable re-renders
```

### 5. Schema load (lazy)

```
Sidebar expands a connection node
  → store.loadDatabases(connectionId)
    → window.db.getDatabases(connectionId)
  → store.loadTables(connectionId, database)
    → window.db.getTables(connectionId, database)
  → store.loadColumns(connectionId, tableKey)
    → window.db.getColumns(connectionId, table, database)
```

---

## Type Dependency Graph

```
db/types.ts
  ├── imported by: db/adapter.ts
  ├── imported by: db/manager.ts
  ├── imported by: db/adapters/*.ts
  ├── imported by: ipc/index.ts
  ├── imported by: store.ts
  ├── re-exported by: preload/index.ts
  └── used via window.db types: renderer/src/store/index.ts
                                 renderer/src/types/index.ts
```

---

## Key Invariants (enforce in every change)

1. **No failed-connection persistence** — `db:save-connection` must never be
   called if `db:test-connection` or `db:connect` returns `{ success: false }`.
2. **Credentials stay in main** — passwords must not be logged, sent to
   renderer in plain text beyond what the user typed, or stored without
   `encryptPassword`.
3. **Adapter isolation** — each adapter manages its own connection lifecycle;
   `ConnectionManager` never reaches into adapter internals.
4. **IPC is the only bridge** — renderer code must not import from
   `src/main/**`. All cross-process communication goes through `window.db`.
5. **Temporary adapters in testConnection** — the `testConnection` path creates
   a throw-away adapter in a `finally` block; it must never write to
   `this.connections`.

---

## File → Concept Map (quick lookup for agents)

| I need to change… | Touch this file |
|---|---|
| Add a new DB engine | `db/adapters/<engine>.ts` + `db/manager.ts` `createAdapter` switch + `db/types.ts` `DatabaseType` |
| Add a new IPC channel | `ipc/index.ts` + `preload/index.ts` `dbAPI` + `renderer/src/store/index.ts` `window.db` declaration |
| Change persistence format | `store.ts` |
| Change UI state shape | `renderer/src/store/index.ts` + `renderer/src/types/index.ts` |
| Fix a connection bug | `db/manager.ts`, relevant adapter, `ipc/index.ts` |
| Fix a UI bug | `renderer/src/components/<Component>/index.tsx` + `store/index.ts` |
| Change password encryption | `store.ts` `encryptPassword` / `decryptPassword` |
| Add a saved query feature | `store.ts` + `ipc/index.ts` (`queries:*`) + `renderer/src/store/index.ts` |

---

## Test Coverage Map

| Test file | What it exercises |
|---|---|
| `tests/manager.test.ts` | `ConnectionManager` connect/disconnect/query/testConnection |
| `tests/store.test.ts` | `loadConnections` / `saveConnections` / `loadSavedQueries` / `writeSavedQueries` |
| `tests/connection-modal.test.ts` | `ConnectionModal` renderer component, failed-connection no-persist rule |
| `tests/types.test.ts` | Type guard helpers and `ConnectionConfig` shape |

---

## Active Branch Context

- **Branch**: `fix/failed-connection-persistence`
- **PR #12**: Ensures a failed `db:connect` does not create a saved connection
  record. The fix lives in the interaction between `ConnectionModal`,
  `store.saveConnection`, and `ipc/index.ts`.
- **Root cause**: `saveConnection` was being called optimistically before
  verifying the connection result.
