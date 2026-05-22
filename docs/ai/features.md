# Features

This file is the **expected-behavior contract** for PrismSQL. Update it when
user-visible behavior changes. See [`docs/ai/graph.md`](graph.md) for
implementation details and [`docs/ai/issues.md`](issues.md) for known bugs.

---

## Connection Management

**Files:** `ConnectionModal/index.tsx`, `store/index.ts`, `ipc/index.ts`,
`db/manager.ts`, `store.ts`

| Behavior | Expected |
|---|---|
| Create connection | Form validates name is non-empty before saving |
| Test connection | Calls `db:test-connection` (no persist); shows inline result |
| Connect | Calls `db:connect`; saves only on success |
| Failed connection | Shows inline error in modal; does **not** create a saved record |
| Edit connection | Pre-fills form with existing config; updates in place |
| Delete connection | Removes from sidebar and disconnects live socket |
| Credentials | Passwords encrypted at rest via `safeStorage` in main process |

**Key invariant:** `saveConnection` is never called when `connect` returns
`{ success: false }`. See `graph.md` — Critical Data Flows § 2.

---

## Schema Browser

**Files:** `Sidebar/index.tsx`, `store/index.ts`, `ipc/index.ts`, `db/manager.ts`

| Behavior | Expected |
|---|---|
| Expand connection | Loads databases lazily |
| Expand database | Loads tables, views, routines lazily |
| Expand table | Loads columns lazily |
| Open table | Creates `SELECT * FROM <table> LIMIT 200` in a new query tab |
| Sidebar resize | Drag handle adjusts sidebar width; layout stays stable |

---

## Query Workspace

**Files:** `QueryEditor/index.tsx`, `TabBar/index.tsx`, `ResultsTable/index.tsx`,
`store/index.ts`

| Behavior | Expected |
|---|---|
| New tab | Opens a blank query tab |
| Close tab | Removes the tab and its result state |
| Run query | Executes SQL against the selected connection; shows results below |
| Query results | Display row count, execution duration, columns, and rows |
| No connection | Tab shows a prompt to connect before running |

---

## Saved Queries

**Files:** `Sidebar/index.tsx`, `store/index.ts`, `ipc/index.ts`, `store.ts`

| Behavior | Expected |
|---|---|
| Save query | Named SQL snippet stored locally in `saved-queries.json` |
| Open saved query | Loads SQL into a new tab — does **not** auto-run |
| Delete | Removes from sidebar and local store |

---

## Status Bar

**Files:** `App.tsx`, `store/index.ts`

| Behavior | Expected |
|---|---|
| Success messages | Auto-clear after 6 seconds |
| Error messages | Auto-clear after 6 seconds |
| Connection count | Always visible — shows live active connection count |
| Modal errors | Shown inline inside the modal **only** — not in the status bar |

