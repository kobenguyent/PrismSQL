# Beads Issue Tracking

> Beads (`bd`) is the git-backed issue tracker for durable agent memory across
> sessions. Use it alongside [`docs/ai/issues.md`](issues.md) — Beads for
> tracking status, `issues.md` for full root-cause records.

---

## Setup

```bash
brew install beads
bd init      # run once per machine in the repo root
```

---

## Common Commands

| Action | Command |
|---|---|
| Create a bug | `bd create "description" --type bug --priority 1` |
| List open issues | `bd list` |
| Show ready issues | `bd ready` |
| Show one issue | `bd show <issue-id>` |
| Close an issue | `bd close <issue-id>` |

**Priority scale:** `0` critical · `1` high · `2` medium · `3` low · `4` backlog

**Type values:** `bug` · `feature` · `task` · `epic` · `chore`

---

## Agent Rules

1. Create a Beads issue for every bug discovered during development.
2. Record the Beads ID in the corresponding `docs/ai/issues.md` entry.
3. Close the Beads issue only after the fix is committed and `npm test` passes.
4. Never close an issue before the PR is merged.

---

## Current Status

| ID | Title | Type | Status |
|---|---|---|---|
| `prismsql-dc5` | Failed connection persistence | bug | ✅ closed (PR #12) |
| `prismsql-zkp` | Betterleaks secret scan task | task | ✅ closed |
