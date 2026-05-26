import React, { useState } from 'react'
import { useAppStore } from '../../store'
import { useTranslation } from '../../hooks/useTranslation'
import { getSupportedLocales, setLocale, getLocale } from '../../i18n'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props): JSX.Element {
  const { settings, updateSettings } = useAppStore()
  const { t } = useTranslation()
  const [queryLimit, setQueryLimit] = useState(String(settings.queryLimit))
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(settings.updates.autoCheckEnabled)
  const [checkIntervalHours, setCheckIntervalHours] = useState(String(settings.updates.checkIntervalHours))
  const [aiProvider, setAiProvider] = useState<'ollama' | 'openai-compatible'>(settings.ai?.provider ?? 'ollama')
  const [aiBaseUrl, setAiBaseUrl] = useState(settings.ai?.baseUrl ?? 'http://127.0.0.1:11434')
  const [aiModel, setAiModel] = useState(settings.ai?.model ?? '')
  const [models, setModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState(settings.language ?? getLocale())

  const defaultUrlForProvider = (p: 'ollama' | 'openai-compatible') =>
    p === 'ollama' ? 'http://127.0.0.1:11434' : 'http://127.0.0.1:1234/v1'

  const handleProviderChange = (p: 'ollama' | 'openai-compatible') => {
    setAiProvider(p)
    setAiBaseUrl(defaultUrlForProvider(p))
    setModels([])
    setModelsError(null)
  }

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    setLocale(lang)
  }

  const handleFetchModels = async () => {
    setFetchingModels(true)
    setModelsError(null)
    try {
      const result = await window.db.listAIModels({ provider: aiProvider, baseUrl: aiBaseUrl })
      if (result.success) {
        setModels(result.models)
        if (result.models.length > 0 && !aiModel) {
          setAiModel(result.models[0])
        }
      } else {
        setModelsError(result.error ?? 'Failed to fetch models')
      }
    } catch (err) {
      setModelsError((err as Error).message || 'Failed to fetch models')
    } finally {
      setFetchingModels(false)
    }
  }

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
      language,
      updates: {
        ...settings.updates,
        autoCheckEnabled,
        checkIntervalHours: interval
      },
      ai: aiModel ? { provider: aiProvider, baseUrl: aiBaseUrl, model: aiModel } : settings.ai
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">{t('settings.language')}</label>
            <select
              className="form-input"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {getSupportedLocales().map((locale) => (
                <option key={locale} value={locale}>{t(`lang.${locale}` as Parameters<typeof t>[0])}</option>
              ))}
            </select>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              {t('settings.languageHelp')}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />

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

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
          <div className="form-group">
            <label className="form-label">Local AI Provider</label>
            <select
              className="form-input"
              value={aiProvider}
              onChange={(e) => handleProviderChange(e.target.value as 'ollama' | 'openai-compatible')}
            >
              <option value="ollama">Ollama</option>
              <option value="openai-compatible">OpenAI-compatible (e.g. LM Studio)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Base URL</label>
            <input
              className="form-input"
              type="text"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
              placeholder={defaultUrlForProvider(aiProvider)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Model</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {models.length > 0 ? (
                <select
                  className="form-input"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="e.g. llama3.1"
                  style={{ flex: 1 }}
                />
              )}
              <button
                className="btn btn-secondary"
                onClick={handleFetchModels}
                disabled={fetchingModels || !aiBaseUrl}
                style={{ whiteSpace: 'nowrap' }}
              >
                {fetchingModels ? 'Fetching…' : 'Fetch Models'}
              </button>
            </div>
            {modelsError && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>
                {modelsError}
              </span>
            )}
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              Click "Fetch Models" to load available models from your local AI provider.
            </span>
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

  const defaultUrlForProvider = (p: 'ollama' | 'openai-compatible') =>
    p === 'ollama' ? 'http://127.0.0.1:11434' : 'http://127.0.0.1:1234/v1'

  const handleProviderChange = (p: 'ollama' | 'openai-compatible') => {
    setAiProvider(p)
    setAiBaseUrl(defaultUrlForProvider(p))
    setModels([])
    setModelsError(null)
  }

  const handleFetchModels = async () => {
    setFetchingModels(true)
    setModelsError(null)
    try {
      const result = await window.db.listAIModels({ provider: aiProvider, baseUrl: aiBaseUrl })
      if (result.success) {
        setModels(result.models)
        if (result.models.length > 0 && !aiModel) {
          setAiModel(result.models[0])
        }
      } else {
        setModelsError(result.error ?? 'Failed to fetch models')
      }
    } catch (err) {
      setModelsError((err as Error).message || 'Failed to fetch models')
    } finally {
      setFetchingModels(false)
    }
  }

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
      },
      ai: aiModel ? { provider: aiProvider, baseUrl: aiBaseUrl, model: aiModel } : settings.ai
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
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

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
          <div className="form-group">
            <label className="form-label">Local AI Provider</label>
            <select
              className="form-input"
              value={aiProvider}
              onChange={(e) => handleProviderChange(e.target.value as 'ollama' | 'openai-compatible')}
            >
              <option value="ollama">Ollama</option>
              <option value="openai-compatible">OpenAI-compatible (e.g. LM Studio)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Base URL</label>
            <input
              className="form-input"
              type="text"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
              placeholder={defaultUrlForProvider(aiProvider)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Model</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {models.length > 0 ? (
                <select
                  className="form-input"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="e.g. llama3.1"
                  style={{ flex: 1 }}
                />
              )}
              <button
                className="btn btn-secondary"
                onClick={handleFetchModels}
                disabled={fetchingModels || !aiBaseUrl}
                style={{ whiteSpace: 'nowrap' }}
              >
                {fetchingModels ? 'Fetching…' : 'Fetch Models'}
              </button>
            </div>
            {modelsError && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>
                {modelsError}
              </span>
            )}
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              Click "Fetch Models" to load available models from your local AI provider.
            </span>
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
