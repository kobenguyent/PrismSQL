import React, { useCallback, useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, StandardSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { Play, StopCircle, Save, X } from 'lucide-react'
import { useAppStore } from '../../store'
import type { QueryTab } from '../../types'

interface Props {
  tab: QueryTab
}

export function QueryEditor({ tab }: Props): JSX.Element {
  const { connections, connectedIds, schema, updateTabSql, updateTabConnection, runQuery, saveCurrentQuery, theme } = useAppStore()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')

  const handleRunQuery = useCallback(() => {
    if (!tab.isRunning) {
      runQuery(tab.id)
    }
  }, [tab.id, tab.isRunning, runQuery])

  // Keyboard shortcut: Ctrl/Cmd + Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleRunQuery()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleRunQuery])

  // Build schema map for SQL autocomplete from connected schema
  const sqlSchema = useMemo(() => {
    if (!tab.connectionId) return {}
    const connSchema = schema[tab.connectionId]
    if (!connSchema) return {}
    const result: Record<string, string[]> = {}
    // Collect all tables from all databases
    for (const dbTables of Object.values(connSchema.tables)) {
      for (const tableInfo of dbTables) {
        result[tableInfo.name] = result[tableInfo.name] || []
      }
    }
    // Attach column names
    for (const [key, cols] of Object.entries(connSchema.columns)) {
      // key is "db.table" or "table"
      const tableName = key.includes('.') ? key.split('.').pop()! : key
      if (result[tableName]) {
        result[tableName] = cols.map((c) => c.name)
      }
    }
    return result
  }, [tab.connectionId, schema])

  const extensions = useMemo(
    () => [sqlLang({ dialect: StandardSQL, schema: sqlSchema, upperCaseKeywords: false })],
    [sqlSchema]
  )

  const isLightTheme = theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)

  const handleSave = async () => {
    if (!saveName.trim()) return
    await saveCurrentQuery(tab.id, saveName.trim())
    setShowSaveModal(false)
    setSaveName('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="editor-toolbar">
        {/* Connection selector */}
        <select
          className="editor-connection-select"
          value={tab.connectionId ?? ''}
          onChange={(e) => updateTabConnection(tab.id, e.target.value)}
        >
          <option value="" disabled>Select connection...</option>
          {connections.map((conn) => (
            <option key={conn.id} value={conn.id} disabled={!connectedIds.has(conn.id)}>
              {connectedIds.has(conn.id) ? '● ' : '○ '}{conn.name}
            </option>
          ))}
        </select>

        {/* Run button */}
        <button
          className={`run-btn ${tab.isRunning ? 'running' : ''}`}
          onClick={handleRunQuery}
          disabled={!tab.connectionId || !connectedIds.has(tab.connectionId ?? '')}
        >
          {tab.isRunning ? (
            <><StopCircle size={13} /> Running...</>
          ) : (
            <><Play size={13} fill="currentColor" /> Run</>
          )}
        </button>

        {/* Save button */}
        <button
          className="icon-btn"
          onClick={() => { setSaveName(tab.title || ''); setShowSaveModal(true) }}
          disabled={!tab.sql.trim()}
          data-tooltip="Save query"
          style={{ flexShrink: 0 }}
        >
          <Save size={13} />
        </button>

        <span className="keyboard-hint">
          <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd> + <kbd>Enter</kbd>
        </span>
      </div>

      {/* CodeMirror editor */}
      <div className="cm-editor-wrapper">
        <CodeMirror
          value={tab.sql}
          height="100%"
          theme={isLightTheme ? 'light' : oneDark}
          extensions={extensions}
          onChange={(value) => updateTabSql(tab.id, value)}
          placeholder="-- Write your SQL query here…"
          style={{ height: '100%', fontFamily: 'var(--font-mono)' }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
            syntaxHighlighting: true
          }}
        />
      </div>

      {/* Save Query Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-panel" style={{ width: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Save Query</span>
              <button className="icon-btn" onClick={() => setShowSaveModal(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Query Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="My query…"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!saveName.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
