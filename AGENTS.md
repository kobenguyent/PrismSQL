# Agent Guide

This repository uses repo-local guidance for AI coding agents. Start with:

- `docs/ai/index.md` for the map of agent-facing docs.
- `docs/ai/rules.md` for required engineering rules.
- `docs/ai/beads.md` for Beads (`bd`) issue tracking.
- `docs/ai/issues.md` for the current known issue context.
- `docs/ai/plugins.md` for recommended external agent plugins.

## Required Workflow

1. Read `docs/ai/graph.md` first — it is the complete relationship map of every
   module, IPC channel, data flow, and invariant in the codebase.
2. Then read any other relevant `docs/ai/*.md` file before changing code.
3. Keep PRs narrowly scoped.
3. Do not stage unrelated local changes.
4. Run the smallest relevant test first, then the full suite before completion.
5. For bug fixes, capture the root cause, the fix, and verification evidence.

## Recommended Agent Plugin

Use the `obra/superpowers` plugin in the Codex agent environment when it is
available. Treat it as workflow support only: do not vendor the plugin into this
repository, do not add it as an npm dependency, and do not let it override the
repo-local guidance in `AGENTS.md` and `docs/ai/*.md`.
