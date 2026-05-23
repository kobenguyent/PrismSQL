import React, { useCallback, useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, StandardSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { Play, StopCircle, Save, Wand2, Sparkles, Bot, X, MessageSquarePlus } from 'lucide-react'
import { useAppStore } from '../../store'
import { useIsLightTheme } from '../../hooks/useIsLightTheme'
import type { DatabaseType, QueryTab } from '../../types'
import { format } from 'sql-formatter'

interface Props {
  tab: QueryTab
}

export function QueryEditor({ tab }: Props): JSX.Element {
  const { connections, connectedIds, schema, updateTabSql, updateTabConnection, runQuery, saveCurrentQuery, setStatus } =
    useAppStore()
  const isLightTheme = useIsLightTheme()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveCategory, setSaveCategory] = useState('')
  const [aiBusyTask, setAiBusyTask] = useState<'generate' | 'explain' | 'optimize' | null>(null)
  const [aiOutput, setAiOutput] = useState<string | null>(null)
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false)
  const [aiGeneratePrompt, setAiGeneratePrompt] = useState('')

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
      const parts = key.split('.')
      const tableName = parts.length > 1 ? parts[parts.length - 1] : key
      if (tableName && result[tableName]) {
        result[tableName] = cols.map((c) => c.name)
      }
    }
    return result
  }, [tab.connectionId, schema])

  const extensions = useMemo(
    () => [sqlLang({ dialect: StandardSQL, schema: sqlSchema, upperCaseKeywords: false })],
    [sqlSchema]
  )

  const handleSave = async () => {
    if (!saveName.trim()) return
    await saveCurrentQuery(tab.id, saveName.trim(), saveCategory.trim() || undefined)
    setShowSaveModal(false)
    setSaveName('')
    setSaveCategory('')
  }

  const getSqlLanguage = useCallback((dbType?: DatabaseType): string => {
    switch (dbType) {
      case 'mysql':
      case 'mariadb':
        return 'mysql'
      case 'postgres':
        return 'postgresql'
      case 'sqlite':
        return 'sqlite'
      case 'mssql':
        return 'transactsql'
      default:
        return 'sql'
    }
  }, [])

  const handleBeautifySql = useCallback(() => {
    if (!tab.sql.trim()) return
    const conn = connections.find((c) => c.id === tab.connectionId)
    try {
      const beautified = format(tab.sql, {
        language: getSqlLanguage(conn?.type),
        keywordCase: 'upper'
      })
      updateTabSql(tab.id, beautified)
      setStatus('SQL beautified', 'success')
    } catch {
      setStatus('Unable to beautify SQL for this dialect', 'warning')
    }
  }, [tab.sql, tab.id, tab.connectionId, connections, getSqlLanguage, updateTabSql, setStatus])

  const runAiTask = useCallback(
    async (task: 'generate' | 'explain' | 'optimize', generatePrompt?: string) => {
      const conn = connections.find((c) => c.id === tab.connectionId)
      const dbType = conn?.type

      if (task === 'generate' && !generatePrompt?.trim()) {
        setStatus('Describe SQL requirements for AI generation', 'warning')
        return
      }
      if (task !== 'generate' && !tab.sql.trim()) {
        setStatus('Write SQL first for AI explain/optimize', 'warning')
        return
      }

      setAiBusyTask(task)
      const response = await window.db.runAITask({
        task,
        prompt: generatePrompt?.trim(),
        sql: task === 'generate' ? undefined : tab.sql,
        dbType
      })
      setAiBusyTask(null)

      if (!response.success || !response.output) {
        setStatus(response.error || 'AI request failed', 'error')
        return
      }

      if (task === 'explain') {
        setAiOutput(response.output)
        setStatus('AI explanation ready (local Ollama)', 'success')
        return
      }
      updateTabSql(tab.id, response.output)
      setStatus(task === 'optimize' ? 'SQL optimized by local AI' : 'SQL generated by local AI', 'success')
    },
    [connections, setStatus, tab.connectionId, tab.id, tab.sql, updateTabSql]
  )

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
          onClick={() => { setSaveName(tab.title || ''); setSaveCategory(''); setShowSaveModal(true) }}
          disabled={!tab.sql.trim()}
          data-tooltip="Save query"
          style={{ flexShrink: 0 }}
        >
          <Save size={13} />
        </button>
        <button className="icon-btn" onClick={handleBeautifySql} disabled={!tab.sql.trim()} data-tooltip="Beautify SQL">
          <Wand2 size={13} />
        </button>
        <button
          className="icon-btn"
          onClick={() => setShowAIGenerateModal(true)}
          disabled={aiBusyTask !== null}
          data-tooltip="AI Generate SQL (Local Ollama)"
        >
          <MessageSquarePlus size={13} />
        </button>
        <button
          className="icon-btn"
          onClick={() => runAiTask('explain')}
          disabled={aiBusyTask !== null || !tab.sql.trim()}
          data-tooltip="AI Explain SQL (Local Ollama)"
        >
          <Bot size={13} />
        </button>
        <button
          className="icon-btn"
          onClick={() => runAiTask('optimize')}
          disabled={aiBusyTask !== null || !tab.sql.trim()}
          data-tooltip="AI Optimize SQL (Local Ollama)"
        >
          <Sparkles size={13} />
        </button>

        <span className="keyboard-hint">
          <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd> + <kbd>Enter</kbd>
        </span>
        <span className="keyboard-hint" style={{ color: 'var(--text-tertiary)' }}>
          AI: local Ollama only
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
              <div className="form-group">
                <label className="form-label">Category (optional)</label>
                <input
                  className="form-input"
                  type="text"
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  placeholder="e.g. Analytics, Reporting…"
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

      {aiOutput && (
        <div className="modal-overlay" onClick={() => setAiOutput(null)}>
          <div className="modal-panel" style={{ width: 520, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">AI SQL Explanation (Local Ollama)</span>
              <button className="icon-btn" onClick={() => setAiOutput(null)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {aiOutput}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setAiOutput(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowAIGenerateModal(false)}>
          <div className="modal-panel" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Generate SQL (Local Ollama)</span>
              <button className="icon-btn" onClick={() => setShowAIGenerateModal(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Describe what query you want</label>
                <textarea
                  className="form-input"
                  value={aiGeneratePrompt}
                  onChange={(e) => setAiGeneratePrompt(e.target.value)}
                  rows={5}
                  placeholder="e.g. Get the top 10 customers by revenue in the last 30 days."
                />
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                Local-only AI: prompts are sent only to your local Ollama instance.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAIGenerateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  await runAiTask('generate', aiGeneratePrompt)
                  setShowAIGenerateModal(false)
                  setAiGeneratePrompt('')
                }}
                disabled={!aiGeneratePrompt.trim() || aiBusyTask !== null}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
