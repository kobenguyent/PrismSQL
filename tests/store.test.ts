import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// We need to mock `electron` because store.ts calls `app.getPath` and `safeStorage`
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir())
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((s: string) => Buffer.from(s)),
    decryptString: vi.fn((buf: Buffer) => buf.toString())
  }
}))

describe('Connection Store (persistence)', () => {
  const storePath = path.join(os.tmpdir(), 'connections.json')
  const settingsPath = path.join(os.tmpdir(), 'settings.json')

  beforeEach(() => {
    // Clean up any leftover file
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath)
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath)
  })

  afterEach(() => {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath)
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath)
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

  it('saveConnections persists passwords so saved connections can reconnect', async () => {
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
    expect(raw[0]).toHaveProperty('password', 'super-secret')
  })

  it('saveConnections encrypts passwords when safeStorage is available and loadConnections decrypts them', async () => {
    const electron = await import('electron')
    const mockSafe = electron.safeStorage as {
      isEncryptionAvailable: ReturnType<typeof vi.fn>
      encryptString: ReturnType<typeof vi.fn>
      decryptString: ReturnType<typeof vi.fn>
    }
    // Simulate encryption being available
    mockSafe.isEncryptionAvailable.mockReturnValueOnce(true)
    mockSafe.encryptString.mockReturnValueOnce(Buffer.from('ENCRYPTED'))
    mockSafe.decryptString.mockReturnValueOnce('super-secret')

    const { loadConnections, saveConnections } = await import('../src/main/store')
    saveConnections([{ id: 'c1', name: 'Enc', type: 'postgres', host: 'localhost', password: 'super-secret' }])

    const raw = JSON.parse(fs.readFileSync(storePath, 'utf-8')) as Array<Record<string, unknown>>
    // Stored password should carry the enc: prefix, not plaintext
    expect(raw[0].password as string).toMatch(/^enc:/)

    // loadConnections should decrypt it back to the original value
    const loaded = loadConnections()
    expect(loaded[0].password).toBe('super-secret')
  })

  it('loadConnections returns empty array on malformed JSON', async () => {
    fs.writeFileSync(storePath, 'not valid json', 'utf-8')
    const { loadConnections } = await import('../src/main/store')
    const result = loadConnections()
    expect(result).toEqual([])
  })

  it('loadSettings returns defaults when file is missing', async () => {
    const { loadSettings } = await import('../src/main/store')
    expect(loadSettings()).toEqual({ queryLimit: 100 })
  })

  it('loadSettings returns defaults on malformed JSON', async () => {
    fs.writeFileSync(settingsPath, '{bad json', 'utf-8')
    const { loadSettings } = await import('../src/main/store')
    expect(loadSettings()).toEqual({ queryLimit: 100 })
  })

  it('loadSettings sanitizes type and range for queryLimit', async () => {
    fs.writeFileSync(settingsPath, JSON.stringify({ queryLimit: '50000' }), 'utf-8')
    const { loadSettings } = await import('../src/main/store')
    expect(loadSettings()).toEqual({ queryLimit: 10000 })

    fs.writeFileSync(settingsPath, JSON.stringify({ queryLimit: -5 }), 'utf-8')
    expect(loadSettings()).toEqual({ queryLimit: 1 })
  })

  it('saveSettings sanitizes queryLimit before writing', async () => {
    const { saveSettings } = await import('../src/main/store')
    saveSettings({ queryLimit: 'abc' as unknown as number })
    const stored = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as { queryLimit: number }
    expect(stored.queryLimit).toBe(100)
  })
})
