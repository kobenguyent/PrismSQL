import { MongoClient } from 'mongodb'
import { DatabaseAdapter } from '../adapter'
import { ColumnInfo, ConnectionConfig, ForeignKeyInfo, ProcedureInfo, QueryResult, TableInfo } from '../types'
import { resolveConnectionConfig } from '../connection-uri'

type MongoReadOperation =
  | {
      kind: 'find'
      collection: string
      filter: Record<string, unknown>
      projection?: Record<string, unknown>
      limit?: number
    }
  | {
      kind: 'aggregate'
      collection: string
      pipeline: Record<string, unknown>[]
    }

const READ_ONLY_ERROR = 'MongoDB read-only mode: write/admin commands are not allowed'
const WRITE_OR_ADMIN_COMMANDS = [
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'drop',
  'dropDatabase',
  'createIndex',
  'createIndexes',
  'dropIndex',
  'dropIndexes',
  'bulkWrite',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'runCommand'
]

function splitTopLevelArgs(args: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let inString = false
  let escaped = false

  for (const char of args) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && inString) {
      current += char
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      current += char
      continue
    }
    if (!inString && (char === '{' || char === '[')) depth += 1
    if (!inString && (char === '}' || char === ']')) depth -= 1
    if (!inString && depth === 0 && char === ',') {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseJsonArg<T>(value: string, fallback: T): T {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error('MongoDB query arguments must be valid JSON')
  }
}

export function parseMongoOperation(query: string): MongoReadOperation {
  const sql = query.trim().replace(/;$/, '')
  const writePattern = new RegExp(`\\.(${WRITE_OR_ADMIN_COMMANDS.join('|')})\\s*\\(`, 'i')
  if (writePattern.test(sql)) throw new Error(READ_ONLY_ERROR)

  const findMatch = /^db\.([A-Za-z0-9_$-]+)\.find\((.*?)\)(?:\.limit\((\d+)\))?$/.exec(sql)
  if (findMatch) {
    const [, collection, rawArgs, rawLimit] = findMatch
    const [filterArg = '{}', projectionArg] = splitTopLevelArgs(rawArgs)
    return {
      kind: 'find',
      collection,
      filter: parseJsonArg<Record<string, unknown>>(filterArg, {}),
      projection: projectionArg ? parseJsonArg<Record<string, unknown>>(projectionArg, {}) : undefined,
      limit: rawLimit ? Number.parseInt(rawLimit, 10) : undefined
    }
  }

  const aggregateMatch = /^db\.([A-Za-z0-9_$-]+)\.aggregate\((.*)\)$/.exec(sql)
  if (aggregateMatch) {
    const [, collection, rawPipeline] = aggregateMatch
    const pipeline = parseJsonArg<Record<string, unknown>[]>(rawPipeline, [])
    if (!Array.isArray(pipeline)) throw new Error('MongoDB aggregate pipeline must be a JSON array')
    return { kind: 'aggregate', collection, pipeline }
  }

  throw new Error('Unsupported MongoDB query.')
}

function inferMongoType(value: unknown): string {
  if (value === null || value === undefined) return 'unknown'
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function normalizeMongoValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeMongoValue)
  if (value && typeof value === 'object') {
    if ('toHexString' in value && typeof value.toHexString === 'function') {
      return value.toHexString()
    }
    const normalized: Record<string, unknown> = {}
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      normalized[key] = normalizeMongoValue(nestedValue)
    }
    return normalized
  }
  return value
}

function normalizeMongoDocument(document: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(document)) {
    normalized[key] = normalizeMongoValue(value)
  }
  return normalized
}

function buildColumnsFromRows(rows: Record<string, unknown>[]): QueryResult['columns'] {
  const fields = new Map<string, string>()
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!fields.has(key) || fields.get(key) === 'unknown') {
        fields.set(key, inferMongoType(value))
      }
    }
  }
  return Array.from(fields.entries()).map(([name, type]) => ({
    name,
    type,
    nullable: true,
    primaryKey: name === '_id'
  }))
}

function buildManualMongoUri(config: ConnectionConfig): string {
  const host = encodeURIComponent(config.host || 'localhost')
  const port = config.port || 27017
  const database = encodeURIComponent(config.database || 'admin')
  const credentials =
    config.user || config.password
      ? `${encodeURIComponent(config.user || '')}:${encodeURIComponent(config.password || '')}@`
      : ''
  return `mongodb://${credentials}${host}:${port}/${database}`
}

export class MongoDBAdapter implements DatabaseAdapter {
  private client: MongoClient | null = null
  private config: ConnectionConfig | null = null
  private connected = false

  async connect(config: ConnectionConfig): Promise<void> {
    const resolvedConfig = resolveConnectionConfig(config)
    const uri = resolvedConfig.connectionUri?.trim() || buildManualMongoUri(resolvedConfig)
    this.config = resolvedConfig
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })
    await this.client.connect()
    this.connected = true
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
    }
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  async query(sql: string): Promise<QueryResult> {
    const start = Date.now()
    try {
      if (!this.client) throw new Error('Not connected')
      const operation = parseMongoOperation(sql)
      const dbName = this.config?.database || 'admin'
      const collection = this.client.db(dbName).collection(operation.collection)
      const documents =
        operation.kind === 'find'
          ? await collection
              .find(operation.filter, operation.projection ? { projection: operation.projection } : undefined)
              .limit(operation.limit ?? 100)
              .toArray()
          : await collection.aggregate(operation.pipeline).toArray()
      const rows = documents.map((document) => normalizeMongoDocument(document as Record<string, unknown>))
      return {
        columns: buildColumnsFromRows(rows),
        rows,
        rowCount: rows.length,
        duration: Date.now() - start
      }
    } catch (err) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        duration: Date.now() - start,
        error: (err as Error).message
      }
    }
  }

  async getDatabases(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected')
    const result = await this.client.db('admin').admin().listDatabases()
    return result.databases.map((database) => database.name)
  }

  async getTables(database?: string): Promise<TableInfo[]> {
    if (!this.client) throw new Error('Not connected')
    const dbName = database || this.config?.database || 'admin'
    const collections = await this.client.db(dbName).listCollections().toArray()
    return collections.map((collection) => ({ name: collection.name, type: 'table' }))
  }

  async getColumns(collectionName: string, database?: string): Promise<ColumnInfo[]> {
    if (!this.client) throw new Error('Not connected')
    const dbName = database || this.config?.database || 'admin'
    const docs = await this.client.db(dbName).collection(collectionName).find({}).limit(25).toArray()
    const fields = new Map<string, string>()
    for (const doc of docs as Array<Record<string, unknown>>) {
      for (const [key, value] of Object.entries(doc)) {
        if (!fields.has(key) || fields.get(key) === 'unknown') {
          fields.set(key, inferMongoType(value))
        }
      }
    }
    return Array.from(fields.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, type]) => ({
        name,
        type,
        nullable: false,
        primaryKey: name === '_id'
      }))
  }

  async getForeignKeys(_table: string, _database?: string): Promise<ForeignKeyInfo[]> {
    return []
  }

  async getProcedures(_database?: string): Promise<ProcedureInfo[]> {
    return []
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false
      await this.client.db(this.config?.database || 'admin').command({ ping: 1 })
      return true
    } catch {
      return false
    }
  }

  async getServerVersion(): Promise<string> {
    try {
      if (!this.client) return 'Unknown'
      const result = await this.client.db('admin').command({ buildInfo: 1 })
      return typeof result.version === 'string' ? `MongoDB ${result.version}` : 'Unknown'
    } catch {
      return 'Unknown'
    }
  }
}
