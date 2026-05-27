import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionConfig } from '../src/renderer/src/types'
import {
  buildInlineUpdateSql,
  buildDeleteSql,
  canPreviewCellValue,
  getSelectedVisibleRows,
  getVisibleRowSelectionRange,
  quoteIdentifierForDb,
  quoteValueForDb
} from '../src/renderer/src/components/ResultsTable'
import { formatServerVersion } from '../src/renderer/src/utils/version'

type DbApi = NonNullable<(typeof globalThis & { window?: { db?: unknown } })['window']>['db']

function createDbMock(overrides: Partial<Record<string, unknown>> = {}): DbApi {
  return {
    getConnections: vi.fn().mockResolvedValue([]),
    saveConnection: vi.fn().mockResolvedValue({ success: true }),
    deleteConnection: vi.fn().mockResolvedValue({ success: true }),
    testConnection: vi.fn().mockResolvedValue({ success: true }),
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
    isConnected: vi.fn().mockResolvedValue(false),
    query: vi.fn().mockResolvedValue({ columns: [], rows: [], rowCount: 0, duration: 1 }),
    getDatabases: vi.fn().mockResolvedValue([]),
    getTables: vi.fn().mockResolvedValue([]),
    getColumns: vi.fn().mockResolvedValue([]),
    getProcedures: vi.fn().mockResolvedValue([]),
    getSavedQueries: vi.fn().mockResolvedValue([]),
    saveQuery: vi.fn().mockResolvedValue({ success: true }),
    deleteQuery: vi.fn().mockResolvedValue({ success: true }),
    getServerVersion: vi.fn().mockResolvedValue({ version: 'Unknown' }),
    getSettings: vi.fn().mockResolvedValue({ queryLimit: 100 }),
    saveSettings: vi.fn().mockResolvedValue({ success: true }),
    ...(overrides as DbApi)
  }
}

async function loadStoreWithDb(db: DbApi) {
  vi.resetModules()
  ;(globalThis as typeof globalThis & { window?: { db: DbApi } }).window = { db }
  const { useAppStore } = await import('../src/renderer/src/store')
  return useAppStore
}

describe('E2E feature flows', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not restore server version after disconnect if async version arrives late', async () => {
    let resolveVersion: ((value: { version: string }) => void) | null = null
    const delayedVersionPromise = new Promise<{ version: string }>((resolve) => {
      resolveVersion = resolve
    })
    const db = createDbMock({
      getServerVersion: vi.fn().mockReturnValue(delayedVersionPromise)
    })

    const useAppStore = await loadStoreWithDb(db)
    const config: ConnectionConfig = { id: 'c1', name: 'Prod PG', type: 'postgres', host: 'localhost' }
    useAppStore.setState({ connections: [config] })

    await useAppStore.getState().connect(config)
    await useAppStore.getState().disconnect(config.id)

    resolveVersion?.({ version: 'PostgreSQL 16.4 on x86_64' })
    await Promise.resolve()
    await Promise.resolve()

    expect(useAppStore.getState().connectedIds.has(config.id)).toBe(false)
    expect(useAppStore.getState().connectionVersions[config.id]).toBeUndefined()
  })

  it('opens table tabs using settings queryLimit and correct dialect SQL', async () => {
    const db = createDbMock({
      query: vi.fn().mockResolvedValue({ columns: [], rows: [], rowCount: 0, duration: 3 })
    })
    const useAppStore = await loadStoreWithDb(db)
    useAppStore.setState({
      settings: { queryLimit: 25 },
      connectedIds: new Set(['mssql-1', 'pg-1']),
      connections: [
        { id: 'mssql-1', name: 'SQL Server', type: 'mssql' },
        { id: 'pg-1', name: 'PG', type: 'postgres' }
      ] as ConnectionConfig[]
    })

    await useAppStore.getState().openTableInTab('mssql-1', 'Orders', 'salesdb', 'reporting')
    await useAppStore.getState().openTableInTab('pg-1', 'users', 'appdb')

    const sqlTabs = useAppStore.getState().tabs.map((t) => t.sql)
    expect(sqlTabs).toContain('SELECT TOP 25 * FROM [reporting].[Orders];')
    expect(sqlTabs).toContain('SELECT * FROM "appdb"."users" LIMIT 25;')
  })

  it('caps query history at 200 entries and keeps newest first', async () => {
    const db = createDbMock()
    const useAppStore = await loadStoreWithDb(db)

    for (let queryIndex = 0; queryIndex < 205; queryIndex++) {
      useAppStore.getState().addToHistory({
        id: `h-${queryIndex}`,
        sql: `SELECT ${queryIndex}`,
        connectionId: 'c1',
        connectionName: 'Conn',
        timestamp: queryIndex,
        duration: queryIndex,
        rowCount: queryIndex
      })
    }

    const history = useAppStore.getState().queryHistory
    expect(history).toHaveLength(200)
    expect(history[0].id).toBe('h-204')
    expect(history[199].id).toBe('h-5')
  })
})

