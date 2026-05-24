import React, { useMemo, useState } from 'react'
import { Plus, X, Table, Code2, FunctionSquare } from 'lucide-react'
import { useAppStore } from '../../store'

function TabIcon({ tabType }: { tabType: 'query' | 'table' | 'procedure' | undefined }): JSX.Element {
  if (tabType === 'table') return <Table size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
  if (tabType === 'procedure') return <FunctionSquare size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
  return <Code2 size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
}

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, newTab, closeTab, setActiveTab, saveCurrentQuery } = useAppStore()
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null)
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false)

  const pendingCloseTab = useMemo(
    () => tabs.find((t) => t.id === pendingCloseTabId) ?? null,
    [tabs, pendingCloseTabId]
  )

  const isDirtyQueryTab = (tabId: string): boolean => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab || tab.tabType !== 'query') return false
    const baseline = tab.lastSavedSql ?? ''
    return tab.sql !== baseline
  }

  const requestCloseTab = (tabId: string): void => {
    if (!isDirtyQueryTab(tabId)) {
      closeTab(tabId)
      return
    }
    setPendingCloseTabId(tabId)
  }

  const handleDontSave = (): void => {
    if (!pendingCloseTabId) return
    closeTab(pendingCloseTabId)
    setPendingCloseTabId(null)
  }

  const handleSaveAndClose = async (): Promise<void> => {
    if (!pendingCloseTab) return
    setIsSavingBeforeClose(true)
    try {
      await saveCurrentQuery(pendingCloseTab.id, pendingCloseTab.title)
      closeTab(pendingCloseTab.id)
      setPendingCloseTabId(null)
    } finally {
      setIsSavingBeforeClose(false)
    }
  }

  return (
    <>
      <div className="tabbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.title}
          >
            {tab.isRunning ? (
              <span className="spinner" style={{ width: 10, height: 10, flexShrink: 0 }} />
            ) : (
              <TabIcon tabType={tab.tabType} />
            )}
            <span className="tab-name">
              {isDirtyQueryTab(tab.id) && <span className="tab-dirty-dot" aria-hidden="true" />}
              {tab.title || 'Query'}
            </span>
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation()
                requestCloseTab(tab.id)
              }}
            >
              <X size={10} />
            </span>
          </div>
        ))}
        <div
          className="tab-new-btn"
          onClick={() => newTab()}
          data-tooltip="New Query Tab (Ctrl+T)"
          title="New Query Tab (Ctrl+T)"
        >
          <Plus size={14} />
        </div>
      </div>
      {pendingCloseTab && (
        <div className="modal-overlay" onClick={() => setPendingCloseTabId(null)}>
          <div className="modal-panel" style={{ width: 430, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Unsaved changes</span>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                Save changes to <strong>{pendingCloseTab.title}</strong> before closing?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPendingCloseTabId(null)} disabled={isSavingBeforeClose}>
                Cancel
              </button>
              <button className="btn btn-ghost" onClick={handleDontSave} disabled={isSavingBeforeClose}>
                Don&apos;t Save
              </button>
              <button className="btn btn-primary" onClick={() => void handleSaveAndClose()} disabled={isSavingBeforeClose}>
                {isSavingBeforeClose ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
