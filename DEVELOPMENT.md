# Development

## Database Schema Visualizer E2E Test System

### Architecture flow

```text
Playwright Test Controller
        |
        | seeds SQLite via scripts/setup-test-db.ts
        v
  Local SQLite DB (.sqlite)
        |
        | connection form values (renderer UI)
        v
Electron Renderer (React + React Flow)
        ^
        | IPC: db:testConnection / db:connect / db:get-schema
        |
Electron Main (ConnectionManager + SQLite adapter)
```

### E2E environment setup

```bash
npm install --ignore-scripts
npm run rebuild:sqlite
npx playwright install
```

> Linux CI/headless: run Electron Playwright tests through `xvfb-run -a` (already baked into npm scripts).

### Run commands

```bash
npm run test:e2e:visualizer
npm run test:e2e:visualizer:update
```

### Visual review lifecycle

- Documentation image output: `./docs/screenshots/database-visualizer.png`
- Snapshot baseline path: `./tests/database-visualizer.spec.ts-snapshots/`
- To refresh snapshot baselines after intentional UI/layout updates:

```bash
npm run test:e2e:visualizer:update
```
