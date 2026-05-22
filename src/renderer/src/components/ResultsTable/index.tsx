import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState
} from '@tanstack/react-table'
import { ArrowUp, ArrowDown, Download, Filter } from 'lucide-react'
import type { QueryResult } from '../../types'

interface Props {
  result: QueryResult
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

export function ResultsTable({ result }: Props): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [showFilter, setShowFilter] = useState(false)

  const columns = useMemo(
    () =>
      result.columns.map((col) => ({
        id: col.name,
        accessorKey: col.name,
        header: col.name,
        filterFn: 'includesString' as const,
        cell: (info: { getValue: () => unknown }) => {
          const v = info.getValue()
          return <span className={cellClass(v)}>{formatCell(v)}</span>
        }
      })),
    [result.columns]
  )

  const table = useReactTable({
    data: result.rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
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
                      {formatCell(value)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  <th style={{ width: 50, color: 'var(--text-tertiary)', textAlign: 'right' }}>#</th>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ minWidth: 80 }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="sort-indicator">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp size={10} />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown size={10} />
                        ) : null}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
              {showFilter && (
                <tr className="filter-row">
                  <th style={{ width: 50 }} />
                  {table.getHeaderGroups()[0]?.headers.map((header) => (
                    <th key={header.id} style={{ padding: '2px 4px' }}>
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
    </div>
  )
}
