import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ConnectionManager } from '../db/manager'
import { loadConnections, saveConnections, loadSavedQueries, writeSavedQueries, loadSettings, saveSettings, sanitizeSettings } from '../store'
import { ConnectionConfig } from '../db/types'

export function registerIpcHandlers(manager: ConnectionManager): void {
  // List saved connections
  ipcMain.handle('db:get-connections', async (_event: IpcMainInvokeEvent) => {
    return loadConnections()
  })

  // Save a connection (add or update)
  ipcMain.handle('db:save-connection', async (_event: IpcMainInvokeEvent, config: ConnectionConfig) => {
    const connections = loadConnections()
    const idx = connections.findIndex((c) => c.id === config.id)
    if (idx >= 0) {
      connections[idx] = config
    } else {
      connections.push(config)
    }
    saveConnections(connections)
    return { success: true }
  })

  // Delete a connection
  ipcMain.handle('db:delete-connection', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    const connections = loadConnections().filter((c) => c.id !== connectionId)
    saveConnections(connections)
    await manager.disconnect(connectionId)
    return { success: true }
  })

  // Test connection (without saving)
  ipcMain.handle('db:test-connection', async (_event: IpcMainInvokeEvent, config: ConnectionConfig) => {
    return manager.testConnection(config)
  })

  // Connect to a database
  ipcMain.handle('db:connect', async (_event: IpcMainInvokeEvent, config: ConnectionConfig) => {
    return manager.connect(config)
  })

  // Disconnect
  ipcMain.handle('db:disconnect', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    await manager.disconnect(connectionId)
    return { success: true }
  })

  // Check if connected
  ipcMain.handle('db:is-connected', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    return manager.isConnected(connectionId)
  })

  // Execute a SQL query
  ipcMain.handle(
    'db:query',
    async (_event: IpcMainInvokeEvent, connectionId: string, sql: string, params?: unknown[]) => {
      return manager.query(connectionId, sql, params)
    }
  )

  // Get databases list
  ipcMain.handle('db:get-databases', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    return manager.getDatabases(connectionId)
  })

  // Get tables list
  ipcMain.handle(
    'db:get-tables',
    async (_event: IpcMainInvokeEvent, connectionId: string, database?: string) => {
      return manager.getTables(connectionId, database)
    }
  )

  // Get columns for a table
  ipcMain.handle(
    'db:get-columns',
    async (_event: IpcMainInvokeEvent, connectionId: string, table: string, database?: string) => {
      return manager.getColumns(connectionId, table, database)
    }
  )

  // Get procedures / functions list
  ipcMain.handle(
    'db:get-procedures',
    async (_event: IpcMainInvokeEvent, connectionId: string, database?: string) => {
      return manager.getProcedures(connectionId, database)
    }
  )

  // Saved queries
  ipcMain.handle('queries:get', async () => {
    return loadSavedQueries()
  })

  ipcMain.handle('queries:save', async (_event: IpcMainInvokeEvent, query: { id: string; name: string; sql: string; createdAt: number }) => {
    const queries = loadSavedQueries()
    const idx = queries.findIndex((q) => q.id === query.id)
    if (idx >= 0) {
      queries[idx] = query
    } else {
      queries.push(query)
    }
    writeSavedQueries(queries)
    return { success: true }
  })

  ipcMain.handle('queries:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    const queries = loadSavedQueries().filter((q) => q.id !== id)
    writeSavedQueries(queries)
    return { success: true }
  })

  // Settings
  ipcMain.handle('settings:get', async () => {
    return loadSettings()
  })

  ipcMain.handle('settings:save', async (_event: IpcMainInvokeEvent, settings: { queryLimit: number }) => {
    saveSettings(sanitizeSettings(settings))
    return { success: true }
  })

  // Server version
  ipcMain.handle('db:get-server-version', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    try {
      return { version: await manager.getServerVersion(connectionId) }
    } catch (err) {
      return { version: 'Unknown' }
    }
  })
}
