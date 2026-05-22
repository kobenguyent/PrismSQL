# Issues

Record every investigated bug here. Use the template at the bottom of this file.
Mark a record ✅ fixed only after the fix is merged and tests pass.

---

## Issue: Failed Connection Attempts Were Persisted

| Field | Value |
|---|---|
| Type | bug |
| Priority | 1 — high |
| Status | ✅ fixed — merged PR #12 |
| Beads | `prismsql-dc5` |
| Area | `ConnectionModal/index.tsx`, `store/index.ts`, IPC `db:save-connection` |

### Symptom
Invalid connection details produced `Connection failed`, but the connection still
appeared in the sidebar as a saved entry.

### Root Cause
`ConnectionModal` called `saveConnection` optimistically before verifying the
connect result. Persistence happened before the failure was confirmed.

### Fix
`connectThenSaveConnection` in `ConnectionModal/index.tsx` now calls `connect`
first and only calls `saveConnection` when `result.success === true`.

### Regression Coverage
`tests/connection-modal.test.ts`:
- failed connection → `saveConnection` not called
- successful connection → `saveConnection` called after `connect`

### Verification
```bash
npm test
npm run build
```

---

## Issue: "Connection failed:" Shown Persistently with No Error Detail

| Field | Value |
|---|---|
| Type | bug |
| Priority | 1 — high |
| Status | ✅ fixed — merged PR #14 |
| Beads | — |
| Area | `db/manager.ts`, `ConnectionModal/index.tsx`, `store/index.ts` |

### Symptom
Status bar always showed `Connection failed:` (no detail) even when no connection
attempt was in progress. Closing and reopening the app did not clear it.

### Root Causes (three, all required to reproduce)

1. **Driver errors aren't standard `Error` objects.** `pg`, `mysql2`, and `mssql`
   throw custom objects; `(err as Error).message` returned `""`.

2. **`??` does not guard empty strings.** `result.error ?? 'Connection failed'`
   let `""` pass through, producing `"Connection failed:"`.

3. **Status bar poisoned by modal errors.** `store.connect()` pushed the failure
   to the persistent bottom status bar; it survived modal close.

### Fix
- Added `extractErrorMessage(err)` in `src/main/db/manager.ts` — checks `.message`,
  `.detail`, `.text`, `.msg`; falls back to `"Unknown error"`.
- Changed `?? 'Connection failed'` → `|| 'Connection failed'` in modal.
- Removed `setStatus` error call from `store.connect()` — modal owns inline errors.
- Added 6-second auto-clear for error/success status bar messages in `setStatus`.

### Regression Coverage
Existing `tests/connection-modal.test.ts` verifies the modal error path.

### Verification
```bash
npm test
npm run build
```

---

## Template

```markdown
## Issue: <title>

| Field | Value |
|---|---|
| Type | bug / feat / chore |
| Priority | 0 critical · 1 high · 2 medium · 3 low |
| Status | 🔍 investigating · 🛠 in progress · ✅ fixed · ❌ wont-fix |
| Beads | `<issue-id>` or — |
| Area | affected files / modules |

### Symptom

### Root Cause

### Fix

### Regression Coverage

### Verification
```bash
npm test
```
```
