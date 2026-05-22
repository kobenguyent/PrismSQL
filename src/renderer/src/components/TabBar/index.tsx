import React from 'react'
import { Plus, X, Table, Code2, FunctionSquare } from 'lucide-react'
import { useAppStore } from '../../store'

function TabIcon({ tabType }: { tabType: 'query' | 'table' | 'procedure' | undefined }): JSX.Element {
  if (tabType === 'table') return <Table size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
  if (tabType === 'procedure') return <FunctionSquare size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
  return <Code2 size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
}

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, newTab, closeTab, setActiveTab } = useAppStore()

  return (
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
