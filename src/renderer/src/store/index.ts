import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ConnectionConfig, QueryTab, QueryResult, TableInfo, ColumnInfo } from '../types'

// Use window.db API (injected by preload)
declare global {
  interface Window {
    db: {
      getConnections(): Promise<ConnectionConfig[]>
      saveConnection(config: ConnectionConfig): Promise<{ success: boolean }>
      deleteConnection(id: string): Promise<{ success: boolean }>
      testConnection(config: ConnectionConfig): Promise<{ success: boolean; error?: string }>
      connect(config: ConnectionConfig): Promise<{ success: boolean; error?: string }>
      disconnect(id: string): Promise<{ success: boolean }>
      isConnected(id: string): Promise<boolean>
      query(connectionId: string, sql: string, params?: unknown[]): Promise<QueryResult>
      getDatabases(connectionId: string): Promise<string[]>
      getTables(connectionId: string, database?: string): Promise<TableInfo[]>
      getColumns(connectionId: string, table: string, database?: string): Promise<ColumnInfo[]>
    }
  }
}

function uuidSimple(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface SchemaNode {
  databases: string[]
  tables: Record<string, TableInfo[]>
  columns: Record<string, ColumnInfo[]>
  loadingDatabases: boolean
  loadingTables: Record<string, boolean>
}

interface AppState {
  // Connections
  connections: ConnectionConfig[]
  connectedIds: Set<string>
  schema: Record<string, SchemaNode>

  // Tabs
  tabs: QueryTab[]
  activeTabId: string | null

  // UI state
  sidebarWidth: number
  isSidebarCollapsed: boolean
  statusMessage: string | null
  statusType: 'info' | 'success' | 'error' | 'warning'

  // Actions
  loadConnections(): Promise<void>
  saveConnection(config: ConnectionConfig): Promise<void>
  deleteConnection(id: string): Promise<void>
  connect(config: ConnectionConfig): Promise<{ success: boolean; error?: string }>
  disconnect(id: string): Promise<void>
  loadDatabases(connectionId: string): Promise<void>
  loadTables(connectionId: string, database: string): Promise<void>
  loadColumns(connectionId: string, table: string, database?: string): Promise<void>

  // Tab actions
  newTab(connectionId?: string | null): void
  closeTab(tabId: string): void
  setActiveTab(tabId: string): void
  updateTabSql(tabId: string, sql: string): void
  updateTabConnection(tabId: string, connectionId: string): void
  runQuery(tabId: string): Promise<void>
  insertSnippet(tabId: string, snippet: string): void

  // UI actions
  setSidebarWidth(w: number): void
  setSidebarCollapsed(v: boolean): void
  setStatus(msg: string | null, type?: AppState['statusType']): void
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    connections: [],
    connectedIds: new Set(),
    schema: {},
    tabs: [],
    activeTabId: null,
    sidebarWidth: 280,
    isSidebarCollapsed: false,
    statusMessage: null,
    statusType: 'info',

    loadConnections: async () => {
      const connections = await window.db.getConnections()
      set((s) => {
        s.connections = connections
      })
    },

    saveConnection: async (config) => {
      await window.db.saveConnection(config)
      await get().loadConnections()
    },

    deleteConnection: async (id) => {
      await window.db.deleteConnection(id)
      set((s) => {
        s.connectedIds.delete(id)
        delete s.schema[id]
      })
      await get().loadConnections()
    },

    connect: async (config) => {
      const result = await window.db.connect(config)
      if (result.success) {
        set((s) => {
          s.connectedIds.add(config.id)
          if (!s.schema[config.id]) {
            s.schema[config.id] = {
              databases: [],
              tables: {},
              columns: {},
              loadingDatabases: false,
              loadingTables: {}
            }
          }
        })
        get().setStatus(`Connected to ${config.name}`, 'success')
        await get().loadDatabases(config.id)
      } else {
        get().setStatus(`Connection failed: ${result.error}`, 'error')
      }
      return result
    },

    disconnect: async (id) => {
      await window.db.disconnect(id)
      set((s) => {
        s.connectedIds.delete(id)
        delete s.schema[id]
      })
      const conn = get().connections.find((c) => c.id === id)
      get().setStatus(`Disconnected from ${conn?.name}`, 'info')
    },

    loadDatabases: async (connectionId) => {
      set((s) => {
        if (s.schema[connectionId]) {
          s.schema[connectionId].loadingDatabases = true
        }
      })
      try {
        const databases = await window.db.getDatabases(connectionId)
        set((s) => {
          if (s.schema[connectionId]) {
            s.schema[connectionId].databases = databases
            s.schema[connectionId].loadingDatabases = false
          }
        })
      } catch {
        set((s) => {
          if (s.schema[connectionId]) {
            s.schema[connectionId].loadingDatabases = false
          }
        })
      }
    },

    loadTables: async (connectionId, database) => {
      set((s) => {
        if (s.schema[connectionId]) {
          s.schema[connectionId].loadingTables[database] = true
        }
      })
      try {
        const tables = await window.db.getTables(connectionId, database)
        set((s) => {
          if (s.schema[connectionId]) {
            s.schema[connectionId].tables[database] = tables
            s.schema[connectionId].loadingTables[database] = false
          }
        })
      } catch {
        set((s) => {
          if (s.schema[connectionId]) {
            s.schema[connectionId].loadingTables[database] = false
          }
        })
      }
    },

    loadColumns: async (connectionId, table, database) => {
      const key = database ? `${database}.${table}` : table
      try {
        const columns = await window.db.getColumns(connectionId, table, database)
        set((s) => {
          if (s.schema[connectionId]) {
            s.schema[connectionId].columns[key] = columns
          }
        })
      } catch {}
    },

    newTab: (connectionId = null) => {
      const id = uuidSimple()
      const tab: QueryTab = {
        id,
        title: 'Query',
        connectionId: connectionId || get().tabs[get().tabs.length - 1]?.connectionId || null,
        sql: '',
        result: null,
        isRunning: false,
        isSaved: false
      }
      set((s) => {
        s.tabs.push(tab)
        s.activeTabId = id
      })
    },

    closeTab: (tabId) => {
      const { tabs, activeTabId } = get()
      const idx = tabs.findIndex((t) => t.id === tabId)
      if (idx < 0) return
      set((s) => {
        s.tabs.splice(idx, 1)
        if (s.tabs.length === 0) {
          s.activeTabId = null
        } else if (activeTabId === tabId) {
          s.activeTabId = s.tabs[Math.min(idx, s.tabs.length - 1)].id
        }
      })
    },

    setActiveTab: (tabId) => {
      set((s) => {
        s.activeTabId = tabId
      })
    },

    updateTabSql: (tabId, sql) => {
      set((s) => {
        const tab = s.tabs.find((t) => t.id === tabId)
        if (tab) tab.sql = sql
      })
    },

    updateTabConnection: (tabId, connectionId) => {
      set((s) => {
        const tab = s.tabs.find((t) => t.id === tabId)
        if (tab) tab.connectionId = connectionId
      })
    },

    runQuery: async (tabId) => {
      const { tabs, connectedIds } = get()
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab || !tab.connectionId) {
        get().setStatus('No database connection selected', 'warning')
        return
      }
      if (!connectedIds.has(tab.connectionId)) {
        get().setStatus('Not connected to database', 'error')
        return
      }
      set((s) => {
        const t = s.tabs.find((t) => t.id === tabId)
        if (t) t.isRunning = true
      })
      try {
        const result = await window.db.query(tab.connectionId, tab.sql)
        set((s) => {
          const t = s.tabs.find((t) => t.id === tabId)
          if (t) {
            t.result = result
            t.isRunning = false
          }
        })
        if (result.error) {
          get().setStatus(result.error, 'error')
        } else {
          get().setStatus(
            `${result.rowCount} row${result.rowCount !== 1 ? 's' : ''} in ${result.duration}ms`,
            'success'
          )
        }
      } catch (err) {
        set((s) => {
          const t = s.tabs.find((t) => t.id === tabId)
          if (t) t.isRunning = false
        })
        get().setStatus((err as Error).message, 'error')
      }
    },

    insertSnippet: (tabId, snippet) => {
      set((s) => {
        const tab = s.tabs.find((t) => t.id === tabId)
        if (tab) {
          tab.sql = tab.sql ? `${tab.sql}\n${snippet}` : snippet
        }
      })
    },

    setSidebarWidth: (w) => {
      set((s) => {
        s.sidebarWidth = w
      })
    },

    setSidebarCollapsed: (v) => {
      set((s) => {
        s.isSidebarCollapsed = v
      })
    },

    setStatus: (msg, type = 'info') => {
      set((s) => {
        s.statusMessage = msg
        s.statusType = type
      })
    }
  }))
)

// Export a simple uuid function for components
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
