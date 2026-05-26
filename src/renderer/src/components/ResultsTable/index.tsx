import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type ColumnSizingState
} from '@tanstack/react-table'
import { ArrowUp, ArrowDown, Download, Filter, Maximize2, RefreshCw, Edit2 } from 'lucide-react'
import type { QueryResult, ColumnInfo, DatabaseType } from '../../types'
import { useAppStore } from '../../store'

interface Props {
  result: QueryResult
  connectionId?: string | null
  tableName?: string
  database?: string
  schema?: string
  onRefresh?: () => void
}

function cellClass(value: unknown): string {
  if (value === null || value === undefined) return 'null-value'
  if (typeof value === 'number' || typeof value === 'bigint') return 'number-value'
  if (typeof value === 'boolean') return 'bool-value'
  return ''
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function quoteIdentifierForDb(name: string, dbType?: DatabaseType): string {
  switch (dbType) {
    case 'mssql': return `[${name.replace(/]/g, ']]')}]`
    case 'mysql':
    case 'mariadb': return `\`${name.replace(/`/g, '``')}\``
    default: return `"${name.replace(/"/g, '""')}"`
  }
}

export function quoteValueForDb(val: unknown, dbType?: DatabaseType): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number' || typeof val === 'bigint') return String(val)
  if (typeof val === 'boolean') {
    if (dbType === 'mssql') return val ? '1' : '0'
    return val ? 'TRUE' : 'FALSE'
  }
  // Escape literals by dialect
  const escaped = String(val).replace(/'/g, "''")
  const str = dbType === 'mysql' || dbType === 'mariadb'
    ? escaped.replace(/\\/g, '\\\\')
    : escaped
  return `'${str}'`
}

export function buildInlineUpdateSql(
  row: Record<string, unknown>,
  col: string,
  newVal: unknown,
  pkColumns: ColumnInfo[],
  tableName: string,
  database?: string,
  schema?: string,
  dbType?: DatabaseType
): string | null {
  if (pkColumns.length === 0) return null
  const q = (name: string) => quoteIdentifierForDb(name, dbType)
  const v = (value: unknown) => quoteValueForDb(value, dbType)
  // Prefer explicit schema when present; otherwise fall back to database qualifier.
  const qualifier = schema ?? database
  const tableRef = qualifier ? `${q(qualifier)}.${q(tableName)}` : q(tableName)
  const setCl = `${q(col)} = ${v(newVal)}`
  const whereCl = pkColumns.map((pk) => `${q(pk.name)} = ${v(row[pk.name])}`).join(' AND ')
  return `UPDATE ${tableRef}\nSET ${setCl}\nWHERE ${whereCl};`
}

const TRUNCATE_LEN = 100

/** Cell value display — truncated with expand-on-click */
function CellDisplay({
  value,
  onExpand
}: {
  value: unknown
  onExpand: (val: unknown) => void
}): JSX.Element {
  const str = formatCell(value)
  const isLong = str.length > TRUNCATE_LEN || str.includes('\n')
  const display = isLong ? str.slice(0, TRUNCATE_LEN).replace(/\n/g, '↵') + '…' : str
  return (
    <span
      className={cellClass(value)}
      style={isLong ? { cursor: 'pointer' } : undefined}
      title={isLong ? 'Click to expand' : undefined}
      onClick={isLong ? (e) => { e.stopPropagation(); onExpand(value) } : undefined}
    >
      {display}
      {isLong && (
        <Maximize2
          size={10}
          style={{ marginLeft: 4, opacity: 0.5, display: 'inline', verticalAlign: 'middle' }}
        />
      )}
    </span>
  )
}

