# Security Checks

## Secret Scanning

PrismSQL uses Betterleaks for repository secret scanning. Betterleaks detects
hardcoded credentials such as API keys, tokens, passwords, and private keys in
Git history and files.

## Repo Policy

Secret scanning belongs in the repository, not only on one developer machine.
Local scans are useful, but CI is the shared safety net for open-source work.

Use both layers:

- CI: required on pull requests and pushes to `main`.
- Local: recommended before committing sensitive or generated changes.

## Local Commands

Install Betterleaks:

```bash
brew install betterleaks
```

Scan the Git repository:

```bash
betterleaks git . --redact
```

Scan staged changes before a commit:

```bash
betterleaks git . --pre-commit --staged --redact
```

Scan plain files without Git history:

```bash
betterleaks dir . --redact
```

## Handling Findings

1. Treat findings as real until proven otherwise.
2. Rotate any exposed live secret immediately.
3. Remove the secret from code and docs.
4. If the secret entered Git history, rewrite history only with maintainer
   agreement.
5. Use ignore comments or ignore files only for documented false positives.

## AI Agent Rule

Before committing code that touches configuration, credentials, environment
variables, logs, or generated docs, run a Betterleaks scan or confirm CI will run
one before merge.

