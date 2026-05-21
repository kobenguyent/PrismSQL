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
  filename?: string // for SQLite
  ssl?: boolean
  color?: string // connection indicator color
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

export interface DatabaseInfo {
  name: string
}

export interface TableInfo {
  name: string
  type: 'table' | 'view'
  schema?: string
  rowCount?: number
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  defaultValue?: string
  comment?: string
}

export interface SchemaInfo {
  databases: string[]
  tables: Record<string, TableInfo[]>
}
