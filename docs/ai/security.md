# Security

> **AI agents must read this file before committing any change that touches
> configuration, credentials, environment variables, logs, or generated files.**

---

## Threat Model

PrismSQL stores database credentials locally. The primary risks are:

1. **Credential leakage** — passwords committed to the repo in plaintext.
2. **Secret exposure via AI tools** — credentials pasted into prompts or
   screenshots shared with LLMs.
3. **Supply-chain secrets** — tokens embedded in dependencies or CI configs.

---

## Credential Handling Rules

| Rule | Rationale |
|---|---|
| Passwords encrypted at rest with `safeStorage` | OS keychain-backed encryption per user |
| `enc:` prefix marks encrypted values in `connections.json` | Allows legacy fallback without silent corruption |
| Main process never logs raw passwords | `electron-log` is not encrypted |
| Renderer never receives plaintext passwords beyond what the user typed | IPC boundary enforced in `preload/index.ts` |
| No `.env` files committed | Use system env or OS keychain |

---

## Secret Scanning with Betterleaks

### Install
```bash
brew install betterleaks
```

### When to scan

| Situation | Command |
|---|---|
| Before committing anything sensitive | `betterleaks git . --pre-commit --staged --redact` |
| Full repo history audit | `betterleaks git . --redact` |
| Generated output files outside Git | `betterleaks dir . --redact` |

### CI
Secret scanning runs automatically on all PRs and pushes to `main`. A failing
scan **blocks merge**.

---

## Handling a Finding

1. **Treat it as real** until confirmed otherwise — do not dismiss.
2. **Rotate the secret immediately** if it was ever pushed to a remote.
3. **Remove** from code, docs, screenshots, and AI prompt history.
4. **Rewrite Git history** only with maintainer agreement.
5. **Document false positives** with an inline comment or ignore entry before
   suppressing — never silently suppress.

---

## What AI Agents Must Never Do

- Commit real credentials, tokens, passwords, or private keys.
- Include real connection strings or passwords in issue descriptions, PR bodies,
  or chat prompts.
- Store secrets in `docs/ai/*.md` files — these are committed to the repo.
- Log passwords via `electron-log` or `console.*`.
- Skip a Betterleaks scan when touching config or env-adjacent files.

