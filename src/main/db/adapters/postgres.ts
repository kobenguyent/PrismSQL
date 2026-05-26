import { Client, QueryResult as PgQueryResult } from 'pg'
import { DatabaseAdapter } from '../adapter'
import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo, ProcedureInfo, ForeignKeyInfo } from '../types'
import { resolveConnectionConfig } from '../connection-uri'

export class PostgresAdapter implements DatabaseAdapter {
  private client: Client | null = null
  private config: ConnectionConfig | null = null
  private _connected = false

  async connect(config: ConnectionConfig): Promise<void> {
    const resolvedConfig = resolveConnectionConfig(config)
    this.config = resolvedConfig
    this.client = new Client({
      host: resolvedConfig.host || 'localhost',
      port: resolvedConfig.port || 5432,
      user: resolvedConfig.user || 'postgres',
      password: resolvedConfig.password || '',
      database: resolvedConfig.database || 'postgres',
      ssl: resolvedConfig.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000
    })
    await this.client.connect()
    this._connected = true
    this.client.on('end', () => { this._connected = false })
    this.client.on('error', () => { this._connected = false })
  }

  async disconnect(): Promise<void> {
    this._connected = false
    if (this.client) {
      await this.client.end()
      this.client = null
    }
  }

  isConnected(): boolean {
    return this._connected && this.client !== null
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.client) throw new Error('Not connected')
    const start = Date.now()
    try {
      const res: PgQueryResult = await this.client.query(sql, params)
      const duration = Date.now() - start
      const columns = res.fields.map((f) => ({
        name: f.name,
        type: f.dataTypeID?.toString() || 'unknown',
        nullable: true,
        primaryKey: false
      }))
      return {
        columns,
        rows: res.rows as Record<string, unknown>[],
        rowCount: res.rowCount || res.rows.length,
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
    const result = await this.query(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
    )
    return result.rows.map((r) => r['datname'] as string)
  }

  async getTables(database?: string): Promise<TableInfo[]> {
    const result = await this.query(
      `SELECT table_name, table_type, table_schema
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name`
    )
    return result.rows.map((r) => ({
      name: r['table_name'] as string,
      type: (r['table_type'] as string) === 'VIEW' ? 'view' : 'table',
      schema: r['table_schema'] as string
    }))
  }

  async getColumns(table: string, database?: string): Promise<ColumnInfo[]> {
    const [schema, tableName] = table.includes('.') ? table.split('.') : ['public', table]
    const result = await this.query(
      `SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
              CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
       FROM information_schema.columns c
       LEFT JOIN (
         SELECT ku.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = $1 AND tc.table_name = $2
       ) pk ON c.column_name = pk.column_name
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schema, tableName]
    )
    return result.rows.map((r) => ({
      name: r['column_name'] as string,
      type: r['data_type'] as string,
      nullable: r['is_nullable'] === 'YES',
      primaryKey: r['is_primary_key'] as boolean,
      defaultValue: r['column_default'] as string | undefined
    }))
  }

  async getForeignKeys(table: string, _database?: string): Promise<ForeignKeyInfo[]> {
    const [schema, tableName] = table.includes('.') ? table.split('.') : ['public', table]
    const result = await this.query(
      `SELECT src_att.attname AS column_name,
              ref_ns.nspname || '.' || ref_tbl.relname AS referenced_table,
              ref_att.attname AS referenced_column
       FROM pg_constraint con
       JOIN pg_class src_tbl
         ON src_tbl.oid = con.conrelid
       JOIN pg_namespace src_ns
         ON src_ns.oid = src_tbl.relnamespace
       JOIN pg_class ref_tbl
         ON ref_tbl.oid = con.confrelid
       JOIN pg_namespace ref_ns
         ON ref_ns.oid = ref_tbl.relnamespace
       JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS src_col(attnum, ordinality)
         ON true
       JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS ref_col(attnum, ordinality)
         ON ref_col.ordinality = src_col.ordinality
       JOIN pg_attribute src_att
         ON src_att.attrelid = src_tbl.oid
         AND src_att.attnum = src_col.attnum
       JOIN pg_attribute ref_att
         ON ref_att.attrelid = ref_tbl.oid
         AND ref_att.attnum = ref_col.attnum
       WHERE con.contype = 'f'
         AND src_ns.nspname = $1
         AND src_tbl.relname = $2
       ORDER BY con.conname, src_col.ordinality`,
      [schema, tableName]
    )
    return result.rows.map((r) => ({
      columnName: r['column_name'] as string,
      referencedTable: r['referenced_table'] as string,
      referencedColumn: r['referenced_column'] as string
    }))
  }

  async getProcedures(_database?: string): Promise<ProcedureInfo[]> {
    // Postgres routines are scoped to the connected database; the database param is not needed
    const result = await this.query(
      `SELECT routine_name, routine_schema, routine_type, specific_name
       FROM information_schema.routines
       WHERE routine_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY routine_schema, routine_name`
    )
    return result.rows.map((r) => ({
      name: r['routine_name'] as string,
      schema: r['routine_schema'] as string,
      type: (r['routine_type'] as string) === 'FUNCTION' ? 'function' : 'procedure',
      specificName: r['specific_name'] as string
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
      const result = await this.query('SELECT version() AS version')
      return (result.rows[0]?.['version'] as string) || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }
}