/** Full-value viewer modal */
function CellViewerModal({
  value,
  onClose
}: {
  value: unknown
  onClose: () => void
}): JSX.Element {
  const str = formatCell(value)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const copy = () => {
    navigator.clipboard.writeText(str).then(() => {
      setCopied(true)
      setCopyError(null)
      setTimeout(() => setCopied(false), 1500)
    }).catch((err: Error) => {
      setCopyError(err.message || 'Unable to copy to clipboard')
    })
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <span className="modal-title">Cell Value</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-primary)',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '50vh',
              overflowY: 'auto',
              margin: 0
            }}
          >
            {str}
          </pre>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          {copyError && (
            <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{copyError}</span>
          )}
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/** Inline-edit confirmation dialog */
function EditConfirmModal({
  sql,
  onConfirm,
  onCancel,
  error,
  isUpdating
}: {
  sql: string
  onConfirm: () => void
  onCancel: () => void
  error: string | null
  isUpdating: boolean
}): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <span className="modal-title">Confirm Update</span>
          <button className="icon-btn" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            The following SQL will be executed. Please review before confirming.
          </p>
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-primary)',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0
            }}
          >
            {sql}
          </pre>
          {error && (
            <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>
            ⚠ This operation directly modifies database data and cannot be undone automatically.
            Ensure your WHERE clause identifies the correct row(s).
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? 'Executing…' : 'Execute Update'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ResultsTable({
  result,
  connectionId,
  tableName,
  database,
  schema,
  onRefresh
}: Props): JSX.Element {
  const { connections } = useAppStore()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [showFilter, setShowFilter] = useState(false)

  // Cell viewer
  const [expandedValue, setExpandedValue] = useState<unknown>(null)
  const [showViewer, setShowViewer] = useState(false)

  // Inline editing state
  const [pkColumns, setPkColumns] = useState<ColumnInfo[]>([])
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; col: string; original: unknown } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [pendingUpdate, setPendingUpdate] = useState<{ sql: string; row: Record<string, unknown> } | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  const conn = connectionId ? connections.find((c) => c.id === connectionId) : null
  const canEdit = !!(connectionId && tableName && conn)

  // Load PK columns when in table mode
  useEffect(() => {
    if (!canEdit || !connectionId || !tableName) return
    const qualifiedTableName = schema ? `${schema}.${tableName}` : tableName
    window.db.getColumns(connectionId, qualifiedTableName, database).then((cols) => {
      setPkColumns(cols.filter((c) => c.primaryKey))
    }).catch(() => setPkColumns([]))
  }, [canEdit, connectionId, tableName, database, schema])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  function buildUpdateSql(
    row: Record<string, unknown>,
    col: string,
    newVal: unknown
  ): string | null {
    return buildInlineUpdateSql(
      row,
      col,
      newVal,
      pkColumns,
      tableName!,
      database,
      schema,
      conn?.type
    )
  }

  /**
   * Re-type the edited string value based on the original cell value's type so
   * quoteValueForDb emits the correct SQL literal (number, boolean, NULL, or string).
   */
  function coerceEditValue(editStr: string, original: unknown): unknown {
    const trimmed = editStr.trim()
    // Explicit NULL keyword (or empty string for a originally-null cell) → SQL NULL
    if (trimmed.toUpperCase() === 'NULL') return null
    if (trimmed === '' && (original === null || original === undefined)) return null
    if (original === null || original === undefined) return trimmed
    if (typeof original === 'boolean') {
      const lower = trimmed.toLowerCase()
      if (lower === 'true' || lower === '1') return true
      if (lower === 'false' || lower === '0') return false
      return trimmed
    }
    if (typeof original === 'number' || typeof original === 'bigint') {
      const n = Number(trimmed)
      if (!isNaN(n) && trimmed !== '') return n
      return trimmed
    }
    return editStr
  }

  function handleCellDoubleClick(rowIdx: number, col: string, value: unknown) {
    if (!canEdit) return
    setEditingCell({ rowIdx, col, original: value })
    setEditValue(value === null || value === undefined ? '' : String(value))
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, row: Record<string, unknown>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(row)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  function commitEdit(row: Record<string, unknown>) {
    if (!editingCell) return
    const typedVal = coerceEditValue(editValue, editingCell.original)
    const sql = buildUpdateSql(row, editingCell.col, typedVal)
    if (!sql) {
      setEditingCell(null)
      setUpdateError('Cannot edit: table has no primary key columns. Editing requires a primary key to safely identify the row.')
      return
    }
    setPendingUpdate({ sql, row })
    setUpdateError(null)
    setEditingCell(null)
  }

  async function executeUpdate() {
    if (!pendingUpdate || !connectionId || isUpdating) return
    setIsUpdating(true)
    setUpdateError(null)
    try {
      const res = await window.db.query(connectionId, pendingUpdate.sql)
      if (res.error) {
        setUpdateError(res.error)
        setIsUpdating(false)
        return
      }
      setPendingUpdate(null)
      setIsUpdating(false)
      onRefresh?.()
    } catch (err) {
      setUpdateError((err as Error).message)
      setIsUpdating(false)
    }
  }

  const columns = useMemo(
    () =>
      result.columns.map((col) => ({
        id: col.name,
        accessorKey: col.name,
        header: col.name,
        size: 150,
        minSize: 60,
        maxSize: 1200,
        filterFn: 'includesString' as const,
        cell: (info: { getValue: () => unknown; row: { index: number; original: Record<string, unknown> } }) => {
          const v = info.getValue()
          const rowIdx = info.row.index
          const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.col === col.name
          if (isEditing) {
            return (
              <input
                ref={editInputRef}
                className="cell-edit-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => handleEditKeyDown(e, info.row.original)}
                onBlur={() => commitEdit(info.row.original)}
                onClick={(e) => e.stopPropagation()}
              />
            )
          }
          return (
            <span
              onDoubleClick={canEdit ? () => handleCellDoubleClick(rowIdx, col.name, v) : undefined}
              style={canEdit ? { cursor: 'text', display: 'block' } : undefined}
              title={canEdit ? 'Double-click to edit' : undefined}
            >
              <CellDisplay value={v} onExpand={(val) => { setExpandedValue(val); setShowViewer(true) }} />
            </span>
          )
        }
      })),
    [result.columns, editingCell, editValue, canEdit, pkColumns, schema, database, tableName, conn?.type]
  )

  const table = useReactTable({
    data: result.rows,
    columns,
    state: { sorting, columnFilters, columnSizing },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  const exportCSV = () => {
    const headers = result.columns.map((c) => c.name).join(',')
    const rows = result.rows.map((row) =>
      result.columns
        .map((c) => {
          const val = row[c.name]
          const str = formatCell(val)
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
        })
        .join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleFilter = () => {
    setShowFilter((prev) => !prev)
    if (showFilter) setColumnFilters([])
  }

  if (result.error) {
    return (
      <div className="results-pane" style={{ minHeight: 80 }}>
        <div className="error-message">
          <strong>Error:</strong> {result.error}
        </div>
      </div>
    )
  }

  const filteredCount = table.getFilteredRowModel().rows.length
  const isSingleRow = result.rows.length === 1

  return (
    <div className="results-pane" style={{ height: '100%' }}>
      <div className="results-header">
        <span className="results-meta">
          {filteredCount !== result.rowCount
            ? `${filteredCount} / ${result.rowCount} rows`
            : `${result.rowCount} row${result.rowCount !== 1 ? 's' : ''}`}
          {' · '}
          {result.duration}ms
          {' · '}
          {result.columns.length} col{result.columns.length !== 1 ? 's' : ''}
          {isSingleRow && (
            <span style={{ marginLeft: 6, color: 'var(--accent)', fontSize: 'var(--font-size-xs)' }}>
              · horizontal view
            </span>
          )}
          {canEdit && (
            <span style={{ marginLeft: 6, color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
              · <Edit2 size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> double-click to edit
            </span>
          )}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {onRefresh && (
            <button
              className="icon-btn"
              onClick={onRefresh}
              data-tooltip="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {!isSingleRow && (
            <button
              className={`icon-btn ${showFilter ? 'active' : ''}`}
              onClick={toggleFilter}
              data-tooltip="Filter columns"
            >
              <Filter size={13} />
            </button>
          )}
          <button className="icon-btn" onClick={exportCSV} data-tooltip="Export CSV">
            <Download size={13} />
          </button>
        </div>
      </div>

      <div className="results-table-wrap">
        {result.rows.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px', height: 80 }}>
            <span className="empty-state-title" style={{ fontSize: 'var(--font-size-sm)' }}>
              Query executed successfully — no rows returned
            </span>
          </div>
        ) : isSingleRow ? (
          /* Horizontal view for single-row results */
          <table className="data-table">
            <tbody>
              {result.columns.map((col) => {
                const value = result.rows[0][col.name]
                return (
                  <tr key={col.name}>
                    <td style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      width: 160,
                      borderRight: '1px solid var(--glass-border)',
                      userSelect: 'none'
                    }}>
                      {col.name}
                    </td>
                    <td className={cellClass(value)}>
                      <CellDisplay value={value} onExpand={(val) => { setExpandedValue(val); setShowViewer(true) }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="data-table" style={{ width: table.getTotalSize() }}>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  <th style={{ width: 50, minWidth: 50, color: 'var(--text-tertiary)', textAlign: 'right' }}>#</th>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize(), minWidth: header.column.columnDef.minSize }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="sort-indicator">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp size={10} />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown size={10} />
                        ) : null}
                      </span>
                      <div
                        className={`column-resize-handle${header.column.getIsResizing() ? ' is-resizing' : ''}`}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                  ))}
                </tr>
              ))}
              {showFilter && (
                <tr className="filter-row">
                  <th style={{ width: 50, minWidth: 50 }} />
                  {table.getHeaderGroups()[0]?.headers.map((header) => (
                    <th key={header.id} style={{ padding: '2px 4px', width: header.getSize() }}>
                      <input
                        className="column-filter-input"
                        type="text"
                        value={(header.column.getFilterValue() as string) ?? ''}
                        onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                        placeholder={`Filter ${header.column.id}…`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{
                    textAlign: 'right',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    width: 50,
                    userSelect: 'none'
                  }}>
                    {idx + 1}
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cell value viewer modal */}
      {showViewer && (
        <CellViewerModal
          value={expandedValue}
          onClose={() => setShowViewer(false)}
        />
      )}

      {/* Update confirmation modal */}
      {pendingUpdate && (
        <EditConfirmModal
          sql={pendingUpdate.sql}
          onConfirm={executeUpdate}
          onCancel={() => { setPendingUpdate(null); setUpdateError(null) }}
          error={updateError}
          isUpdating={isUpdating}
        />
      )}
    </div>
  )
}
