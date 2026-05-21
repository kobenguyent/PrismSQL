import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConnectionManager } from '../src/main/db/manager'

// Mock electron-log so it doesn't break in test environment
vi.mock('electron-log', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  info: vi.fn(),
  error: vi.fn()
}))

// Mock the individual adapters so we don't need real DB connections
vi.mock('../src/main/db/adapters/mysql', () => ({
  MySQLAdapter: class {
    async connect() {}
    async disconnect() {}
    async query() { return { columns: [], rows: [], rowCount: 0, duration: 1 } }
    async getDatabases() { return ['testdb'] }
    async getTables() { return [{ name: 'users', type: 'table' }] }
    async getColumns() { return [] }
    async ping() { return true }
  }
}))

vi.mock('../src/main/db/adapters/postgres', () => ({
  PostgresAdapter: class {
    async connect() {}
    async disconnect() {}
    async query() { return { columns: [], rows: [], rowCount: 0, duration: 1 } }
    async getDatabases() { return ['postgres'] }
    async getTables() { return [] }
    async getColumns() { return [] }
    async ping() { return true }
  }
}))

vi.mock('../src/main/db/adapters/sqlite', () => ({
  SQLiteAdapter: class {
    async connect() {}
    async disconnect() {}
    async query() { return { columns: [], rows: [], rowCount: 0, duration: 1 } }
    async getDatabases() { return ['main'] }
    async getTables() { return [] }
    async getColumns() { return [] }
    async ping() { return true }
  }
}))

vi.mock('../src/main/db/adapters/mssql', () => ({
  MSSQLAdapter: class {
    async connect() {}
    async disconnect() {}
    async query() { return { columns: [], rows: [], rowCount: 0, duration: 1 } }
    async getDatabases() { return ['master'] }
    async getTables() { return [] }
    async getColumns() { return [] }
    async ping() { return true }
  }
}))

describe('ConnectionManager', () => {
  let manager: ConnectionManager

  beforeEach(() => {
    manager = new ConnectionManager()
  })

  it('starts with no active connections', () => {
    expect(manager.isConnected('any-id')).toBe(false)
  })

  it('connects successfully and marks connection as active', async () => {
    const config = {
      id: 'conn-1',
      name: 'Test MySQL',
      type: 'mysql' as const,
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'test'
    }
    const result = await manager.connect(config)
    expect(result.success).toBe(true)
    expect(manager.isConnected('conn-1')).toBe(true)
  })

  it('disconnects and removes connection', async () => {
    const config = {
      id: 'conn-2',
      name: 'Test PG',
      type: 'postgres' as const,
      host: 'localhost',
      port: 5432
    }
    await manager.connect(config)
    expect(manager.isConnected('conn-2')).toBe(true)
    await manager.disconnect('conn-2')
    expect(manager.isConnected('conn-2')).toBe(false)
  })

  it('queries a connected database', async () => {
    const config = {
      id: 'conn-3',
      name: 'Test SQLite',
      type: 'sqlite' as const,
      filename: ':memory:'
    }
    await manager.connect(config)
    const result = await manager.query('conn-3', 'SELECT 1')
    expect(result).toHaveProperty('rows')
    expect(result).toHaveProperty('columns')
    expect(result).toHaveProperty('duration')
  })

  it('throws when querying a non-connected ID', async () => {
    await expect(manager.query('no-such-id', 'SELECT 1')).rejects.toThrow('Not connected')
  })

  it('getDatabases returns list for connected ID', async () => {
    const config = {
      id: 'conn-4',
      name: 'Test MySQL2',
      type: 'mysql' as const,
      host: 'localhost'
    }
    await manager.connect(config)
    const dbs = await manager.getDatabases('conn-4')
    expect(Array.isArray(dbs)).toBe(true)
    expect(dbs).toContain('testdb')
  })

  it('disconnectAll clears all connections', async () => {
    const ids = ['a', 'b', 'c']
    for (const id of ids) {
      await manager.connect({ id, name: id, type: 'mysql' as const })
    }
    for (const id of ids) {
      expect(manager.isConnected(id)).toBe(true)
    }
    await manager.disconnectAll()
    for (const id of ids) {
      expect(manager.isConnected(id)).toBe(false)
    }
  })

  it('testConnection does not leave a persistent connection', async () => {
    const config = {
      id: 'test-only',
      name: 'Test',
      type: 'postgres' as const,
      host: 'localhost'
    }
    const result = await manager.testConnection(config)
    expect(result.success).toBe(true)
    // Should NOT have created a permanent connection entry
    expect(manager.isConnected('test-only')).toBe(false)
  })

  it('re-connects if already connected (replaces old connection)', async () => {
    const config = { id: 'conn-5', name: 'Dup', type: 'mysql' as const }
    await manager.connect(config)
    // Connect again — should not throw, should replace
    const result = await manager.connect(config)
    expect(result.success).toBe(true)
    expect(manager.isConnected('conn-5')).toBe(true)
  })
})
