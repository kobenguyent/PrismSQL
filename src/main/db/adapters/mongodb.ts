import { BSON, MongoClient } from 'mongodb'
import { DatabaseAdapter } from '../adapter'
import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo, ProcedureInfo, ForeignKeyInfo } from '../types'
import { resolveConnectionConfig } from '../connection-uri'

const SAMPLE_SIZE = 25
const FIND_LIMIT = 500
const FORBIDDEN_COMMANDS = /(insert|update|delete|replace|drop|create|rename|bulkWrite|findOneAnd|mapReduce|eval|runCommand)/i

type MongoOperation =
  | { kind: 'find'; collection: string; filter: Record<string, unknown>; projection?: Record<string, unknown> }
  | { kind: 'aggregate'; collection: string; pipeline: Record<string, unknown>[] }

export class MongoAdapter implements DatabaseAdapter {
  private client: MongoClient | null = null
  private config: ConnectionConfig | null = null

  async connect(config: ConnectionConfig): Promise<void> {
    const resolvedConfig = resolveConnectionConfig(config)
    this.config = resolvedConfig

    const uri = resolvedConfig.connectionUri?.trim() || this.buildUri(resolvedConfig)
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })
    await this.client.connect()
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
    }
  }

  async query(sql: string, _params?: unknown[]): Promise<QueryResult> {
    if (!this.client) throw new Error('Not connected')

    const start = Date.now()
    try {
      const op = parseMongoOperation(sql)
      const db = this.client.db(this.config?.database || undefined)
      const collection = db.collection(op.collection)

      const rows =
        op.kind === 'find'
          ? await collection.find(op.filter, { projection: op.projection }).limit(FIND_LIMIT).toArray()
          : await collection.aggregate(op.pipeline).limit(FIND_LIMIT).toArray()

      const normalizedRows = rows.map((doc) => flattenDoc(normalizeBson(doc)))
      const columns = inferColumns(normalizedRows)

      return {
        columns,
        rows: normalizedRows,
        rowCount: normalizedRows.length,
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
    const admin = this.client.db().admin()
    const result = await admin.listDatabases()
    return result.databases.map((d) => d.name)
  }

  async getTables(database?: string): Promise<TableInfo[]> {
    if (!this.client) throw new Error('Not connected')
    const db = this.client.db(database || this.config?.database || undefined)
    const collections = await db.listCollections({}, { nameOnly: true }).toArray()
    return collections
      .map((c) => ({ name: c.name, type: 'table' as const, schema: db.databaseName }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async getColumns(table: string, database?: string): Promise<ColumnInfo[]> {
    if (!this.client) throw new Error('Not connected')
    const db = this.client.db(database || this.config?.database || undefined)
    const docs = await db.collection(table).find({}, { limit: SAMPLE_SIZE }).toArray()
    const fields = new Map<string, string>()

    for (const doc of docs) {
      const normalized = flattenDoc(normalizeBson(doc))
      for (const [key, value] of Object.entries(normalized)) {
        if (!fields.has(key)) fields.set(key, inferType(value))
      }
    }

    if (fields.size === 0) {
      fields.set('_id', 'ObjectId')
    }

    return [...fields.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, type]) => ({
        name,
        type,
        nullable: true,
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
    if (!this.client) return false
    try {
      await this.client.db().command({ ping: 1 })
      return true
    } catch {
      return false
    }
  }

  async getServerVersion(): Promise<string> {
    if (!this.client) return 'Unknown'
    try {
      const info = await this.client.db().admin().serverInfo()
      return info.version || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }

  private buildUri(config: ConnectionConfig): string {
    const auth = config.user
      ? `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password || '')}@`
      : ''
    const host = config.host || 'localhost'
    const port = config.port ? `:${config.port}` : ''
    const database = config.database ? `/${encodeURIComponent(config.database)}` : ''
    const params = new URLSearchParams()
    if (config.authSource) params.set('authSource', config.authSource)
    if (config.ssl) params.set('tls', 'true')
    const query = params.toString()
    return `mongodb://${auth}${host}${port}${database}${query ? `?${query}` : ''}`
  }
}

export function parseMongoOperation(input: string): MongoOperation {
  const trimmed = input.trim().replace(/;\s*$/, '')
  if (!trimmed) throw new Error('MongoDB query is empty')
  if (FORBIDDEN_COMMANDS.test(trimmed)) {
    throw new Error('MongoDB read-only mode: write/admin commands are not allowed')
  }

  const findMatch = /^db\.([A-Za-z0-9_.-]+)\.find\((.*)\)$/s.exec(trimmed)
  if (findMatch) {
    const collection = findMatch[1]
    const args = splitTopLevelArgs(findMatch[2])
    if (args.length < 1 || args.length > 2) {
      throw new Error('Mongo find syntax: db.<collection>.find(<filter>, <projection?>)')
    }
    const filter = parseJsonArg(args[0], 'find filter')
    const projection = args[1] ? parseJsonArg(args[1], 'find projection') : undefined
    if (!isObject(filter)) throw new Error('Mongo find filter must be an object')
    if (projection !== undefined && !isObject(projection)) throw new Error('Mongo find projection must be an object')
    return { kind: 'find', collection, filter, projection }
  }

  const aggregateMatch = /^db\.([A-Za-z0-9_.-]+)\.aggregate\((.*)\)$/s.exec(trimmed)
  if (aggregateMatch) {
    const collection = aggregateMatch[1]
    const args = splitTopLevelArgs(aggregateMatch[2])
    if (args.length !== 1) {
      throw new Error('Mongo aggregate syntax: db.<collection>.aggregate(<pipeline>)')
    }
    const pipeline = parseJsonArg(args[0], 'aggregate pipeline')
    if (!Array.isArray(pipeline)) throw new Error('Mongo aggregate pipeline must be an array')
    if (!pipeline.every((v) => isObject(v))) throw new Error('Mongo aggregate pipeline stages must be objects')
    return { kind: 'aggregate', collection, pipeline: pipeline as Record<string, unknown>[] }
  }

  throw new Error('Unsupported MongoDB query. Use db.<collection>.find(...) or db.<collection>.aggregate(...)')
}

function parseJsonArg(raw: string, label: string): unknown {
  const value = raw.trim()
  if (!value) throw new Error(`Missing ${label}`)
  try {
    return BSON.EJSON.parse(value, { relaxed: true })
  } catch {
    throw new Error(`Invalid ${label}. Use valid JSON/EJSON.`)
  }
}

function splitTopLevelArgs(input: string): string[] {
  const text = input.trim()
  if (!text) return []

  const args: string[] = []
  let start = 0
  let depth = 0
  let quote: '"' | "'" | null = null
  let escape = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '{' || ch === '[' || ch === '(') {
      depth += 1
      continue
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth -= 1
      continue
    }
    if (ch === ',' && depth === 0) {
      args.push(text.slice(start, i).trim())
      start = i + 1
    }
  }

  args.push(text.slice(start).trim())
  return args.filter((a) => a.length > 0)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeBson)
  if (value && typeof value === 'object') {
    if (typeof (value as { toHexString?: unknown }).toHexString === 'function') {
      return (value as { toHexString: () => string }).toHexString()
    }
    if ((value as { _bsontype?: unknown })._bsontype === 'Decimal128' && typeof (value as { toString?: unknown }).toString === 'function') {
      return (value as { toString: () => string }).toString()
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizeBson(v)
    }
    return out
  }
  return value
}

function flattenDoc(doc: unknown, prefix = ''): Record<string, unknown> {
  if (!isObject(doc)) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (isObject(v)) {
      Object.assign(out, flattenDoc(v, key))
    } else {
      out[key] = Array.isArray(v) ? JSON.stringify(v) : v
    }
  }
  return out
}

function inferColumns(rows: Record<string, unknown>[]): { name: string; type: string; nullable: boolean; primaryKey: boolean }[] {
  const types = new Map<string, string>()
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (!types.has(k)) types.set(k, inferType(v))
    }
  }
  if (types.size === 0) {
    types.set('_id', 'ObjectId')
  }
  return [...types.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, type]) => ({ name, type, nullable: true, primaryKey: name === '_id' }))
}

function inferType(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  return typeof value
}