describe('SQL and status formatting helpers', () => {
  it('formats server versions using the first numeric token', () => {
    expect(formatServerVersion('PostgreSQL 16.3 on x86_64')).toBe('v16.3')
    expect(formatServerVersion('Microsoft SQL Server 2022 (RTM-CU10)')).toBe('v2022')
  })

  it('escapes identifiers and literals per dialect for inline update SQL', () => {
    expect(quoteIdentifierForDb('we]rd', 'mssql')).toBe('[we]]rd]')
    expect(quoteIdentifierForDb('na`me', 'mysql')).toBe('`na``me`')
    expect(quoteValueForDb(true, 'mssql')).toBe('1')
    expect(quoteValueForDb("O'Hara\\path", 'postgres')).toBe("'O''Hara\\path'")
    expect(quoteValueForDb("O'Hara\\path", 'mysql')).toBe("'O''Hara\\\\path'")
    expect(quoteValueForDb("O'Hara\\path", 'mariadb')).toBe("'O''Hara\\\\path'")
  })

  it('builds PK-scoped update SQL using schema-qualified table names', () => {
    const sql = buildInlineUpdateSql(
      { id: 5, name: 'before' },
      'name',
      'after',
      [{ name: 'id', type: 'int', nullable: false, primaryKey: true }],
      'users',
      'appdb',
      'tenant-a',
      'postgres'
    )

    expect(sql).toBe('UPDATE "tenant-a"."users"\nSET "name" = \'after\'\nWHERE "id" = 5;')
  })

  it('builds PK-scoped delete SQL using schema-qualified table names', () => {
    const sql = buildDeleteSql(
      { id: 7, name: 'to-delete' },
      [{ name: 'id', type: 'int', nullable: false, primaryKey: true }],
      'users',
      'appdb',
      'tenant-a',
      'postgres'
    )
    expect(sql).toBe('DELETE FROM "tenant-a"."users"\nWHERE "id" = 7;')
  })

  it('returns null from buildDeleteSql when no PK columns provided', () => {
    const sql = buildDeleteSql(
      { id: 1 },
      [],
      'users',
      undefined,
      undefined,
      'postgres'
    )
    expect(sql).toBeNull()
  })

  it('marks multiline or very long values as previewable cell content', () => {
    expect(canPreviewCellValue('short text')).toBe(false)
    expect(canPreviewCellValue(`line 1\nline 2`)).toBe(true)
    expect(canPreviewCellValue('x'.repeat(101))).toBe(true)
  })

  it('builds shift-selection ranges from the current visible row order', () => {
    const visibleRows = [{ index: 4 }, { index: 1 }, { index: 7 }]

    expect(getVisibleRowSelectionRange(visibleRows, 4, 7)).toEqual([4, 1, 7])
    expect(getVisibleRowSelectionRange(visibleRows, 7, 4)).toEqual([4, 1, 7])
    expect(getVisibleRowSelectionRange(visibleRows, 99, 1)).toEqual([1])
  })

  it('limits copy/delete selections to rows still visible after filtering', () => {
    const visibleRows = [
      { index: 7, original: { id: 7, name: 'visible-a' } },
      { index: 2, original: { id: 2, name: 'visible-b' } }
    ]
    const selectedRows = new Set([2, 5, 7])

    expect(getSelectedVisibleRows(visibleRows, selectedRows)).toEqual(visibleRows)
  })
})
