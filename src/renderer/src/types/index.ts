export type DatabaseType = 'mysql' | 'mariadb' | 'postgres' | 'sqlite' | 'mssql'

export interface ConnectionConfig {
  id: string
  name: string
  type: DatabaseType
  host?: string
  port?: number
  user?: string
  password?: string
  database?: string
  filename?: string
  ssl?: boolean
  color?: string
}

export interface QueryResult {
  columns: ColumnDef[]
  rows: Record<string, unknown>[]
  rowCount: number
  duration: number
  error?: string
}

export interface ColumnDef {
  name: string
  type: string
  nullable?: boolean
  primaryKey?: boolean
}

export interface TableInfo {
  name: string
  type: 'table' | 'view'
  schema?: string
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  defaultValue?: string
  comment?: string
}

export interface QueryTab {
  id: string
  title: string
  connectionId: string | null
  sql: string
  result: QueryResult | null
  isRunning: boolean
  isSaved: boolean
}

export const DB_COLORS: Record<DatabaseType, string> = {
  mysql: '#f97316',
  mariadb: '#c084fc',
  postgres: '#60a5fa',
  sqlite: '#4ade80',
  mssql: '#f87171'
}

export const DB_DEFAULT_PORTS: Record<DatabaseType, number | undefined> = {
  mysql: 3306,
  mariadb: 3306,
  postgres: 5432,
  sqlite: undefined,
  mssql: 1433
}
