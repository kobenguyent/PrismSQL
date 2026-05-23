import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import Database from 'better-sqlite3'
import { ConnectionManager } from '../src/main/db/manager'
import type { ConnectionConfig } from '../src/main/db/types'

vi.mock('electron-log', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  info: vi.fn(),
  error: vi.fn()
}))

const tempDirs: string[] = []

function createLocalSqlitePath(): { dbFile: string; cleanupDir: string } {
  const cleanupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prismsql-e2e-'))
  tempDirs.push(cleanupDir)
  const dbFile = path.join(cleanupDir, 'app-data.sqlite')
  return { dbFile, cleanupDir }
}

function hasWorkingSqliteBinding(): boolean {
  try {
    const db = new Database(':memory:')
    db.prepare('SELECT 1').get()
    db.close()
    return true
  } catch {
    return false
  }
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  }
})

const describeIfSqliteAvailable = hasWorkingSqliteBinding() ? describe : describe.skip

describeIfSqliteAvailable('local DB e2e flows', () => {
  it('connects to a local sqlite database and reads schema/data like an end user', async () => {
    const { dbFile } = createLocalSqlitePath()
    const manager = new ConnectionManager()
    const config: ConnectionConfig = {
      id: 'sqlite-local',
      name: 'Local SQLite',
      type: 'sqlite',
      filename: dbFile
    }

    const testResult = await manager.testConnection(config)
    expect(testResult.success).toBe(true)

    const connectResult = await manager.connect(config)
    expect(connectResult).toEqual({ success: true })
    expect(manager.isConnected(config.id)).toBe(true)

    await manager.query(
      config.id,
      `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      );
      `
    )
    await manager.query(
      config.id,
      "INSERT INTO users (email, active) VALUES ('alice@example.com', 1), ('bob@example.com', 0);"
    )

    const databases = await manager.getDatabases(config.id)
    expect(databases).toContain('main')

    const tables = await manager.getTables(config.id, 'main')
    expect(tables.some((t) => t.name === 'users')).toBe(true)

    const columns = await manager.getColumns(config.id, 'users', 'main')
    const idCol = columns.find((c) => c.name === 'id')
    expect(idCol?.primaryKey).toBe(true)

    const queryResult = await manager.query(
      config.id,
      'SELECT id, email, active FROM users ORDER BY id;'
    )
    expect(queryResult.error).toBeUndefined()
    expect(queryResult.rowCount).toBe(2)
    expect(queryResult.rows[0]?.email).toBe('alice@example.com')

    const version = await manager.getServerVersion(config.id)
    expect(version).not.toBe('Unknown')
    expect(version).toMatch(/\d+\.\d+/)

    await manager.disconnectAll()
    expect(manager.isConnected(config.id)).toBe(false)
  })

  it('supports write + read querying against local sqlite data', async () => {
    const { dbFile } = createLocalSqlitePath()
    const manager = new ConnectionManager()
    const config: ConnectionConfig = {
      id: 'sqlite-write',
      name: 'Local SQLite Write',
      type: 'sqlite',
      filename: dbFile
    }

    await manager.connect(config)
    await manager.query(
      config.id,
      `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO users (email, active) VALUES ('bob@example.com', 0);
      `
    )

    const updateResult = await manager.query(
      config.id,
      "UPDATE users SET active = 1 WHERE email = 'bob@example.com';"
    )
    expect(updateResult.error).toBeUndefined()
    expect(updateResult.rowCount).toBe(1)

    const verifyResult = await manager.query(
      config.id,
      "SELECT active FROM users WHERE email = 'bob@example.com';"
    )
    expect(verifyResult.error).toBeUndefined()
    expect(verifyResult.rows[0]?.active).toBe(1)

    await manager.disconnectAll()
  })
})
