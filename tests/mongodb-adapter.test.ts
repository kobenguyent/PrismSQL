import { beforeEach, describe, expect, it, vi } from 'vitest'

const docs = [
  { _id: { toHexString: () => 'abc123' }, name: 'Ada', active: true, score: 42, nested: { level: 1 } },
  { _id: { toString: () => 'def456' }, name: 'Grace', createdAt: new Date('2024-01-01T00:00:00.000Z') }
]

const findLimit = vi.fn()
const findToArray = vi.fn()
const aggregateToArray = vi.fn()
const connect = vi.fn()
const close = vi.fn()
const db = vi.fn()
const command = vi.fn()
const listDatabases = vi.fn()
const listCollectionsToArray = vi.fn()

vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(function MongoClientMock() {
    return {
    connect,
    close,
    db
    }
  })
}))

describe('MongoDBAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findLimit.mockReturnThis()
    findToArray.mockResolvedValue(docs)
    aggregateToArray.mockResolvedValue([{ status: 'open', total: 2 }])
    connect.mockResolvedValue(undefined)
    close.mockResolvedValue(undefined)
    command.mockResolvedValue({ ok: 1, version: '7.0.4' })
    listDatabases.mockResolvedValue({ databases: [{ name: 'admin' }, { name: 'app' }] })
    listCollectionsToArray.mockResolvedValue([{ name: 'users' }, { name: 'orders' }])
    db.mockReturnValue({
      admin: () => ({ listDatabases }),
      command,
      listCollections: () => ({ toArray: listCollectionsToArray }),
      collection: () => ({
        find: vi.fn(() => ({ limit: findLimit, toArray: findToArray })),
        aggregate: vi.fn(() => ({ toArray: aggregateToArray }))
      })
    })
  })

  it('connects using URI mode with server selection timeout', async () => {
    const { MongoClient } = await import('mongodb')
    const { MongoDBAdapter } = await import('../src/main/db/adapters/mongodb')
    const adapter = new MongoDBAdapter()

    await adapter.connect({
      id: 'mongo-1',
      name: 'Atlas',
      type: 'mongodb',
      connectionUri: 'mongodb+srv://user:pass@example.mongodb.net/app' // betterleaks:allow - test fixture
    })

    expect(MongoClient).toHaveBeenCalledWith('mongodb+srv://user:pass@example.mongodb.net/app', { // betterleaks:allow - test fixture
      serverSelectionTimeoutMS: 10000
    })
    expect(adapter.isConnected()).toBe(true)
  })

  it('connects using manual host fields and default database fallback', async () => {
    const { MongoClient } = await import('mongodb')
    const { MongoDBAdapter } = await import('../src/main/db/adapters/mongodb')
    const adapter = new MongoDBAdapter()

    await adapter.connect({
      id: 'mongo-2',
      name: 'Local Mongo',
      type: 'mongodb',
      host: 'localhost',
      port: 27018,
      user: 'root',
      password: 'secret'
    })

    expect(MongoClient).toHaveBeenCalledWith('mongodb://root:secret@localhost:27018/admin', { // betterleaks:allow - test fixture
      serverSelectionTimeoutMS: 10000
    })
  })

  it('lists databases, collections, and inferred top-level fields', async () => {
    const { MongoDBAdapter } = await import('../src/main/db/adapters/mongodb')
    const adapter = new MongoDBAdapter()
    await adapter.connect({ id: 'mongo-3', name: 'Mongo', type: 'mongodb', host: 'localhost' })

    await expect(adapter.getDatabases()).resolves.toEqual(['admin', 'app'])
    await expect(adapter.getTables('app')).resolves.toEqual([
      { name: 'users', type: 'table' },
      { name: 'orders', type: 'table' }
    ])
    await expect(adapter.getColumns('users', 'app')).resolves.toEqual([
      { name: '_id', type: 'object', nullable: false, primaryKey: true },
      { name: 'active', type: 'boolean', nullable: false, primaryKey: false },
      { name: 'createdAt', type: 'date', nullable: false, primaryKey: false },
      { name: 'name', type: 'string', nullable: false, primaryKey: false },
      { name: 'nested', type: 'object', nullable: false, primaryKey: false },
      { name: 'score', type: 'number', nullable: false, primaryKey: false }
    ])
  })

  it('runs read-only find and aggregate queries', async () => {
    const { MongoDBAdapter } = await import('../src/main/db/adapters/mongodb')
    const adapter = new MongoDBAdapter()
    await adapter.connect({ id: 'mongo-4', name: 'Mongo', type: 'mongodb', database: 'app' })

    const findResult = await adapter.query('db.users.find({"active":true}).limit(2)')
    expect(findLimit).toHaveBeenCalledWith(2)
    expect(findResult.rowCount).toBe(2)
    expect(findResult.rows[0]).toMatchObject({ _id: 'abc123', name: 'Ada', active: true })

    const aggregateResult = await adapter.query('db.orders.aggregate([{"$match":{"status":"open"}}])')
    expect(aggregateResult.rows).toEqual([{ status: 'open', total: 2 }])
  })

  it('rejects write commands without touching the driver', async () => {
    const { MongoDBAdapter } = await import('../src/main/db/adapters/mongodb')
    const adapter = new MongoDBAdapter()
    await adapter.connect({ id: 'mongo-5', name: 'Mongo', type: 'mongodb', database: 'app' })

    const result = await adapter.query('db.users.insertOne({"name":"Ada"})')

    expect(result.error).toBe('MongoDB read-only mode: write/admin commands are not allowed')
    expect(findToArray).not.toHaveBeenCalled()
  })

  it('disconnects the Mongo client', async () => {
    const { MongoDBAdapter } = await import('../src/main/db/adapters/mongodb')
    const adapter = new MongoDBAdapter()
    await adapter.connect({ id: 'mongo-6', name: 'Mongo', type: 'mongodb' })

    await adapter.disconnect()

    expect(close).toHaveBeenCalled()
    expect(adapter.isConnected()).toBe(false)
  })
})
