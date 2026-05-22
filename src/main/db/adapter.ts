import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo } from './types'

export interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  query(sql: string, params?: unknown[]): Promise<QueryResult>
  getDatabases(): Promise<string[]>
  getTables(database?: string): Promise<TableInfo[]>
  getColumns(table: string, database?: string): Promise<ColumnInfo[]>
  ping(): Promise<boolean>
}
