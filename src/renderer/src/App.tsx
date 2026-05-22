import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Database, LayoutPanelLeft, Moon, Sun, Monitor, Info, Shield } from 'lucide-react'
import { useAppStore } from './store'
import { useIsLightTheme } from './hooks/useIsLightTheme'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { QueryEditor } from './components/QueryEditor'
import { ResultsTable } from './components/ResultsTable'
import { ConnectionModal } from './components/ConnectionModal'
import type { ConnectionConfig } from './types'

// Read version from package.json (injected by Vite at build time)
const APP_VERSION = __APP_VERSION__

export default function App(): JSX.Element {
  const {
    tabs,
    activeTabId,
    connections,
    connectedIds,
    statusMessage,
    statusType,
    sidebarWidth,
    isSidebarCollapsed,
    theme,
    loadConnections,
    loadSavedQueries,
    newTab,
    setSidebarWidth,
    setSidebarCollapsed,
    setTheme
  } = useAppStore()

  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null)
  const [showPrivacy, setShowPrivacy] = useState(false)

  // Resize state
  const isResizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // Vertical split state
  const [resultsPanelHeight, setResultsPanelHeight] = useState(240)
  const isSplitting = useRef(false)
  const splitStartY = useRef(0)
  const splitStartHeight = useRef(0)

  useEffect(() => {
    loadConnections()
    loadSavedQueries()
  }, [loadConnections, loadSavedQueries])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        newTab()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [newTab])

  // Sidebar resize
  const startResize = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    resizeStartX.current = e.clientX
    resizeStartWidth.current = sidebarWidth

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = e.clientX - resizeStartX.current
      const newWidth = Math.max(180, Math.min(480, resizeStartWidth.current + delta))
      setSidebarWidth(newWidth)
    }
    const onMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth, setSidebarWidth])

  // Results panel resize
  const startSplit = useCallback((e: React.MouseEvent) => {
    isSplitting.current = true
    splitStartY.current = e.clientY
    splitStartHeight.current = resultsPanelHeight

    const onMouseMove = (e: MouseEvent) => {
      if (!isSplitting.current) return
      const delta = splitStartY.current - e.clientY
      const newHeight = Math.max(80, Math.min(600, splitStartHeight.current + delta))
      setResultsPanelHeight(newHeight)
    }
    const onMouseUp = () => {
      isSplitting.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [resultsPanelHeight])

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null

  const isLightTheme = useIsLightTheme()

  const handleOpenModal = (config?: ConnectionConfig) => {
    setEditingConnection(config ?? null)
    setShowConnectionModal(true)
  }

  return (
    <div className={`app-root${isLightTheme ? ' theme-light' : ''}`}>
      {/* Title bar */}
      <div className="titlebar">
        <div className="titlebar-brand">
          <div className="titlebar-logo">P</div>
          <span className="titlebar-name">PrismSQL</span>
        </div>
        <div className="titlebar-actions">
          <button
            className="icon-btn"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
              setTheme(next)
            }}
            data-tooltip={`Theme: ${theme}`}
          >
            {theme === 'dark' ? <Moon size={15} /> : theme === 'light' ? <Sun size={15} /> : <Monitor size={15} />}
          </button>
          <button
            className={`icon-btn ${isSidebarCollapsed ? '' : 'active'}`}
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            data-tooltip={isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
          >
            <LayoutPanelLeft size={15} />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="main-layout">
        {/* Sidebar */}
        {!isSidebarCollapsed && (
          <>
            <div
              style={{ width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <Sidebar onNewConnection={() => handleOpenModal()} onEditConnection={handleOpenModal} />
            </div>
            {/* Resize handle */}
            <div className="resize-handle" onMouseDown={startResize} />
          </>
        )}

        {/* Content area */}
        <div className="content-pane">
          {/* Tab bar */}
          <TabBar />

          {/* Query workspace */}
          {activeTab ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Editor */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <QueryEditor tab={activeTab} />
              </div>

              {/* Splitter */}
              <div className="pane-splitter" onMouseDown={startSplit} />

              {/* Results */}
              <div style={{ height: resultsPanelHeight, flexShrink: 0, overflow: 'hidden' }}>
                {activeTab.result ? (
                  <ResultsTable result={activeTab.result} />
                ) : (
                  <div className="results-pane" style={{ height: '100%', alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                      Run a query to see results
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : connections.length > 0 ? (
            /* Connections exist – prompt user to pick one */
            <div className="welcome-screen">
              <div className="welcome-card">
                <div className="welcome-logo">P</div>
                <div className="welcome-title">PrismSQL</div>
                <div className="welcome-sub">
                  You have {connections.length} saved connection{connections.length !== 1 ? 's' : ''}.
                  Select one from the sidebar to start querying, or open a new tab.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => newTab()}>
                    <Database size={14} /> New Query Tab
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleOpenModal()}>
                    <Database size={14} /> Add Connection
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* No connections yet – first-run welcome */
            <div className="welcome-screen">
              <div className="welcome-card">
                <div className="welcome-logo">P</div>
                <div className="welcome-title">Welcome to PrismSQL</div>
                <div className="welcome-sub">
                  A modern SQL client with a beautiful glassmorphism interface.
                  Connect to MySQL, PostgreSQL, SQLite, or SQL Server.
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                  <Database size={14} /> New Connection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="statusbar">
        <span className={`statusbar-msg ${statusType}`}>
          {statusMessage}
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>
          {connectedIds.size} connection{connectedIds.size !== 1 ? 's' : ''} active
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>
          Built by JosephThien – KobeT · © {new Date().getFullYear()} · v{APP_VERSION}
        </span>
        <button
          className="icon-btn"
          onClick={() => setShowPrivacy(true)}
          data-tooltip="Privacy & Data Collection"
          style={{ width: 20, height: 20 }}
        >
          <Shield size={12} />
        </button>
        <button
          className="icon-btn"
          onClick={() => window.open('https://kobenguyent.github.io/PrismSQL/', '_blank')}
          data-tooltip="Documentation"
          style={{ width: 20, height: 20 }}
        >
          <Info size={12} />
        </button>
      </div>

      {/* Connection modal */}
      {showConnectionModal && (
        <ConnectionModal
          onClose={() => setShowConnectionModal(false)}
          editConfig={editingConnection}
        />
      )}

      {/* Privacy modal */}
      {showPrivacy && (
        <div className="modal-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Privacy &amp; Data Collection</span>
              <button className="icon-btn" onClick={() => setShowPrivacy(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ gap: 12, lineHeight: 1.65, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>PrismSQL does not collect any personal data.</strong>
              </p>
              <p>
                All database connection credentials and saved queries are stored locally on your
                machine using the operating system's user-data directory. No information is ever
                sent to external servers by PrismSQL itself.
              </p>
              <p>
                PrismSQL does <em>not</em> include analytics, telemetry, crash-reporting services,
                or any third-party tracking. Network traffic is only ever initiated by the database
                connections you explicitly configure.
              </p>
              <p>
                Built by <strong style={{ color: 'var(--text-primary)' }}>JosephThien – KobeT</strong>.
                Licensed under the MIT License.
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                © {new Date().getFullYear()} kobenguyent. All rights reserved.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPrivacy(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
