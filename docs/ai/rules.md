# Agent Rules

## Code Changes

- Keep changes focused on the user request.
- Follow existing project patterns before adding new abstractions.
- Do not rewrite unrelated files.
- Do not stage or commit unrelated dirty files.
- Use TypeScript types as contracts, not decoration.

## Debugging

- Reproduce or trace the failure before fixing.
- Identify the root cause in plain language.
- Add a regression test for bug fixes when practical.
- Verify the original failure mode is covered by the test.

## Testing

- Run a targeted test for the changed behavior.
- Run `npm test` before reporting completion.
- Run `npm run build` for renderer, preload, or Electron main changes.
- Report warnings separately from failures.

## Security

- Do not commit real credentials, tokens, database passwords, private keys, or
  copied `.env` values.
- Use Betterleaks for secret scanning in CI and before risky local commits.
- Redact secrets in logs, screenshots, prompts, and issue descriptions.
- Rotate any secret that was exposed in the repo or shared with an AI tool.

## Git And PRs

- Branch naming: `fix/<short-description>`, `feature/<short-description>`,
  `docs/<short-description>`, or `chore/<short-description>`.
- Commit message style: Conventional Commits format, for example
  `fix: prevent failed connection from persisting to sidebar`.
- PR title style: must be a valid Conventional Commit (`type: description`
  or `type(scope): description`), for example
  `fix: failed connection persistence`. The CI workflow enforces this
  automatically. Valid types: `fix`, `feat`, `ci`, `chore`, `docs`,
  `refactor`, `perf`, `test`.
- Keep dependency upgrades separate from product bug fixes.
