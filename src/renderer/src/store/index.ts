import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type { ConnectionConfig, QueryTab, QueryResult, TableInfo, ColumnInfo, ProcedureInfo, DatabaseType, SavedQuery } from '../types'

function quoteIdentifier(name: string, dbType: DatabaseType): string {
  switch (dbType) {
    case 'mssql':
      return `[${name}]`
    case 'mysql':
    case 'mariadb':
      return `\`${name}\``
    default:
      return `"${name}"`
  }
}

// Required for Immer to handle Set and Map mutations inside producers
enableMapSet()

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
      getProcedures(connectionId: string, database?: string): Promise<ProcedureInfo[]>
      getSavedQueries(): Promise<SavedQuery[]>
      saveQuery(query: SavedQuery): Promise<{ success: boolean }>
      deleteQuery(id: string): Promise<{ success: boolean }>
    }
  }
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface SchemaNode {
  databases: string[]
  tables: Record<string, TableInfo[]>
  columns: Record<string, ColumnInfo[]>
  procedures: Record<string, ProcedureInfo[]>
  loadingDatabases: boolean
  loadingTables: Record<string, boolean>
  loadingProcedures: Record<string, boolean>
}

interface AppState {
  // Connections
  connections: ConnectionConfig[]
  connectedIds: Set<string>
  schema: Record<string, SchemaNode>

  // Tabs
  tabs: QueryTab[]
  activeTabId: string | null

  // Saved queries
  savedQueries: SavedQuery[]

  // UI state
  sidebarWidth: number
  isSidebarCollapsed: boolean
  theme: 'dark' | 'light' | 'system'
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
  loadProcedures(connectionId: string, database: string): Promise<void>

  // Tab actions
  newTab(connectionId?: string | null): void
  closeTab(tabId: string): void
  setActiveTab(tabId: string): void
  updateTabSql(tabId: string, sql: string): void
  updateTabConnection(tabId: string, connectionId: string): void
  runQuery(tabId: string): Promise<void>
  insertSnippet(tabId: string, snippet: string): void
  openTableInTab(connectionId: string, tableName: string, database: string, schema?: string): Promise<void>
  openProcedureInTab(connectionId: string, proc: ProcedureInfo): void

  // Saved query actions
  loadSavedQueries(): Promise<void>
  saveCurrentQuery(tabId: string, name: string, category?: string): Promise<void>
  deleteSavedQuery(id: string): Promise<void>
  openSavedQuery(query: SavedQuery): void
  updateSavedQuery(query: SavedQuery): Promise<void>

