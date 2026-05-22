# Plans

Active and upcoming work. Move completed plans to the **Completed** table.
Use the template below for every new plan.

---

## Active Plans

_No active plans. See [`docs/ai/issues.md`](issues.md) for recently completed
work._

---

## Backlog

| Title | Type | Priority |
|---|---|---|
| Docker Compose for integration test databases | chore | 2 — medium |
| Adapter integration tests (MySQL, Postgres, MSSQL) | test | 2 — medium |
| Auto-reconnect on dropped connection | feat | 2 — medium |
| Export query results to CSV / JSON | feat | 3 — low |

---

## Completed

| PR | Title | Type |
|---|---|---|
| #12 | fix: failed connection persistence | bug |
| #13 | fix: sidebar resize + knowledge graph | bug + docs |
| #14 | fix: connection error handling and status bar persistence | bug |

---

## Plan Template

```markdown
## Plan: <Title>

| Field | Value |
|---|---|
| Type | bug / feat / chore / refactor |
| Priority | 0 critical · 1 high · 2 medium · 3 low |
| Status | 📋 planned · 🛠 in progress · ✅ done |
| Branch | fix/<name> or feat/<name> |

### Goal
<One sentence — what will be true when this is done.>

### Scope
- `file-or-module-a.ts` — what changes
- `file-or-module-b.ts` — what changes

### Non-Goals
- What is explicitly out of scope

### Steps
1. ...
2. ...

### Verification
```bash
npm test
npm run build
```

### Rollback
`git revert <commit>` — no migration needed.
```

---

## Planning Rules

- One root cause per bug-fix plan.
- One feature concern per feature plan.
- Dependency upgrades always get their own plan and PR.
- Include exact commands under Verification.
- Update this file when a plan moves to in-progress or done.
