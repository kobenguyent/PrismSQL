# Agent Skills

> Repeatable step-by-step workflows. Each skill maps to a rule in
> [`docs/ai/rules.md`](rules.md). Use [`docs/ai/graph.md`](graph.md) as the
> structural reference when tracing code paths.

---

## Skill: Fix a Bug

**When to use:** A feature is broken, a test is failing, or a user reports
unexpected behavior.

```
1. Read graph.md → find the relevant data flow section.
2. Reproduce the failure (run the app or a targeted test).
3. State the root cause in one plain-English sentence.
4. Write a regression test that currently fails.
5. Apply the smallest fix that makes the test pass.
6. npm test
7. npm run build  (if main/preload/renderer changed)
8. Record root cause + fix in docs/ai/issues.md.
9. Open a PR following rules.md § 5.
```

**Checklist before marking done:**
- [ ] Root cause documented in one sentence
- [ ] Regression test added or updated
- [ ] `npm test` passes
- [ ] `npm run build` passes (if applicable)
- [ ] `docs/ai/issues.md` updated

---

## Skill: Add a Feature

**When to use:** Adding new user-facing functionality.

```
1. Check features.md — does this feature already exist or conflict?
2. Identify which layers change (see graph.md § File → Concept Map).
3. Add/update IPC channel in ipc/index.ts if main-process data is needed.
4. Expose it via preload/index.ts window.db if renderer needs it.
5. Add the action to renderer/src/store/index.ts.
6. Build the UI component or update an existing one.
7. Write a test covering the new behavior.
8. npm test && npm run build
9. Update docs/ai/features.md with expected behavior.
10. Update docs/ai/graph.md (IPC table, node catalogue, flows as needed).
11. Open a PR: feat: <short description>
```

**Checklist before marking done:**
- [ ] All affected layers updated (graph.md invariant #4 — IPC is the only bridge)
- [ ] New IPC channel documented in graph.md
- [ ] `npm test` and `npm run build` pass
- [ ] `docs/ai/features.md` updated

---

## Skill: Prepare and Open a PR

**When to use:** Changes are ready to ship.

```bash
git status --short --branch          # confirm you're on the right branch
git diff --stat                      # review what changed
git add <only relevant files>        # never stage unrelated files
npm test                             # must pass
npm run build                        # must pass for non-pure-test changes
git commit -m "<type>: <description>"
git push -u origin <branch>
gh pr create \
  --title "<type>: <description>" \
  --body "## Root cause
...
## Fix
- \`file.ts\` — what changed and why

## Verification
\`\`\`bash
npm test
npm run build
\`\`\`"
```

---

## Skill: Secret Scan

**When to use:** Before committing any change that touches config, credentials,
env, logs, or generated files.

```bash
# Staged changes only — fastest, use before every sensitive commit
betterleaks git . --pre-commit --staged --redact

# Full repo history
betterleaks git . --redact

# Files outside Git history (generated output dirs, etc.)
betterleaks dir . --redact
```

**On a finding:**
1. Treat it as real until proven otherwise.
2. Rotate the secret immediately if it was ever pushed.
3. Remove from code, docs, and screenshots.
4. Document false positives before suppressing.

---

## Skill: Upgrade a Dependency

**When to use:** Bumping a package version.

```
1. Create a separate branch: chore/upgrade-<package>
2. Make the version change in package.json only.
3. npm install
4. npm audit --audit-level=moderate     # no new high/critical issues
5. npm test                             # all tests pass
6. npm run build                        # build succeeds
7. npx tsc --noEmit                     # no new type errors
8. Update README if runtime prerequisites changed.
9. Open a PR: chore: upgrade <package> to <version>
```

**Never mix** a dependency upgrade with a bug fix or feature in the same PR.

---

## Skill: Update the Knowledge Graph

**When to use:** After adding a module, IPC channel, data flow, type, or
invariant.

```
1. Open docs/ai/graph.md.
2. Update the relevant section(s):
   - Node Catalogue (if a file was added/changed)
   - IPC channel table (if a channel was added)
   - Critical Data Flows (if a flow changed)
   - Type Dependency Graph (if a type was added/moved)
   - File → Concept Map (if a new concern was introduced)
   - Key Invariants (if a new rule must be enforced)
3. Commit as: docs: update graph.md — <what changed>
```
