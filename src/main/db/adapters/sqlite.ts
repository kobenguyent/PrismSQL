import Database from 'better-sqlite3'
import { DatabaseAdapter } from '../adapter'
import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo, ProcedureInfo, ForeignKeyInfo } from '../types'

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database | null = null

  async connect(config: ConnectionConfig): Promise<void> {
    const filename = config.filename || ':memory:'
    this.db = new Database(filename, { readonly: false })
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.db) throw new Error('Not connected')
    const start = Date.now()
    try {
      const trimmed = sql.trim().toLowerCase()
      const isSelect =
        trimmed.startsWith('select') || trimmed.startsWith('with') || trimmed.startsWith('pragma')
      if (isSelect) {
        const stmt = this.db.prepare(sql)
        const rows = stmt.all(...params) as Record<string, unknown>[]
        const metadataColumns = stmt.columns().map((col) => ({
          name: col.name,
          type: col.type || 'TEXT',
          nullable: true,
          primaryKey: false
        }))
        const duration = Date.now() - start
        const columns =
          rows.length > 0
            ? Object.keys(rows[0]).map((name) => ({ name, type: 'TEXT', nullable: true, primaryKey: false }))
            : metadataColumns
        return { columns, rows, rowCount: rows.length, duration }
      } else {
        const stmt = this.db.prepare(sql)
        const result = stmt.run(...params)
        const duration = Date.now() - start
        return {
          columns: [],
          rows: [],
          rowCount: result.changes,
          duration
        }
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
    if (!this.db) return []
    // SQLite only has one database per connection
    const result = this.db.pragma('database_list') as { name: string }[]
    return result.map((r) => r.name)
  }

  async getTables(database?: string): Promise<TableInfo[]> {
    const result = await this.query(
      `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    return result.rows.map((r) => ({
      name: r['name'] as string,
      type: (r['type'] as string) === 'view' ? 'view' : 'table'
    }))
  }

  async getColumns(table: string, database?: string): Promise<ColumnInfo[]> {
    const result = await this.query(`PRAGMA table_info(${JSON.stringify(table)})`)
    return result.rows.map((r) => ({
      name: r['name'] as string,
      type: r['type'] as string,
      nullable: r['notnull'] === 0,
      primaryKey: r['pk'] !== 0,
      defaultValue: r['dflt_value'] as string | undefined
    }))
  }

  async getForeignKeys(table: string, _database?: string): Promise<ForeignKeyInfo[]> {
    const result = await this.query(`PRAGMA foreign_key_list(${JSON.stringify(table)})`)
    return result.rows.map((r) => ({
      columnName: r['from'] as string,
      referencedTable: r['table'] as string,
      referencedColumn: r['to'] as string
    }))
  }

  async getProcedures(_database?: string): Promise<ProcedureInfo[]> {
    // SQLite does not support stored procedures
    return []
  }

  async ping(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  async getServerVersion(): Promise<string> {
    try {
      const result = await this.query(`SELECT sqlite_version() AS version`)
      return (result.rows[0]?.['version'] as string) || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }
}
