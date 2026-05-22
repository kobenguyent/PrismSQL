# Agent Skills

Use these repeatable workflows when working in this repo.

## Bug Fix Skill

1. Read the failing UI or stack trace carefully.
2. Trace data flow from user action to state mutation.
3. Write a regression test that fails before the fix.
4. Apply the smallest code change that fixes the root cause.
5. Run targeted test, full test suite, and build.
6. Update Beads or `docs/ai/issues.md` with the outcome.

## PR Preparation Skill

1. Check `git status --short --branch`.
2. Inspect diff by file.
3. Stage only files that belong to the PR.
4. Confirm tests and build have run.
5. Push the branch and open a PR with root cause and verification notes.

## Secret Scan Skill

1. Run `betterleaks git . --redact` for repository history scans.
2. Run `betterleaks git . --pre-commit --staged --redact` before committing
   risky local changes.
3. Run `betterleaks dir . --redact` when checking generated files outside Git
   history.
4. Treat findings as blockers until reviewed.
5. Document false positives before suppressing them.

## Dependency Upgrade Skill

1. Keep upgrades separate from behavior fixes.
2. Check package engine requirements.
3. Run `npm audit --audit-level=moderate`.
4. Run `npm test`, `npm run build`, and `npx tsc --noEmit`.
5. Update README version and runtime prerequisites if they change.
