# Product Knowledge

PrismSQL is an Electron desktop SQL client built with React and TypeScript. It
supports saved database connections, a schema browser, query tabs, saved queries,
and result export.

## Core User Flows

- Add or edit a database connection.
- Test and connect to a database.
- Browse databases, tables, views, columns, and routines.
- Open a table or routine into a query tab.
- Run SQL and inspect results.
- Save and reopen useful queries.

## Important Data Boundaries

- Connection credentials are handled in the Electron main process and persisted
  through `src/main/store.ts`.
- Renderer code talks to the main process through the preload `window.db` API.
- Database adapters live under `src/main/db/adapters/`.
- UI state is held in `src/renderer/src/store/index.ts`.

## User Trust Expectations

- A failed connection attempt must not create a saved connection.
- Saved credentials must be treated as sensitive.
- Generated SQL should be safe for unusual database, schema, table, and routine
  names.
- Errors should be visible to the user without silently changing persisted state.

