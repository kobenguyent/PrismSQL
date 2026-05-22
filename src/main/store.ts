import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'
import { ConnectionConfig } from './db/types'

export interface SavedQueryRecord {
  id: string
  name: string
  sql: string
  createdAt: number
}

const getStorePath = (): string => path.join(app.getPath('userData'), 'connections.json')
const getSavedQueriesPath = (): string => path.join(app.getPath('userData'), 'saved-queries.json')

/** Prefix used to distinguish safeStorage-encrypted values from plaintext. */
const ENCRYPTED_PREFIX = 'enc:'

function encryptPassword(password: string): string {
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
    const storePath = getStorePath()
    if (!fs.existsSync(storePath)) return []
    const data = fs.readFileSync(storePath, 'utf-8')
    const raw = JSON.parse(data) as ConnectionConfig[]
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
    console.error('Failed to save connections:', err)
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
    console.error('Failed to save queries:', err)
  }
}
