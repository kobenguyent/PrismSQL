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
  const [globalFilter, setGlobalFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const columns = useMemo(
    () =>
      result.columns.map((col) => ({
        id: col.name,
        accessorKey: col.name,
        header: col.name,
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
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {showFilter && (
            <input
              className="results-filter-input"
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter results..."
              autoFocus
            />
          )}
          <button
            className={`icon-btn ${showFilter ? 'active' : ''}`}
            onClick={() => { setShowFilter(!showFilter); if (showFilter) setGlobalFilter('') }}
            data-tooltip="Filter"
          >
            <Filter size={13} />
          </button>
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
