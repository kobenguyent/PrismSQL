import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// We need to mock `electron` because store.ts calls `app.getPath`
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir())
  }
}))

describe('Connection Store (persistence)', () => {
  const storePath = path.join(os.tmpdir(), 'connections.json')

  beforeEach(() => {
    // Clean up any leftover file
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath)
  })

  afterEach(() => {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath)
  })

  it('loadConnections returns empty array when no file exists', async () => {
    const { loadConnections } = await import('../src/main/store')
    const result = loadConnections()
    expect(result).toEqual([])
  })

  it('saveConnections persists data and loadConnections reads it back', async () => {
    const { loadConnections, saveConnections } = await import('../src/main/store')

    const conns = [
      { id: 'c1', name: 'Local PG', type: 'postgres' as const, host: 'localhost', port: 5432 },
      { id: 'c2', name: 'Local MySQL', type: 'mysql' as const, host: 'localhost', port: 3306 }
    ]

    saveConnections(conns)
    const loaded = loadConnections()
    expect(loaded).toHaveLength(2)
    expect(loaded[0].name).toBe('Local PG')
    expect(loaded[1].type).toBe('mysql')
  })

  it('saveConnections does not persist plaintext passwords', async () => {
    const { saveConnections } = await import('../src/main/store')
    saveConnections([
      {
        id: 'c1',
        name: 'Secret',
        type: 'postgres',
        host: 'localhost',
        password: 'super-secret'
      }
    ])

    const raw = JSON.parse(fs.readFileSync(storePath, 'utf-8')) as Array<Record<string, unknown>>
    expect(raw[0]).not.toHaveProperty('password')
  })

  it('loadConnections returns empty array on malformed JSON', async () => {
    fs.writeFileSync(storePath, 'not valid json', 'utf-8')
    const { loadConnections } = await import('../src/main/store')
    const result = loadConnections()
    expect(result).toEqual([])
  })
})
