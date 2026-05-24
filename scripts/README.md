# PR Scripts (Quick Help)

## 1) Create branch + push + PR
`./scripts/create-pr.sh <type> <slug> [--title "..."] [--commit "..."] [--base main]`

Example:
`./scripts/create-pr.sh fix sidebar-tooltip-overlap --commit "fix(sidebar): prevent tooltip overlap" --title "fix(sidebar): prevent tooltip overlap"`

## 2) Sync with latest main + create branch + push + PR
`./scripts/sync-main.sh <type> <slug> [--title "..."] [--commit "..."] [--base main]`

Example:
`./scripts/sync-main.sh feat ai-toolbar --commit "feat(ai): improve toolbar" --title "feat(ai): improve toolbar"`

## Naming convention
- Branch: `<type>/<slug>`
- Allowed `type`: `fix feat chore docs refactor perf test ci`
- `slug`: lowercase kebab-case (`a-z`, `0-9`, `-`)
