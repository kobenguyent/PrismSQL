import React, { useState } from 'react'
import { useAppStore } from '../../store'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props): JSX.Element {
  const { settings, updateSettings } = useAppStore()
  const [queryLimit, setQueryLimit] = useState(String(settings.queryLimit))
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(settings.updates.autoCheckEnabled)
  const [checkIntervalHours, setCheckIntervalHours] = useState(String(settings.updates.checkIntervalHours))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const limit = parseInt(queryLimit, 10)
    const interval = parseInt(checkIntervalHours, 10)
    if (isNaN(limit) || limit < 1 || limit > 10000) {
      setError('Query limit must be a number between 1 and 10,000')
      return
    }
    if (isNaN(interval) || interval < 6 || interval > 168) {
      setError('Update check interval must be between 6 and 168 hours')
      return
    }
    setSaving(true)
    setError(null)
    await updateSettings({
      queryLimit: limit,
      updates: {
        ...settings.updates,
        autoCheckEnabled,
        checkIntervalHours: interval
      }
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Default Query Row Limit</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={10000}
              value={queryLimit}
              onChange={(e) => setQueryLimit(e.target.value)}
              placeholder="100"
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              Rows returned when browsing a table (e.g. SELECT * FROM …). Default: 100. Max: 10,000.
            </span>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={autoCheckEnabled}
                onChange={(e) => setAutoCheckEnabled(e.target.checked)}
              />
              Enable update checks
            </label>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              Checks GitHub releases for newer versions. You can disable this anytime.
            </span>
          </div>
          <div className="form-group">
            <label className="form-label">Update Check Interval (hours)</label>
            <select
              className="form-input"
              value={checkIntervalHours}
              onChange={(e) => setCheckIntervalHours(e.target.value)}
              disabled={!autoCheckEnabled}
            >
              <option value="6">Every 6 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Every 24 hours</option>
              <option value="48">Every 48 hours</option>
              <option value="168">Every 7 days</option>
            </select>
          </div>
          {error && (
            <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{error}</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
