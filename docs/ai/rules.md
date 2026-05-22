# Agent Rules

> **Read [`docs/ai/graph.md`](graph.md) before any code change.** These rules
> apply on top of that structural knowledge. See [`docs/ai/skills.md`](skills.md)
> for step-by-step workflows.

---

## 1. Scope of Changes

| ✅ Do | ❌ Don't |
|---|---|
| Touch only files relevant to the request | Rewrite unrelated files |
| Follow existing patterns before adding abstractions | Introduce new patterns without a clear reason |
| Use TypeScript types as contracts | Use `any` or silently cast away type safety |
| Stage only files that belong to the current change | Stage unrelated dirty files |

**Why:** Narrow PRs are easier to review, easier to revert, and less likely to
introduce regressions in unrelated areas.

---

## 2. Debugging Protocol

1. **Reproduce** — confirm the failure is repeatable before touching code.
2. **Trace** — follow the data flow from the user action to the broken state
   (use `docs/ai/graph.md` critical data flows as a guide).
3. **Root cause** — state it in one plain-English sentence before writing any fix.
4. **Fix** — apply the smallest change that addresses the root cause.
5. **Regression test** — add or update a test that would have caught the bug.
6. **Document** — record root cause + fix in [`docs/ai/issues.md`](issues.md).

**Example root-cause statement:**
> `(err as Error).message` returns `""` when the driver throws a non-standard
> error object, causing `"Connection failed:"` with no detail.

---

## 3. Testing Requirements

| Situation | Required commands |
|---|---|
| Logic change (store, IPC, adapter) | `npm test` |
| UI component change | `npm test` + visual check in `npm run dev` |
| Renderer / preload / main change | `npm run build` + `npm test` |
| New feature | `npm test` + `npm run build` |
| Dependency upgrade | `npm audit --audit-level=moderate` + `npm test` + `npm run build` |

- Report test **warnings** separately from **failures** — do not bury them.
- A passing build is not a substitute for passing tests.

---

## 4. Security

- **Never** commit real credentials, tokens, database passwords, private keys,
  or `.env` values.
- Run a Betterleaks scan before any commit that touches config, env, or
  generated files.
- Redact secrets from logs, screenshots, prompts, and issue descriptions.
- Rotate any secret that was exposed in the repo or shared with an AI tool —
  deleting from code is not enough.

See [`docs/ai/security.md`](security.md) for full scanning commands.

---

## 5. Git and PR Conventions

### Branch naming
```
fix/<short-description>
feat/<short-description>
docs/<short-description>
chore/<short-description>
refactor/<short-description>
test/<short-description>
```

### Commit messages — Conventional Commits
```
<type>: <short imperative description>
```
Allowed types: `fix` · `feat` · `docs` · `chore` · `refactor` · `test` · `style`

**Good examples:**
```
fix: connection error not shown in modal
feat: add saved query categories
docs: update graph.md with IPC channel table
refactor: extract error message helper in manager
```

**Bad examples:**
```
fixed stuff           ← no type prefix
Fix: Connection bug   ← capital letter after type
fix(modal): error     ← no scope syntax, keep it flat
```

### PR titles
Must follow the same Conventional Commits convention as the commit message:
```
fix: connection error handling
feat: sidebar resize
docs: add knowledge graph
```

### PR body must include
1. **Root cause** — one sentence.
2. **Fix** — what changed and why.
3. **Verification** — commands run and their outcome.

### Other rules
- One concern per PR — keep dependency upgrades separate from bug fixes.
- Do not merge a PR with failing CI checks.
