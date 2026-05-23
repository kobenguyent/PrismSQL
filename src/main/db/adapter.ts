import { ConnectionConfig, QueryResult, TableInfo, ColumnInfo, ProcedureInfo } from './types'

export interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  query(sql: string, params?: unknown[]): Promise<QueryResult>
  getDatabases(): Promise<string[]>
  getTables(database?: string): Promise<TableInfo[]>
  getColumns(table: string, database?: string): Promise<ColumnInfo[]>
  getProcedures(database?: string): Promise<ProcedureInfo[]>
  ping(): Promise<boolean>
  getServerVersion(): Promise<string>
}
