# Issues

## Failed Connection Attempts Were Persisted

- Type: bug
- Priority: 1
- Status: fixed locally, pending PR
- Beads: `prismsql-dc5`
- Area: renderer, connection modal, persistence

### Symptom

When a user entered invalid database connection details, the app showed
`Connection failed`, but the failed connection still appeared in the sidebar as a
saved connection.

### Root Cause

`ConnectionModal` saved the connection before attempting to connect. The failed
connect result arrived after the connection had already been persisted.

### Fix

The modal now connects first and saves only after a successful connection.

### Regression Coverage

`tests/connection-modal.test.ts` covers both paths:

- failed connection does not call `saveConnection`
- successful connection calls `saveConnection` after `connect`

### Verification

```bash
npm test
npm run build
```
