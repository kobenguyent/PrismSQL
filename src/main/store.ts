import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'
import { ConnectionConfig, DatabaseType } from './db/types'
import { appLogger } from './logger'

export interface SavedQueryRecord {
  id: string
  name: string
  sql: string
  createdAt: number
  category?: string
}

const getStorePath = (): string => path.join(app.getPath('userData'), 'connections.json')
const getSavedQueriesPath = (): string => path.join(app.getPath('userData'), 'saved-queries.json')
const SUPPORTED_DB_TYPES: DatabaseType[] = ['mysql', 'mariadb', 'postgres', 'sqlite', 'mssql']

/** Prefix used to distinguish safeStorage-encrypted values from plaintext. */
const ENCRYPTED_PREFIX = 'enc:'

function encryptPassword(password: string): string {
  if (password.startsWith(ENCRYPTED_PREFIX)) {
    // Import/export may already contain encrypted payloads. Keep as-is to avoid double encryption.
    appLogger.debug('Skipping password re-encryption for already encrypted value')
    return password
  }
  if (safeStorage.isEncryptionAvailable()) {
    return ENCRYPTED_PREFIX + safeStorage.encryptString(password).toString('base64')
  }
  return password
}

function decryptPassword(stored: string): string {
  if (stored.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const buf = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), 'base64')
      return safeStorage.decryptString(buf)
    } catch {
      return ''
    }
  }
  // Legacy plaintext value — return as-is so existing data keeps working.
  return stored
}

export function loadConnections(): ConnectionConfig[] {
  try {
    const raw = loadPersistedConnectionsRaw()
    return raw.map((c) => ({
      ...c,
      password: c.password ? decryptPassword(c.password) : c.password
    }))
  } catch {
    return []
  }
}

export function saveConnections(connections: ConnectionConfig[]): void {
  try {
    const storePath = getStorePath()
    fs.mkdirSync(path.dirname(storePath), { recursive: true })
    const persisted = connections.map((c) => ({
      ...c,
      password: c.password ? encryptPassword(c.password) : c.password
    }))
    fs.writeFileSync(storePath, JSON.stringify(persisted, null, 2), 'utf-8')
  } catch (err) {
    appLogger.error('Failed to save connections', { error: (err as Error).message })
  }
}

export function loadSavedQueries(): SavedQueryRecord[] {
  try {
    const p = getSavedQueriesPath()
    if (!fs.existsSync(p)) return []
    const data = fs.readFileSync(p, 'utf-8')
    return JSON.parse(data) as SavedQueryRecord[]
  } catch {
    return []
  }
}

export function writeSavedQueries(queries: SavedQueryRecord[]): void {
  try {
    const p = getSavedQueriesPath()
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(queries, null, 2), 'utf-8')
  } catch (err) {
    appLogger.error('Failed to save queries', { error: (err as Error).message })
  }
}

export interface ImportConnectionsResult {
  imported: number
  replaced: number
  skippedDuplicates: number
  skippedInvalid: number
}

export function loadPersistedConnectionsRaw(): ConnectionConfig[] {
  const storePath = getStorePath()
  if (!fs.existsSync(storePath)) return []
  const data = fs.readFileSync(storePath, 'utf-8')
  return JSON.parse(data) as ConnectionConfig[]
}

export function exportConnectionsToPath(exportPath: string, includePasswords = false): number {
  const baseConnections = includePasswords
    ? loadPersistedConnectionsRaw()
    : loadConnections().map((conn) => ({ ...conn, password: undefined }))

  const payload = {
    version: 1,
    exportedAt: Date.now(),
    includePasswords,
    connections: baseConnections
  }
  fs.writeFileSync(exportPath, JSON.stringify(payload, null, 2), 'utf-8')
  return baseConnections.length
}

export function importConnectionsFromPath(importPath: string): ImportConnectionsResult {
  const rawData = fs.readFileSync(importPath, 'utf-8')
  const parsed = JSON.parse(rawData) as { connections?: unknown } | ConnectionConfig[]
  const incomingList = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { connections?: unknown }).connections)
      ? ((parsed as { connections: ConnectionConfig[] }).connections ?? [])
      : []

  const existing = loadConnections()
  let imported = 0
  let replaced = 0
  let skippedDuplicates = 0
  let skippedInvalid = 0

  for (const incoming of incomingList) {
    if (!isValidConnectionConfig(incoming)) {
      skippedInvalid += 1
      continue
    }

    const normalized = normalizeImportedConnection(incoming)
    const indexById = existing.findIndex((conn) => conn.id === normalized.id)
    if (indexById >= 0) {
      existing[indexById] = normalized
      replaced += 1
      continue
    }

    const duplicateByFingerprint = existing.some((conn) => fingerprintConnection(conn) === fingerprintConnection(normalized))
    if (duplicateByFingerprint) {
      skippedDuplicates += 1
      continue
    }

    existing.push(normalized)
    imported += 1
  }

  saveConnections(existing)
  return { imported, replaced, skippedDuplicates, skippedInvalid }
}

function isValidConnectionConfig(value: unknown): value is ConnectionConfig {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (typeof record['name'] !== 'string' || !record['name'].trim()) return false
  if (typeof record['type'] !== 'string' || !SUPPORTED_DB_TYPES.includes(record['type'] as DatabaseType)) return false
  if (record['id'] !== undefined && typeof record['id'] !== 'string') return false
  return true
}

function normalizeImportedConnection(conn: ConnectionConfig): ConnectionConfig {
  return {
    ...conn,
    id: conn.id?.trim() || createConnectionId(),
    name: conn.name.trim(),
    category: conn.category?.trim() || undefined
  }
}

function createConnectionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function fingerprintConnection(conn: ConnectionConfig): string {
  return [
    conn.type,
    conn.name.trim().toLowerCase(),
    conn.host?.trim().toLowerCase() ?? '',
    conn.port?.toString() ?? '',
    conn.user?.trim().toLowerCase() ?? '',
    conn.database?.trim().toLowerCase() ?? '',
    conn.filename?.trim().toLowerCase() ?? ''
  ].join('|')
}
