# Agent Plugins

> External agent plugins can improve the coding workflow, but repo-local docs
> remain the source of truth for PrismSQL.

## Recommended Plugin

Use `obra/superpowers` as the recommended Codex plugin for this repository.

Why it fits PrismSQL:

- It adds repeatable agent workflows for planning, debugging, testing, and
  verification.
- It complements the existing `AGENTS.md` and `docs/ai/*.md` guidance instead
  of changing application runtime behavior.
- It avoids adding app dependencies, generated plugin files, or vendored
  third-party source to the PrismSQL repo.

## Usage Rules

- Install and update the plugin in the Codex agent environment, not in this repo.
- Do not add `obra/superpowers` to `package.json` or `package-lock.json`.
- Do not commit a cloned `superpowers` plugin directory.
- Follow `docs/ai/graph.md` before any code change, even when a plugin suggests
  a workflow.
- Use `docs/ai/rules.md` for required test, Git, security, and PR rules.

## When to Consider Heavier Memory Tools

Use a memory backend such as `mem0` or an MCP memory service only if PrismSQL
itself needs an AI memory feature or the team needs shared cross-agent memory.
That is outside the current repo workflow and should be planned separately.
