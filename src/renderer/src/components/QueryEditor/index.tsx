import React, { useCallback, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { Play, StopCircle } from 'lucide-react'
import { useAppStore } from '../../store'
import type { QueryTab } from '../../types'

interface Props {
  tab: QueryTab
}

export function QueryEditor({ tab }: Props): JSX.Element {
  const { connections, connectedIds, updateTabSql, updateTabConnection, runQuery } = useAppStore()

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

  const extensions = [sql()]

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

        <span className="keyboard-hint">
          <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd> + <kbd>Enter</kbd>
        </span>
      </div>

      {/* CodeMirror editor */}
      <div className="cm-editor-wrapper">
        <CodeMirror
          value={tab.sql}
          height="100%"
          theme={oneDark}
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
    </div>
  )
}
