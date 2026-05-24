import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import TableNode, { type TableNodeData } from './TableNode'
import type { DatabaseSchema, SchemaViewMode } from '../../../types/schema'

// ─── Dagre layout constants ──────────────────────────────────────────────────
const NODE_WIDTH = 260
const BASE_HEIGHT = 48   // header only
const ROW_HEIGHT = 28    // per column row
const COLLAPSED_THRESHOLD = 30 // tables above this count default to collapsed

// ─── Node type registry ──────────────────────────────────────────────────────
const nodeTypes: NodeTypes = { tableNode: TableNode }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function estimateNodeHeight(columnCount: number, collapsed: boolean): number {
  return collapsed ? BASE_HEIGHT : BASE_HEIGHT + columnCount * ROW_HEIGHT
}

function runDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 })

  nodes.forEach((n) => {
    const data = n.data as TableNodeData
    const h = estimateNodeHeight(data.table.columns.length, data.collapsed)
    g.setNode(n.id, { width: NODE_WIDTH, height: h })
  })
  edges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map((n) => {
    const { x, y } = g.node(n.id)
    return { ...n, position: { x: x - NODE_WIDTH / 2, y: y - estimateNodeHeight((n.data as TableNodeData).table.columns.length, (n.data as TableNodeData).collapsed) / 2 } }
  })
}

// ─── Inner canvas (needs to be inside ReactFlowProvider) ─────────────────────
interface CanvasInnerProps {
  schema: DatabaseSchema
  mode: SchemaViewMode
  selectedTableId?: string
}

function CanvasInner({ schema, mode, selectedTableId }: CanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const initialised = useRef(false)

  const buildGraph = useCallback(() => {
    const isGlobal = mode === 'GLOBAL_MODE'
    const shouldCollapse = isGlobal && schema.tables.length > COLLAPSED_THRESHOLD

    // Determine which tables to show
    let visibleTables = schema.tables
    let visibleEdges = schema.relationships

    if (mode === 'FOCUSED_MODE' && selectedTableId) {
      // Find tables directly related to the selected table
      const relatedTableIds = new Set<string>([selectedTableId])
      schema.relationships.forEach((r) => {
        if (r.sourceTable === selectedTableId) relatedTableIds.add(r.targetTable)
        if (r.targetTable === selectedTableId) relatedTableIds.add(r.sourceTable)
      })
      visibleTables = schema.tables.filter((t) => relatedTableIds.has(t.id))
      visibleEdges = schema.relationships.filter(
        (r) => relatedTableIds.has(r.sourceTable) && relatedTableIds.has(r.targetTable)
      )
    }

    const rawNodes: Node[] = visibleTables.map((table) => ({
      id: table.id,
      type: 'tableNode',
      position: { x: 0, y: 0 },
      data: {
        table,
        collapsed: shouldCollapse && table.id !== selectedTableId
      } satisfies TableNodeData
    }))

    const rawEdges: Edge[] = visibleEdges.map((rel) => ({
      id: rel.id,
      source: rel.sourceTable,
      target: rel.targetTable,
      sourceHandle: `${rel.sourceTable}.${rel.sourceColumn}`,
      targetHandle: `${rel.targetTable}.${rel.targetColumn}`,
      type: 'smoothstep',
      animated: false,
      style: { stroke: 'var(--schema-edge-color, #7b7bea)', strokeWidth: 1.5 },
      labelStyle: { fill: 'var(--text-secondary)', fontSize: 10 }
    }))

    const layoutNodes = runDagreLayout(rawNodes, rawEdges)
    setNodes(layoutNodes)
    setEdges(rawEdges)
  }, [schema, mode, selectedTableId, setNodes, setEdges])

  useEffect(() => {
    buildGraph()
    initialised.current = true
  }, [buildGraph])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.05}
      maxZoom={2}
      panOnScroll
      zoomOnPinch
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
      className="schema-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} className="schema-bg" />
      <Controls className="schema-controls" />
      <MiniMap
        nodeColor={() => 'var(--schema-minimap-node, #7b7bea44)'}
        maskColor="var(--schema-minimap-mask, rgba(8,8,15,0.7))"
        className="schema-minimap"
      />
    </ReactFlow>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────
export interface SchemaCanvasProps {
  schema: DatabaseSchema
  mode?: SchemaViewMode
  selectedTableId?: string
}

export function SchemaCanvas({ schema, mode = 'GLOBAL_MODE', selectedTableId }: SchemaCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner schema={schema} mode={mode} selectedTableId={selectedTableId} />
    </ReactFlowProvider>
  )
}
