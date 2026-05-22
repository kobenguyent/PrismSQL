# Documentation Rules

> Documentation is a first-class deliverable. Outdated docs are a bug.

---

## What to Update and When

| Doc | Update when… |
|---|---|
| `README.md` | Install steps, runtime requirements, build commands, or release notes change |
| `docs/ai/graph.md` | Any module, IPC channel, data flow, type, or invariant is added or changed |
| `docs/ai/features.md` | Expected user-visible behavior changes |
| `docs/ai/issues.md` | A bug is investigated, fixed, or closed |
| `docs/ai/plans.md` | A plan is created, moves to in-progress, or completes |
| `docs/ai/rules.md` | A new engineering rule is adopted or an existing one is revised |
| `docs/ai/skills.md` | A repeatable workflow is added or improved |
| `docs/ai/security.md` | A security policy or scanning procedure changes |
| `docs/ai/product-knowledge.md` | Core flows, boundaries, or user trust expectations change |

---

## Writing Style

- **Concise** — every sentence earns its place.
- **Exact** — use real file paths, real commands, real type names.
- **Factual** — separate facts from recommendations; label opinions as such.
- **Present tense** — describe what *is*, not what *was* planned.
- **No temporary notes** in permanent docs unless they explain a durable
  decision (e.g. why a tradeoff was made).

---

## Format Conventions

- Use Markdown tables for structured comparisons and maps.
- Use fenced code blocks with language tags for all code and commands.
- Use `**bold**` for emphasis on key terms; avoid ALL CAPS.
- Headings: `##` for top-level sections, `###` for subsections — no deeper.
- Each doc starts with a one-sentence purpose statement or a `> note` block.

---

## graph.md is the Authority

`docs/ai/graph.md` is the single authoritative structural map of the codebase.
It takes precedence over all other docs for questions about "what file does X"
or "what calls Y". When in doubt, trust `graph.md` and update the other docs
to match.

See `docs/ai/skills.md` — **Skill: Update the Knowledge Graph** for the exact
workflow.

