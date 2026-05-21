import React, { useState, useCallback } from 'react'
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Database,
  Table,
  Eye,
  Columns,
  Trash2,
  RefreshCw,
  Power,
  PowerOff
} from 'lucide-react'
import { useAppStore } from '../../store'
import type { ConnectionConfig } from '../../types'
import { DB_COLORS } from '../../types'

interface Props {
  onNewConnection: () => void
  onEditConnection: (config: ConnectionConfig) => void
}

interface TreeState {
  expandedConnections: Set<string>
  expandedDatabases: Record<string, Set<string>>
  expandedTables: Record<string, Set<string>>
  selectedTable: string | null
}

export function Sidebar({ onNewConnection, onEditConnection }: Props): JSX.Element {
  const {
    connections,
    connectedIds,
    schema,
    connect,
    disconnect,
    deleteConnection,
    loadTables,
    loadColumns,
    insertSnippet,
    activeTabId,
    tabs
  } = useAppStore()

  const [tree, setTree] = useState<TreeState>({
    expandedConnections: new Set(),
    expandedDatabases: {},
    expandedTables: {},
    selectedTable: null
  })

  const toggleConnection = useCallback(
    async (conn: ConnectionConfig) => {
      const isExpanded = tree.expandedConnections.has(conn.id)
      if (isExpanded) {
        setTree((prev) => {
          const s = new Set(prev.expandedConnections)
          s.delete(conn.id)
          return { ...prev, expandedConnections: s }
        })
      } else {
        if (!connectedIds.has(conn.id)) {
          await connect(conn)
        }
        setTree((prev) => {
          const s = new Set(prev.expandedConnections)
          s.add(conn.id)
          return { ...prev, expandedConnections: s }
        })
      }
    },
    [tree.expandedConnections, connectedIds, connect]
  )

  const toggleDatabase = useCallback(
    async (connId: string, dbName: string) => {
      const expanded = tree.expandedDatabases[connId] ?? new Set<string>()
      const isExpanded = expanded.has(dbName)
      setTree((prev) => {
        const newSet = new Set(prev.expandedDatabases[connId] ?? new Set<string>())
        if (isExpanded) {
          newSet.delete(dbName)
        } else {
          newSet.add(dbName)
        }
        return {
          ...prev,
          expandedDatabases: { ...prev.expandedDatabases, [connId]: newSet }
        }
      })
      if (!isExpanded) {
        await loadTables(connId, dbName)
      }
    },
    [tree.expandedDatabases, loadTables]
  )

  const toggleTable = useCallback(
    async (connId: string, tableName: string, dbName: string) => {
      const key = `${connId}/${dbName}/${tableName}`
      const expanded = tree.expandedTables[connId] ?? new Set<string>()
      const isExpanded = expanded.has(key)
      setTree((prev) => {
        const newSet = new Set(prev.expandedTables[connId] ?? new Set<string>())
        if (isExpanded) {
          newSet.delete(key)
        } else {
          newSet.add(key)
        }
        return {
          ...prev,
          expandedTables: { ...prev.expandedTables, [connId]: newSet },
          selectedTable: isExpanded ? null : key
        }
      })
      if (!isExpanded) {
        await loadColumns(connId, tableName, dbName)
      }
    },
    [tree.expandedTables, loadColumns]
  )

  const handleInsertSelect = (connId: string, tableName: string) => {
    if (!activeTabId) return
    insertSnippet(activeTabId, `SELECT * FROM ${tableName} LIMIT 100;`)
  }

  const handleContextMenu = (e: React.MouseEvent, conn: ConnectionConfig) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Connections</span>
        <button
          className="icon-btn"
          onClick={onNewConnection}
          data-tooltip="New Connection"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="sidebar-body">
        {connections.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <Database size={32} className="empty-state-icon" />
            <span className="empty-state-title">No connections</span>
            <span className="empty-state-sub">Click + to add a database connection</span>
            <button className="btn btn-primary btn-sm" onClick={onNewConnection} style={{ marginTop: 8 }}>
              <Plus size={12} /> Add Connection
            </button>
          </div>
        )}

        {connections.map((conn) => {
          const isConnected = connectedIds.has(conn.id)
          const isExpanded = tree.expandedConnections.has(conn.id)
          const connSchema = schema[conn.id]
          const color = conn.color ?? DB_COLORS[conn.type]

          return (
            <div key={conn.id}>
              {/* Connection row */}
              <div
                className={`connection-item ${isExpanded ? 'active' : ''}`}
                onClick={() => toggleConnection(conn)}
                onContextMenu={(e) => handleContextMenu(e, conn)}
              >
                <span
                  className={`connection-dot ${isConnected ? 'connected' : ''}`}
                  style={{ background: isConnected ? color : undefined }}
                />

                <ChevronRight
                  size={12}
                  style={{
                    transition: 'transform 200ms ease',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    color: 'var(--text-tertiary)',
                    flexShrink: 0
                  }}
                />

                <span className="connection-name">{conn.name}</span>

                <span
                  className="connection-type-badge"
                  style={{ color, borderColor: `${color}40`, background: `${color}15` }}
                  // border is set via inline style
                >
                  {conn.type === 'postgres' ? 'PG' : conn.type.toUpperCase().slice(0, 4)}
                </span>

                {/* Actions (shown on hover via CSS opacity trick) */}
                <span style={{ display: 'flex', gap: 2, opacity: 0 }} className="conn-actions">
                  <button
                    className="icon-btn"
                    style={{ width: 20, height: 20 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isConnected) disconnect(conn.id)
                      else connect(conn)
                    }}
                    title={isConnected ? 'Disconnect' : 'Connect'}
                  >
                    {isConnected ? <PowerOff size={10} /> : <Power size={10} />}
                  </button>
                  <button
                    className="icon-btn"
                    style={{ width: 20, height: 20 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConnection(conn.id)
                    }}
                    title="Delete"
                  >
                    <Trash2 size={10} />
                  </button>
                </span>
              </div>

              {/* Databases */}
              {isExpanded && connSchema && (
                <div>
                  {connSchema.loadingDatabases ? (
                    <div className="tree-item">
                      <span className="spinner" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    connSchema.databases.map((dbName) => {
                      const dbExpanded = (tree.expandedDatabases[conn.id] ?? new Set()).has(dbName)
                      const tables = connSchema.tables[dbName] ?? []
                      const loadingTables = connSchema.loadingTables[dbName]

                      return (
                        <div key={dbName}>
                          <div
                            className="tree-item"
                            onClick={() => toggleDatabase(conn.id, dbName)}
                          >
                            {dbExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            <Database size={12} style={{ color: color, opacity: 0.8 }} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {dbName}
                            </span>
                          </div>

                          {dbExpanded && (
                            <div>
                              {loadingTables ? (
                                <div className="tree-item tree-item-indent-1">
                                  <span className="spinner" />
                                  <span>Loading tables...</span>
                                </div>
                              ) : tables.length === 0 ? (
                                <div className="tree-item tree-item-indent-1" style={{ color: 'var(--text-tertiary)' }}>
                                  No tables
                                </div>
                              ) : (
                                tables.map((tbl) => {
                                  const tableKey = `${conn.id}/${dbName}/${tbl.name}`
                                  const tblExpanded = (tree.expandedTables[conn.id] ?? new Set()).has(tableKey)
                                  const columns = connSchema.columns[`${dbName}.${tbl.name}`] ?? []

                                  return (
                                    <div key={tbl.name}>
                                      <div
                                        className={`tree-item tree-item-indent-1 ${tree.selectedTable === tableKey ? 'selected' : ''}`}
                                        onClick={() => toggleTable(conn.id, tbl.name, dbName)}
                                        onDoubleClick={() => handleInsertSelect(conn.id, tbl.name)}
                                        title={`Double-click to insert SELECT statement`}
                                      >
                                        {tblExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                        {tbl.type === 'view' ? (
                                          <Eye size={11} style={{ opacity: 0.7 }} />
                                        ) : (
                                          <Table size={11} style={{ opacity: 0.7 }} />
                                        )}
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {tbl.name}
                                        </span>
                                      </div>

                                      {/* Columns */}
                                      {tblExpanded && columns.map((col) => (
                                        <div
                                          key={col.name}
                                          className="tree-item tree-item-indent-2"
                                          style={{ fontSize: 11 }}
                                        >
                                          <Columns size={10} style={{ opacity: 0.5 }} />
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {col.name}
                                          </span>
                                          <span style={{
                                            fontSize: 9,
                                            color: 'var(--text-tertiary)',
                                            fontFamily: 'var(--font-mono)'
                                          }}>
                                            {col.type}
                                          </span>
                                          {col.primaryKey && (
                                            <span style={{
                                              fontSize: 8,
                                              color: 'var(--color-warning)',
                                              fontWeight: 700
                                            }}>PK</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
