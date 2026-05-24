#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/create-pr.sh <type> <slug> [--title "<conventional title>"] [--commit "<message>"] [--base main]

Examples:
  scripts/create-pr.sh fix sidebar-tooltip-overlap \
    --title "fix(sidebar): prevent header tooltip overlap and clipping" \
    --commit "fix(sidebar): prevent header tooltip overlap and clipping"

  scripts/create-pr.sh feat ai-toolbar-improvements \
    --commit "feat(ai): improve query editor AI toolbar"

Notes:
- Branch name is always: <type>/<slug>
- Allowed types: fix feat chore docs refactor perf test ci
- If --commit is provided, script stages all tracked/untracked changes and commits.
- If gh is available and --title is provided, script opens a PR.
USAGE
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

type="$1"
slug="$2"
shift 2

case "$type" in
  fix|feat|chore|docs|refactor|perf|test|ci) ;;
  *)
    echo "Error: invalid type '$type'."
    usage
    exit 1
    ;;
esac

if [[ ! "$slug" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: slug must match ^[a-z0-9-]+$"
  exit 1
fi

pr_title=""
commit_msg=""
base_branch="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      pr_title="${2:-}"
      shift 2
      ;;
    --commit)
      commit_msg="${2:-}"
      shift 2
      ;;
    --base)
      base_branch="${2:-main}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      usage
      exit 1
      ;;
  esac
done

branch_name="${type}/${slug}"

if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
  echo "Error: local branch already exists: ${branch_name}"
  exit 1
fi

git checkout -b "$branch_name"

if [[ -n "$commit_msg" ]]; then
  git add -A
  if git diff --cached --quiet; then
    echo "No staged changes to commit."
  else
    git commit -m "$commit_msg"
  fi
fi

git push -u origin "$branch_name"

echo "Branch pushed: $branch_name"

if command -v gh >/dev/null 2>&1 && [[ -n "$pr_title" ]]; then
  gh pr create --base "$base_branch" --head "$branch_name" --title "$pr_title" --fill-first || true
  echo "PR creation attempted via gh."
else
  echo "Open PR manually: https://github.com/kobenguyent/KobeanSQL/pull/new/${branch_name}"
fi
