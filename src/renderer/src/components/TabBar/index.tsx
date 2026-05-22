import React from 'react'
import { Plus, X } from 'lucide-react'
import { useAppStore } from '../../store'

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, newTab, closeTab, setActiveTab } = useAppStore()

  return (
    <div className="tabbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.isRunning && (
            <span className="spinner" style={{ width: 10, height: 10, flexShrink: 0 }} />
          )}
          <span className="tab-name">{tab.title || 'Query'}</span>
          <span
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
          >
            <X size={10} />
          </span>
        </div>
      ))}
      <div className="tab-new-btn" onClick={() => newTab()} title="New Tab (Ctrl+T)">
        <Plus size={14} />
      </div>
    </div>
  )
}
