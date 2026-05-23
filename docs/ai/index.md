# AI Agent Knowledge Base

This folder keeps durable project context for AI agents such as Codex, Claude Code,
Antigravity, and other coding assistants.

## Contents

- `graph.md`: **start here for any structural or cross-cutting task** — full
  knowledge graph of every module, IPC channel, data flow, type dependency,
  invariant, and file-to-concept lookup table.
- `product-knowledge.md`: what PrismSQL is, who it serves, and its core flows.
- `rules.md`: coding, testing, Git, and PR rules for agents.
- `skills.md`: repeatable agent skills and workflows for this repo.
- `plugins.md`: recommended external agent plugins and boundaries.
- `beads.md`: how to use external Beads (`bd`) issue tracking.
- `security.md`: Betterleaks and sensitive-data scanning rules.
- `issues.md`: known issues and bug investigation records.
- `features.md`: product feature map and expected behavior.
- `plans.md`: planning conventions and active plans.
- `docs.md`: documentation maintenance rules.

## Operating Principle

Prefer evidence over assumptions. Inspect the code, reproduce the behavior, make a
small fix, verify it, and document the result where future agents can find it.
