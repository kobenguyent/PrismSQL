import React, { useState } from 'react'
import { Trash2, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useAppStore } from '../../store'
import type { QueryHistoryEntry } from '../../types'

interface Props {
  onClose: () => void
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString()
}

const SQL_PREVIEW_LEN = 120

function truncateSql(sql: string, maxLen = SQL_PREVIEW_LEN): string {
  const single = sql.replace(/\s+/g, ' ').trim()
  return single.length > maxLen ? single.slice(0, maxLen) + '…' : single
}

export function QueryHistoryPanel({ onClose }: Props): React.JSX.Element {
  const { queryHistory, clearHistory, openHistoryEntry } = useAppStore()
  const [filter, setFilter] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<QueryHistoryEntry | null>(null)

  const filtered = filter.trim()
    ? queryHistory.filter((e) =>
        e.sql.toLowerCase().includes(filter.toLowerCase()) ||
        e.connectionName.toLowerCase().includes(filter.toLowerCase())
      )
    : queryHistory

  const handleOpen = (entry: QueryHistoryEntry) => {
    openHistoryEntry(entry)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, width: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <span className="modal-title">Query History</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {queryHistory.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={clearHistory}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={11} /> Clear
              </button>
            )}
            <button className="icon-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <input
            className="form-input"
            placeholder="Filter by SQL or connection…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
              {queryHistory.length === 0 ? 'No queries executed yet' : 'No matches found'}
            </div>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                style={{
                  padding: '8px 20px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--glass-border)',
                  background: selectedEntry?.id === entry.id ? 'var(--accent-dim)' : 'transparent',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  if (selectedEntry?.id !== entry.id)
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (selectedEntry?.id !== entry.id)
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  {entry.error ? (
                    <XCircle size={12} color="var(--color-error)" />
                  ) : (
                    <CheckCircle size={12} color="var(--color-success)" />
                  )}
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {formatDate(entry.timestamp)} {formatTime(entry.timestamp)}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent)', marginLeft: 'auto' }}>
                    {entry.connectionName}
                  </span>
                  {!entry.error && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                      {entry.rowCount} row{entry.rowCount !== 1 ? 's' : ''} · {entry.duration}ms
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    color: entry.error ? 'var(--color-error)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {truncateSql(entry.sql)}
                </div>
                {selectedEntry?.id === entry.id && (
                  <div style={{ marginTop: 8 }}>
                    <pre
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-primary)',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 160,
                        overflowY: 'auto',
                        margin: 0
                      }}
                    >
                      {entry.sql}
                    </pre>
                    {entry.error && (
                      <div style={{ marginTop: 6, color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>
                        Error: {entry.error}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleOpen(entry) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <ExternalLink size={11} /> Open in Tab
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {filtered.length > 0 && (
          <div style={{ padding: '8px 20px', borderTop: '1px solid var(--glass-border)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
            {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
            {filter && ` matching "${filter}"`}
          </div>
        )}
      </div>
    </div>
  )
}
