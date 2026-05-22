import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import type { ConnectionConfig, QueryResult, TableInfo, ColumnInfo } from '../main/db/types'

export type { ConnectionConfig, QueryResult, TableInfo, ColumnInfo }

const dbAPI = {
  getConnections: (): Promise<ConnectionConfig[]> => ipcRenderer.invoke('db:get-connections'),
  saveConnection: (config: ConnectionConfig): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:save-connection', config),
  deleteConnection: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:delete-connection', id),
  testConnection: (config: ConnectionConfig): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('db:test-connection', config),
  connect: (config: ConnectionConfig): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('db:connect', config),
  disconnect: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('db:disconnect', id),
  isConnected: (id: string): Promise<boolean> => ipcRenderer.invoke('db:is-connected', id),
  query: (connectionId: string, sql: string, params?: unknown[]): Promise<QueryResult> =>
    ipcRenderer.invoke('db:query', connectionId, sql, params),
  getDatabases: (connectionId: string): Promise<string[]> =>
    ipcRenderer.invoke('db:get-databases', connectionId),
  getTables: (connectionId: string, database?: string): Promise<TableInfo[]> =>
    ipcRenderer.invoke('db:get-tables', connectionId, database),
  getColumns: (connectionId: string, table: string, database?: string): Promise<ColumnInfo[]> =>
    ipcRenderer.invoke('db:get-columns', connectionId, table, database)
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('db', dbAPI)
} else {
  // @ts-ignore (for non-sandboxed environments)
  window.electron = electronAPI
  // @ts-ignore
  window.db = dbAPI
}
