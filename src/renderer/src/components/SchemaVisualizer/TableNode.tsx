import React, { memo } from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { Key, Link, Table } from 'lucide-react'
import type { SchemaTable } from '@renderer/types/schema'

export interface TableNodeData extends Record<string, unknown> {
  table: SchemaTable
  collapsed: boolean
}

// Full node type satisfying @xyflow/react's NodeProps constraint
export type TableNodeType = Node<TableNodeData, 'tableNode'>

const TableNode = memo(function TableNode({ data }: NodeProps<TableNodeType>) {
  const { table, collapsed } = data

  return (
    <div className="schema-table-node">
      {/* Table header */}
      <div className="schema-table-header">
        <Table size={13} className="schema-table-header-icon" />
        <span className="schema-table-name">{table.name}</span>
      </div>

      {/* Columns list – hidden when collapsed */}
      {!collapsed && (
        <div className="schema-table-body">
          {table.columns.map((col) => (
            <div key={col.name} className="schema-column-row">
              {/* Left handle – target for incoming FK edges */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${table.id}.${col.name}`}
                className="schema-handle schema-handle-left"
              />

              {/* Column icon */}
              <span className="schema-column-icon">
                {col.isPrimaryKey ? (
                  <Key size={10} className="schema-icon-pk" />
                ) : col.isForeignKey ? (
                  <Link size={10} className="schema-icon-fk" />
                ) : (
                  <span className="schema-icon-placeholder" />
                )}
              </span>

              {/* Column name */}
              <span className={`schema-column-name${col.isPrimaryKey ? ' pk' : col.isForeignKey ? ' fk' : ''}`}>
                {col.name}
              </span>

              {/* Data type */}
              <span className="schema-column-type">{col.type}</span>

              {/* Right handle – source for outgoing FK edges */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${table.id}.${col.name}`}
                className="schema-handle schema-handle-right"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default TableNode
