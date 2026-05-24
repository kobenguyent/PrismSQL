#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/sync-main.sh <type> <slug> [--title "<conventional title>"] [--commit "<message>"] [--base main]

What it does:
1) Fetches latest origin/main
2) Rebases current branch onto origin/main
3) Creates new branch <type>/<slug> from rebased current branch
4) Optionally commits changes (if --commit is provided)
5) Pushes branch and optionally opens PR (if gh + --title)

Examples:
  scripts/sync-main.sh fix sidebar-tooltip-overlap \
    --title "fix(sidebar): prevent header tooltip overlap and clipping" \
    --commit "fix(sidebar): prevent header tooltip overlap and clipping"
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
current_branch="$(git branch --show-current)"

if [[ "$current_branch" == "" ]]; then
  echo "Error: unable to detect current branch"
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
  echo "Error: local branch already exists: ${branch_name}"
  exit 1
fi

git fetch origin main
git rebase origin/main

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
