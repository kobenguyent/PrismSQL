# Beads Issue Tracking

PrismSQL uses external Beads (`bd`) as the preferred issue tracker for durable
agent memory when the CLI is available.

Beads is a git-backed issue tracker designed for AI-supervised coding workflows.
It stores issue data in the repository, supports dependency-aware queues, and can
be used by coding agents across sessions.

## Setup

Install Beads once on the machine, then initialize it in this repository:

```bash
brew install beads
bd init
```

If Homebrew is not available, use the official installer from the Beads project.

## Common Commands

```bash
bd create "Fix failed connection persistence" --type bug --priority 1
bd list
bd ready
bd show <issue-id>
bd close <issue-id>
```

## Agent Rules For Beads

- Create a Beads issue for bugs discovered during development.
- Use type `bug`, `feature`, `task`, `epic`, or `chore`.
- Use priority `0` for critical, `1` for high, `2` for medium, `3` for low,
  and `4` for backlog.
- Link discovered work back to the original issue when the CLI supports it.
- Close the Beads issue only after the code is committed and verification passes.

## Current Beads Setup Status

Beads is initialized for this repository.

- CLI: `bd version 1.0.4`
- Prefix: `prismsql`
- Current bug issue: `prismsql-dc5`
- Current Betterleaks task: `prismsql-zkp`
