import React, { useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { useAppStore, genId } from '../../store'
import type { ConnectionConfig, DatabaseType } from '../../types'
import { DB_DEFAULT_PORTS } from '../../types'
import { parseConnectionUriPreview } from '../../utils/connection-uri'

interface Props {
  onClose: () => void
  editConfig?: ConnectionConfig | null
}

interface ConnectionPersistenceActions {
  connect(config: ConnectionConfig): Promise<{ success: boolean; error?: string }>
  saveConnection(config: ConnectionConfig): Promise<void>
}

export async function connectThenSaveConnection(
  config: ConnectionConfig,
  { connect, saveConnection }: ConnectionPersistenceActions
): Promise<{ success: boolean; error?: string }> {
  const result = await connect(config)
  if (!result.success) {
    return result
  }

  await saveConnection(config)
  return result
}

const DB_TYPES: { value: DatabaseType; label: string; icon: string; color: string }[] = [
  { value: 'mysql', label: 'MySQL', icon: 'M', color: '#f97316' },
  { value: 'mariadb', label: 'MariaDB', icon: 'Mb', color: '#c084fc' },
  { value: 'postgres', label: 'PostgreSQL', icon: 'Pg', color: '#60a5fa' },
  { value: 'sqlite', label: 'SQLite', icon: 'Sq', color: '#4ade80' },
  { value: 'mssql', label: 'SQL Server', icon: 'Ms', color: '#f87171' }
]

const defaultConfig = (): Omit<ConnectionConfig, 'id'> => ({
  name: '',
  type: 'postgres',
  connectionUri: '',
  host: 'localhost',
  port: 5432,
  user: '',
  password: '',
  database: '',
  filename: '',
  ssl: false,
  color: '#60a5fa'
})

export function ConnectionModal({ onClose, editConfig }: Props): JSX.Element {
  const { saveConnection, connect } = useAppStore()

  const [config, setConfig] = useState<Omit<ConnectionConfig, 'id'>>(() =>
    editConfig ? { ...editConfig } : defaultConfig()
  )
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const isSQLite = config.type === 'sqlite'
  const [connectionMode, setConnectionMode] = useState<'manual' | 'uri'>(
    !isSQLite && !!config.connectionUri?.trim() ? 'uri' : 'manual'
  )

  const uriPreview = !isSQLite ? parseConnectionUriPreview(config.type, config.connectionUri) : {}
  const uriModeInvalid = !isSQLite && connectionMode === 'uri' && !!uriPreview.error
  const uriModeMissing = !isSQLite && connectionMode === 'uri' && !(config.connectionUri ?? '').trim()
  const disableConnectActions = uriModeInvalid || uriModeMissing

  const handleTypeChange = (type: DatabaseType) => {
    const dbType = DB_TYPES.find((d) => d.value === type)
    setConfig((prev) => ({
      ...prev,
      type,
      port: DB_DEFAULT_PORTS[type] ?? prev.port,
      color: dbType?.color ?? prev.color
    }))
    setConnectionMode((prev) => (type === 'sqlite' ? 'manual' : prev))
    setTestResult(null)
  }

  const update = (field: keyof Omit<ConnectionConfig, 'id'>, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const handleTest = useCallback(async () => {
    if (disableConnectActions) {
      setTestResult({ success: false, error: uriModeMissing ? 'Connection URI is required' : uriPreview.error })
      return
    }

    setTesting(true)
    setTestResult(null)
    const fullConfig: ConnectionConfig = { id: editConfig?.id ?? genId(), ...config }
    const result = await window.db.testConnection(fullConfig)
    setTestResult({
      success: result.success,
      error: result.success ? undefined : (result.error || 'Connection failed')
    })
    setTesting(false)
  }, [config, editConfig, disableConnectActions, uriModeMissing, uriPreview.error])

  const handleSave = useCallback(async () => {
    if (!config.name.trim()) {
      setTestResult({ success: false, error: 'Connection name is required' })
      return
    }
    if (disableConnectActions) {
      setTestResult({ success: false, error: uriModeMissing ? 'Connection URI is required' : uriPreview.error })
      return
    }

    setSaving(true)
    try {
      const normalizedCategory = config.category?.trim()
      const fullConfig: ConnectionConfig = {
        id: editConfig?.id ?? genId(),
        ...config,
        category: normalizedCategory || undefined
      }
      const result = await connectThenSaveConnection(fullConfig, { connect, saveConnection })
      if (result.success) {
        onClose()
      } else {
        setTestResult({ success: false, error: result.error || 'Connection failed' })
      }
    } catch (err) {
      setTestResult({ success: false, error: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }, [config, editConfig, saveConnection, connect, setTestResult, onClose, disableConnectActions, uriModeMissing, uriPreview.error])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={16} color="white" />
            </div>
            <span className="modal-title">
              {editConfig ? 'Edit Connection' : 'New Connection'}
            </span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Database Type</label>
            <div className="db-type-grid">
              {DB_TYPES.map((db) => (
                <div
                  key={db.value}
                  className={`db-type-card ${config.type === db.value ? 'selected' : ''}`}
                  onClick={() => handleTypeChange(db.value)}
                >
                  <div className="db-type-icon" style={{ background: db.color }}>
                    {db.icon}
                  </div>
                  <span className="db-type-label">{db.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Connection Name</label>
            <input
              className="form-input"
              type="text"
              value={config.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={`My ${DB_TYPES.find((d) => d.value === config.type)?.label} DB`}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category (optional)</label>
            <input
              className="form-input"
              type="text"
              value={config.category ?? ''}
              onChange={(e) => update('category', e.target.value || undefined)}
              placeholder="e.g. Production, Staging, Local…"
            />
          </div>

          {!isSQLite && (
            <div className="form-group">
              <label className="form-label">Connection Method</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn ${connectionMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setConnectionMode('manual')}
                >
                  Manual
                </button>
                <button
                  type="button"
                  className={`btn ${connectionMode === 'uri' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setConnectionMode('uri')}
                >
                  URI / URL
                </button>
              </div>
            </div>
          )}

          {isSQLite ? (
            <div className="form-group">
              <label className="form-label">Database File Path</label>
              <input
                className="form-input"
                type="text"
                value={config.filename ?? ''}
                onChange={(e) => update('filename', e.target.value)}
                placeholder="/path/to/database.db (leave empty for in-memory)"
              />
            </div>
          ) : connectionMode === 'uri' ? (
            <>
              <div className="form-group">
                <label className="form-label">Connection URI / URL</label>
                <input
                  className="form-input"
                  type="text"
                  value={config.connectionUri ?? ''}
                  onChange={(e) => update('connectionUri', e.target.value)}
                  placeholder={
                    config.type === 'postgres'
                      ? 'postgresql://user:pass@host:5432/db'
                      : config.type === 'mssql'
                        ? 'mssql://user:pass@host:1433/db'
                        : 'mysql://user:pass@host:3306/db'
                  }
                />
                <div style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  URI credentials can be copied/shared by mistake. Prefer dedicated password fields when possible.
                </div>
              </div>
              {uriPreview.error ? (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>{uriPreview.error}</div>
              ) : uriPreview.parsed ? (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  Parsed: host <strong>{uriPreview.parsed.host ?? '-'}</strong>, port{' '}
                  <strong>{uriPreview.parsed.port ?? '-'}</strong>, user <strong>{uriPreview.parsed.user ?? '-'}</strong>,
                  database <strong>{uriPreview.parsed.database ?? '-'}</strong>
                  {uriPreview.parsed.ssl !== undefined ? (
                    <>
                      , ssl <strong>{uriPreview.parsed.ssl ? 'enabled' : 'disabled'}</strong>
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Host</label>
                  <input
                    className="form-input"
                    type="text"
                    value={config.host ?? ''}
                    onChange={(e) => update('host', e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input
                    className="form-input"
                    type="number"
                    value={config.port ?? ''}
                    onChange={(e) => update('port', parseInt(e.target.value) || undefined)}
                    placeholder={String(DB_DEFAULT_PORTS[config.type] ?? '')}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    type="text"
                    value={config.user ?? ''}
                    onChange={(e) => update('user', e.target.value)}
                    placeholder="username"
                    autoComplete="username"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={config.password ?? ''}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Database (optional)</label>
                <input
                  className="form-input"
                  type="text"
                  value={config.database ?? ''}
                  onChange={(e) => update('database', e.target.value)}
                  placeholder="database name"
                />
              </div>

              <label className="form-checkbox-row">
                <input
                  type="checkbox"
                  checked={config.ssl ?? false}
                  onChange={(e) => update('ssl', e.target.checked)}
                />
                <span className="form-checkbox-label">Use SSL / TLS</span>
              </label>
            </>
          )}

          {testResult && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: testResult.success
                  ? 'rgba(74, 222, 128, 0.1)'
                  : 'rgba(248, 113, 113, 0.1)',
                border: `1px solid ${testResult.success ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                fontSize: 'var(--font-size-sm)',
                color: testResult.success ? 'var(--color-success)' : 'var(--color-error)'
              }}
            >
              {testResult.success ? (
                <CheckCircle size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              {testResult.success ? 'Connection successful!' : testResult.error ?? 'Connection failed'}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleTest} disabled={testing}>
            {testing ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Testing...</> : 'Test Connection'}
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || disableConnectActions}>
            {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : null}
            {editConfig ? 'Update' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
