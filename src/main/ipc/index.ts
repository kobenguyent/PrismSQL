import { dialog, ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import path from 'path'
import { ConnectionManager } from '../db/manager'
import {
  exportConnectionsToPath,
  importConnectionsFromPath,
  loadConnections,
  loadSavedQueries,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  saveConnections,
  writeSavedQueries
} from '../store'
import { ConnectionConfig } from '../db/types'
import { appLogger } from '../logger'
import type { AIRequest } from '../ai/types'
import { createLocalAIService } from '../ai/service'

export function registerIpcHandlers(manager: ConnectionManager): void {
  const aiService = createLocalAIService()
  const debugChannels = new Set(['db:query'])

  const handleWithLogging = <TArgs extends unknown[], TResult>(
    channel: string,
    handler: (_event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult
  ): void => {
    ipcMain.handle(channel, async (event, ...args: TArgs) => {
      try {
        if (debugChannels.has(channel)) {
          appLogger.debug('IPC request', { channel })
        } else {
          appLogger.info('IPC request', { channel })
        }
        return await handler(event, ...args)
      } catch (error) {
        appLogger.error('IPC handler failed', {
          channel,
          error: (error as Error).message,
          stack: (error as Error).stack
        })
        throw error
      }
    })
  }

  // List saved connections
  handleWithLogging('db:get-connections', async (_event: IpcMainInvokeEvent) => {
    return loadConnections()
  })

  // Save a connection (add or update)
  handleWithLogging('db:save-connection', async (_event: IpcMainInvokeEvent, config: ConnectionConfig) => {
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
  handleWithLogging('db:delete-connection', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    const connections = loadConnections().filter((c) => c.id !== connectionId)
    saveConnections(connections)
    await manager.disconnect(connectionId)
    return { success: true }
  })

  // Test connection (without saving)
  handleWithLogging('db:test-connection', async (_event: IpcMainInvokeEvent, config: ConnectionConfig) => {
    return manager.testConnection(config)
  })

  // Connect to a database
  handleWithLogging('db:connect', async (_event: IpcMainInvokeEvent, config: ConnectionConfig) => {
    return manager.connect(config)
  })

  // Disconnect
  handleWithLogging('db:disconnect', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    await manager.disconnect(connectionId)
    return { success: true }
  })

  // Check if connected
  handleWithLogging('db:is-connected', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    return manager.isConnected(connectionId)
  })

  // Execute a SQL query
  handleWithLogging(
    'db:query',
    async (_event: IpcMainInvokeEvent, connectionId: string, sql: string, params?: unknown[]) => {
      return manager.query(connectionId, sql, params)
    }
  )

  // Get databases list
  handleWithLogging('db:get-databases', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    return manager.getDatabases(connectionId)
  })

  // Get tables list
  handleWithLogging(
    'db:get-tables',
    async (_event: IpcMainInvokeEvent, connectionId: string, database?: string) => {
      return manager.getTables(connectionId, database)
    }
  )

  // Get columns for a table
  handleWithLogging(
    'db:get-columns',
    async (_event: IpcMainInvokeEvent, connectionId: string, table: string, database?: string) => {
      return manager.getColumns(connectionId, table, database)
    }
  )

  // Get full database schema (tables + columns + FK relationships) for the visualizer
  handleWithLogging(
    'db:get-schema',
    async (_event: IpcMainInvokeEvent, connectionId: string, database?: string) => {
      const tableInfos = await manager.getTables(connectionId, database)
      const schemaRows = await Promise.all(
        tableInfos.map(async (t) => {
          const tableId = t.schema ? `${t.schema}.${t.name}` : t.name
          const [columns, fks] = await Promise.all([
            manager.getColumns(connectionId, tableId, database),
            manager.getForeignKeys(connectionId, tableId, database)
          ])
          return { tableInfo: t, tableId, columns, fks }
        })
      )

      const fkColumnSet = new Set<string>()
      schemaRows.forEach(({ tableId, fks }) => {
        fks.forEach((fk) => fkColumnSet.add(`${tableId}.${fk.columnName}`))
      })

      const tables = schemaRows.map(({ tableId, tableInfo, columns }) => ({
        id: tableId,
        name: tableInfo.name,
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type,
          isPrimaryKey: c.primaryKey,
          isForeignKey: fkColumnSet.has(`${tableId}.${c.name}`)
        }))
      }))

      const relationships = schemaRows.flatMap(({ tableId, fks }) =>
        fks.map((fk) => ({
          id: `${tableId}.${fk.columnName}→${fk.referencedTable}.${fk.referencedColumn}`,
          sourceTable: tableId,
          sourceColumn: fk.columnName,
          targetTable: fk.referencedTable,
          targetColumn: fk.referencedColumn
        }))
      )

      return { tables, relationships }
    }
  )

  // Get procedures / functions list
  handleWithLogging(
    'db:get-procedures',
    async (_event: IpcMainInvokeEvent, connectionId: string, database?: string) => {
      return manager.getProcedures(connectionId, database)
    }
  )

  // Saved queries
  handleWithLogging('queries:get', async () => {
    return loadSavedQueries()
  })

  handleWithLogging(
    'queries:save',
    async (_event: IpcMainInvokeEvent, query: { id: string; name: string; sql: string; createdAt: number }) => {
      const queries = loadSavedQueries()
      const idx = queries.findIndex((q) => q.id === query.id)
      if (idx >= 0) {
        queries[idx] = query
      } else {
        queries.push(query)
      }
      writeSavedQueries(queries)
      return { success: true }
    }
  )

  handleWithLogging('queries:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    const queries = loadSavedQueries().filter((q) => q.id !== id)
    writeSavedQueries(queries)
    return { success: true }
  })

  handleWithLogging('ai:get-settings', async () => aiService.getSettings())
  handleWithLogging('ai:run-task', async (_event: IpcMainInvokeEvent, request: AIRequest) => {
    return aiService.runTask(request)
  })

  handleWithLogging('db:export-connections', async (_event: IpcMainInvokeEvent, includePasswords = false) => {
    const result = await dialog.showSaveDialog({
      title: 'Export connections',
      defaultPath: `kobeansql-connections-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }
    try {
      const count = exportConnectionsToPath(result.filePath, includePasswords)
      appLogger.info('Connections exported', { filePath: result.filePath, count, includePasswords })
      return { success: true, count, path: result.filePath }
    } catch (error) {
      appLogger.error('Failed to export connections', { error: (error as Error).message })
      return { success: false, error: (error as Error).message }
    }
  })

  handleWithLogging('db:import-connections', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import connections',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }
    try {
      const importResult = importConnectionsFromPath(result.filePaths[0])
      appLogger.info('Connections imported', { filePath: result.filePaths[0], ...importResult })
      return { success: true, ...importResult }
    } catch (error) {
      appLogger.error('Failed to import connections', { error: (error as Error).message })
      return { success: false, error: (error as Error).message }
    }
  })

  handleWithLogging('app:get-log-path', async () => {
    return appLogger.getFilePath()
  })

  handleWithLogging('app:open-logs', async () => {
    const logPath = appLogger.getFilePath()
    const openError = await shell.openPath(path.dirname(logPath))
    if (openError) {
      throw new Error(openError)
    }
    return { success: true, path: logPath }
  })

  handleWithLogging('settings:get', async () => {
    return loadSettings()
  })

  handleWithLogging('settings:save', async (_event: IpcMainInvokeEvent, settings: { queryLimit: number }) => {
    saveSettings(sanitizeSettings(settings))
    return { success: true }
  })

  handleWithLogging('db:get-server-version', async (_event: IpcMainInvokeEvent, connectionId: string) => {
    try {
      return { version: await manager.getServerVersion(connectionId) }
    } catch (err) {
      return { version: 'Unknown' }
    }
  })
}
