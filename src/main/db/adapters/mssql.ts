import mssql from 'mssql'
import { DatabaseAdapter } from '../adapter'
import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo } from '../types'

export class MSSQLAdapter implements DatabaseAdapter {
  private pool: mssql.ConnectionPool | null = null
  private config: ConnectionConfig | null = null

  async connect(config: ConnectionConfig): Promise<void> {
    this.config = config
    this.pool = await mssql.connect({
      server: config.host || 'localhost',
      port: config.port || 1433,
      user: config.user,
      password: config.password,
      database: config.database,
      options: {
        encrypt: config.ssl ?? true,
        trustServerCertificate: true,
        connectTimeout: 10000
      }
    })
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close()
      this.pool = null
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.pool) throw new Error('Not connected')
    const start = Date.now()
    try {
      const request = this.pool.request()
      params.forEach((p, i) => request.input(`p${i}`, p))
      const result = await request.query(sql)
      const duration = Date.now() - start
      const rows = result.recordset || []
      const columns =
        rows.length > 0
          ? Object.keys(rows[0]).map((name) => ({ name, type: 'unknown', nullable: true, primaryKey: false }))
          : []
      return {
        columns,
        rows: rows as Record<string, unknown>[],
        rowCount: rows.length,
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
    const result = await this.query(`SELECT name FROM sys.databases WHERE state_desc = 'ONLINE' ORDER BY name`)
    return result.rows.map((r) => r['name'] as string)
  }

  async getTables(database?: string): Promise<TableInfo[]> {
    const result = await this.query(
      `SELECT TABLE_NAME, TABLE_TYPE, TABLE_SCHEMA
       FROM INFORMATION_SCHEMA.TABLES
       ORDER BY TABLE_SCHEMA, TABLE_NAME`
    )
    return result.rows.map((r) => ({
      name: r['TABLE_NAME'] as string,
      type: (r['TABLE_TYPE'] as string) === 'VIEW' ? 'view' : 'table',
      schema: r['TABLE_SCHEMA'] as string
    }))
  }

  async getColumns(table: string, database?: string): Promise<ColumnInfo[]> {
    const [schema, tableName] = table.includes('.') ? table.split('.') : ['dbo', table]
    const result = await this.query(
      `SELECT c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT,
              CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IS_PRIMARY_KEY
       FROM INFORMATION_SCHEMA.COLUMNS c
       LEFT JOIN (
         SELECT ku.COLUMN_NAME
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
         JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
         WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
           AND tc.TABLE_SCHEMA = '${schema}' AND tc.TABLE_NAME = '${tableName}'
       ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
       WHERE c.TABLE_SCHEMA = '${schema}' AND c.TABLE_NAME = '${tableName}'
       ORDER BY c.ORDINAL_POSITION`
    )
    return result.rows.map((r) => ({
      name: r['COLUMN_NAME'] as string,
      type: r['DATA_TYPE'] as string,
      nullable: r['IS_NULLABLE'] === 'YES',
      primaryKey: r['IS_PRIMARY_KEY'] === 1,
      defaultValue: r['COLUMN_DEFAULT'] as string | undefined
    }))
  }

  async ping(): Promise<boolean> {
    try {
      await this.query('SELECT 1 AS ping')
      return true
    } catch {
      return false
    }
  }
}
