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
- Commit message style: Conventional Commits — `<type>: <description>`, for example
  `fix: connection error not shown in modal` or `feat: add saved query categories`.
  Allowed types: `fix`, `feat`, `docs`, `chore`, `refactor`, `test`, `style`.
- PR title style: must follow the same Conventional Commits convention as the commit
  message — `fix: <short description>`, `feat: <short description>`, etc.
  Examples: `fix: connection error handling`, `feat: sidebar resize`.
- Keep dependency upgrades separate from product bug fixes.
