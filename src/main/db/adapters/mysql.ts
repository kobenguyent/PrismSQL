import mysql, { Pool, RowDataPacket, FieldPacket } from 'mysql2/promise'
import { DatabaseAdapter } from '../adapter'
import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo, ProcedureInfo } from '../types'

export class MySQLAdapter implements DatabaseAdapter {
  private pool: Pool | null = null
  private config: ConnectionConfig | null = null

  async connect(config: ConnectionConfig): Promise<void> {
    this.config = config
    this.pool = mysql.createPool({
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user || 'root',
      password: config.password || '',
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      multipleStatements: true,
      connectTimeout: 10000,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    })
    // Verify connectivity eagerly so errors surface at connect time
    const conn = await this.pool.getConnection()
    conn.release()
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.pool) throw new Error('Not connected')
    const start = Date.now()
    try {
      const [rows, fields] = await this.pool.execute<RowDataPacket[]>(sql, params)
      const duration = Date.now() - start
      const resultRows = Array.isArray(rows) ? rows : []
      const rowCount = Array.isArray(rows)
        ? resultRows.length
        : typeof (rows as { affectedRows?: unknown }).affectedRows === 'number'
          ? ((rows as { affectedRows: number }).affectedRows)
          : 0
      const columns = (fields as FieldPacket[] || []).map((f) => ({
        name: f.name,
        type: f.type?.toString() || 'unknown',
        nullable: !!(f.flags && (f.flags & 1) === 0),
        primaryKey: !!(f.flags && (f.flags & 2) !== 0)
      }))
      return {
        columns,
        rows: resultRows as Record<string, unknown>[],
        rowCount,
        duration
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
    const result = await this.query('SHOW DATABASES')
    return result.rows.map((r) => Object.values(r)[0] as string)
  }

  async getTables(database?: string): Promise<TableInfo[]> {
    const db = database || this.config?.database
    if (!db) return []
    const result = await this.query(
      `SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [db]
    )
    return result.rows.map((r) => ({
      name: r['TABLE_NAME'] as string,
      type: (r['TABLE_TYPE'] as string) === 'VIEW' ? 'view' : 'table'
    }))
  }

  async getColumns(table: string, database?: string): Promise<ColumnInfo[]> {
    const db = database || this.config?.database
    if (!db) return []
    const result = await this.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [db, table]
    )
    return result.rows.map((r) => ({
      name: r['COLUMN_NAME'] as string,
      type: r['COLUMN_TYPE'] as string,
      nullable: r['IS_NULLABLE'] === 'YES',
      primaryKey: r['COLUMN_KEY'] === 'PRI',
      defaultValue: r['COLUMN_DEFAULT'] as string | undefined,
      comment: r['COLUMN_COMMENT'] as string | undefined
    }))
  }

  async getProcedures(database?: string): Promise<ProcedureInfo[]> {
    const db = database || this.config?.database
    if (!db) return []
    const result = await this.query(
      `SELECT ROUTINE_NAME, ROUTINE_SCHEMA, ROUTINE_TYPE
       FROM information_schema.ROUTINES
       WHERE ROUTINE_SCHEMA = ?
       ORDER BY ROUTINE_NAME`,
      [db]
    )
    return result.rows.map((r) => ({
      name: r['ROUTINE_NAME'] as string,
      schema: r['ROUTINE_SCHEMA'] as string,
      type: (r['ROUTINE_TYPE'] as string) === 'FUNCTION' ? 'function' : 'procedure'
    }))
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
      const result = await this.query('SELECT VERSION() AS version')
      return (result.rows[0]?.['version'] as string) || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }
}
