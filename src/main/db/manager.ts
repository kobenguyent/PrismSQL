import { DatabaseAdapter } from './adapter'
import { MySQLAdapter } from './adapters/mysql'
import { PostgresAdapter } from './adapters/postgres'
import { SQLiteAdapter } from './adapters/sqlite'
import { MSSQLAdapter } from './adapters/mssql'
import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo, ProcedureInfo } from './types'
import log from 'electron-log'

/** Safely extract a human-readable message from any thrown value. */
function extractErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err || 'Unknown error'
  if (typeof err === 'object') {
    // Driver errors often have 'message', 'detail', or 'text' fields
    const e = err as Record<string, unknown>
    const msg =
      (typeof e['message'] === 'string' && e['message'].trim()) ||
      (typeof e['detail'] === 'string' && e['detail'].trim()) ||
      (typeof e['text'] === 'string' && e['text'].trim()) ||
      (typeof e['msg'] === 'string' && e['msg'].trim())
    if (msg) return msg
    try { return JSON.stringify(err) } catch { /* fall through */ }
  }
  return 'Unknown error'
}

export class ConnectionManager {
  private connections = new Map<string, DatabaseAdapter>()

  private createAdapter(type: ConnectionConfig['type']): DatabaseAdapter {
    switch (type) {
      case 'mysql':
      case 'mariadb':
        return new MySQLAdapter()
      case 'postgres':
        return new PostgresAdapter()
      case 'sqlite':
        return new SQLiteAdapter()
      case 'mssql':
        return new MSSQLAdapter()
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  async connect(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.connections.has(config.id)) {
        await this.disconnect(config.id)
      }
      const adapter = this.createAdapter(config.type)
      await adapter.connect(config)
      this.connections.set(config.id, adapter)
      log.info(`Connected to ${config.name} (${config.type})`)
      return { success: true }
    } catch (err) {
      log.error(`Failed to connect to ${config.name}:`, err)
      const message = extractErrorMessage(err)
      return { success: false, error: message }
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const adapter = this.connections.get(connectionId)
    if (adapter) {
      await adapter.disconnect()
      this.connections.delete(connectionId)
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [id] of this.connections) {
      await this.disconnect(id)
    }
  }

  isConnected(connectionId: string): boolean {
    return this.connections.has(connectionId)
  }

  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }> {
    let adapter: DatabaseAdapter | null = null
    try {
      adapter = this.createAdapter(config.type)
      await adapter.connect(config)
      const alive = await adapter.ping()
      return { success: alive }
    } catch (err) {
      return { success: false, error: extractErrorMessage(err) }
    } finally {
      if (adapter) {
        await adapter.disconnect().catch(() => {})
      }
    }
  }

  async query(connectionId: string, sql: string, params?: unknown[]): Promise<QueryResult> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) throw new Error(`Not connected: ${connectionId}`)
    return adapter.query(sql, params)
  }

  async getDatabases(connectionId: string): Promise<string[]> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) throw new Error(`Not connected: ${connectionId}`)
    return adapter.getDatabases()
  }

  async getTables(connectionId: string, database?: string): Promise<TableInfo[]> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) throw new Error(`Not connected: ${connectionId}`)
    return adapter.getTables(database)
  }

  async getColumns(connectionId: string, table: string, database?: string): Promise<ColumnInfo[]> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) throw new Error(`Not connected: ${connectionId}`)
    return adapter.getColumns(table, database)
  }

  async getProcedures(connectionId: string, database?: string): Promise<ProcedureInfo[]> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) throw new Error(`Not connected: ${connectionId}`)
    return adapter.getProcedures(database)
  }
}
