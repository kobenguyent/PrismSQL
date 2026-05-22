import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { ConnectionConfig } from './db/types'

const getStorePath = (): string => path.join(app.getPath('userData'), 'connections.json')

export function loadConnections(): ConnectionConfig[] {
  try {
    const storePath = getStorePath()
    if (!fs.existsSync(storePath)) return []
    const data = fs.readFileSync(storePath, 'utf-8')
    return JSON.parse(data) as ConnectionConfig[]
  } catch {
    return []
  }
}

export function saveConnections(connections: ConnectionConfig[]): void {
  try {
    const storePath = getStorePath()
    fs.mkdirSync(path.dirname(storePath), { recursive: true })
    const persistedConnections = connections.map(({ password, ...connection }) => connection)
    fs.writeFileSync(storePath, JSON.stringify(persistedConnections, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save connections:', err)
  }
}