  // UI actions
  setSidebarWidth(w: number): void
  setSidebarCollapsed(v: boolean): void
  setTheme(t: 'dark' | 'light' | 'system'): void
  setStatus(msg: string | null, type?: AppState['statusType']): void
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    connections: [],
    connectedIds: new Set(),
    schema: {},
    tabs: [],
    activeTabId: null,
    savedQueries: [],
    sidebarWidth: 280,
    isSidebarCollapsed: false,
    theme: 'dark' as 'dark' | 'light' | 'system',
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
              procedures: {},
              loadingDatabases: false,
              loadingTables: {},
              loadingProcedures: {}
            }
          }
        })
        get().setStatus(`Connected to ${config.name}`, 'success')
        await get().loadDatabases(config.id)
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

    loadProcedures: async (connectionId, database) => {
      set((s) => {
        if (s.schema[connectionId]) {
          s.schema[connectionId].loadingProcedures[database] = true
        }
      })
      try {
        const procedures = await window.db.getProcedures(connectionId, database)
        set((s) => {
          if (s.schema[connectionId]) {
            s.schema[connectionId].procedures[database] = procedures
            s.schema[connectionId].loadingProcedures[database] = false
          }
        })
      } catch {
        set((s) => {
          if (s.schema[connectionId]) {
            s.schema[connectionId].loadingProcedures[database] = false
          }
        })
      }
    },

    newTab: (connectionId = null) => {
      const id = genId()
      const tab: QueryTab = {
        id,
        title: 'Query',
        tabType: 'query',
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

    openTableInTab: async (connectionId, tableName, database, schema) => {
      const conn = get().connections.find((c) => c.id === connectionId)
      const dbType: DatabaseType = conn?.type ?? 'postgres'
      const q = (n: string) => quoteIdentifier(n, dbType)
      const qualifier = schema ?? database
      const qualifiedName = qualifier ? `${q(qualifier)}.${q(tableName)}` : q(tableName)
      const sql =
        dbType === 'mssql'
          ? `SELECT TOP 100 * FROM ${qualifiedName};`
          : `SELECT * FROM ${qualifiedName} LIMIT 100;`
      const id = genId()
      const tab: QueryTab = {
        id,
        title: tableName,
        tabType: 'table',
        connectionId,
        sql,
        result: null,
        isRunning: false,
        isSaved: false
      }
      set((s) => {
        s.tabs.push(tab)
        s.activeTabId = id
      })
      await get().runQuery(id)
    },

    openProcedureInTab: (connectionId, proc) => {
      const conn = get().connections.find((c) => c.id === connectionId)
      const dbType: DatabaseType = conn?.type ?? 'postgres'
      const q = (n: string) => quoteIdentifier(n, dbType)
      const qualifiedName = proc.schema ? `${q(proc.schema)}.${q(proc.name)}` : q(proc.name)

      let sql: string
      if (proc.type === 'function') {
        // Stub — add parameters as needed before running
        sql = `-- Function: ${qualifiedName}\nSELECT ${qualifiedName}();`
      } else if (dbType === 'mssql') {
        // Stub — add parameters as needed before running
        sql = `-- Procedure: ${qualifiedName}\nEXEC ${qualifiedName};`
      } else {
        // Stub — add parameters as needed before running
        sql = `-- Procedure: ${qualifiedName}\nCALL ${qualifiedName}();`
      }

      const id = genId()
      const tab: QueryTab = {
        id,
        title: proc.name,
        tabType: 'procedure',
        connectionId,
        sql,
        result: null,
        isRunning: false,
        isSaved: false
      }
      set((s) => {
        s.tabs.push(tab)
        s.activeTabId = id
      })
    },
    loadSavedQueries: async () => {
      const queries = await window.db.getSavedQueries()
      set((s) => {
        s.savedQueries = queries
      })
    },

    saveCurrentQuery: async (tabId, name, category) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || !tab.sql.trim()) return
      const query: SavedQuery = {
        id: genId(),
        name,
        sql: tab.sql,
        createdAt: Date.now(),
        ...(category ? { category } : {})
      }
      await window.db.saveQuery(query)
      await get().loadSavedQueries()
      get().setStatus(`Query saved: ${name}`, 'success')
    },

    deleteSavedQuery: async (id) => {
      await window.db.deleteQuery(id)
      set((s) => {
        s.savedQueries = s.savedQueries.filter((q) => q.id !== id)
      })
    },

    updateSavedQuery: async (query) => {
      await window.db.saveQuery(query)
      set((s) => {
        const idx = s.savedQueries.findIndex((q) => q.id === query.id)
        if (idx >= 0) s.savedQueries[idx] = query
      })
    },

    openSavedQuery: (query) => {
      const id = genId()
      const { tabs, activeTabId } = get()
      const activeTab = tabs.find((t) => t.id === activeTabId)
      const tab: QueryTab = {
        id,
        title: query.name,
        tabType: 'query',
        connectionId: activeTab?.connectionId || null,
        sql: query.sql,
        result: null,
        isRunning: false,
        isSaved: true
      }
      set((s) => {
        s.tabs.push(tab)
        s.activeTabId = id
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

    setTheme: (t) => {
      set((s) => {
        s.theme = t
      })
    },

    setStatus: (msg, type = 'info') => {
      set((s) => {
        s.statusMessage = msg
        s.statusType = type
      })
      // Auto-clear error and success messages so they don't persist forever
      if (msg !== null && (type === 'error' || type === 'success')) {
        setTimeout(() => {
          set((s) => {
            if (s.statusMessage === msg) {
              s.statusMessage = null
            }
          })
        }, 6000)
      }
    }
  }))
)
