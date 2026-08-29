// The workbench: React Flow canvas bound to the Zustand store. Nodes render
// components, edges are wires, handles are terminals. Every interaction here
// calls a store action; the component itself holds no circuit state.

import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import type { Connection, Edge, OnNodeDrag } from '@xyflow/react'
import { ReactFlowProvider } from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import { useBenchStore } from '../store/useBenchStore'
import type { Terminal } from '../engine/netlist'
import { getLesson } from '../lessons'
import { ComponentNode } from './nodes/ComponentNode'
import type { BenchNodeRF, ComponentData } from './nodes/ComponentNode'
import { WireEdge } from './WireEdge'
import { Palette } from './Palette'
import { LessonPanel } from './LessonPanel'
import { Inspector } from './Inspector'
import { NotesLayer } from './NotesLayer'

const nodeTypes = { component: ComponentNode }
const edgeTypes = { wire: WireEdge }

function WorkbenchInner() {
  const currentLessonId = useBenchStore((s) => s.currentLessonId)
  const lesson = useMemo(() => getLesson(currentLessonId), [currentLessonId])

  // Store -> React Flow projection. Positions live in RF state while dragging
  // and commit to the store on drag stop (keeps 60fps without store churn).
  const storeNodes = useBenchStore(useShallow((s) => s.nodes))
  const components = useBenchStore(useShallow((s) => s.components))
  const solution = useBenchStore((s) => s.solution)
  const wires = useBenchStore(useShallow((s) => s.wires))
  const origins = useBenchStore((s) => s.origins)
  const moveNode = useBenchStore((s) => s.moveNode)
  const connectTerminals = useBenchStore((s) => s.connectTerminals)
  const removeWire = useBenchStore((s) => s.removeWire)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<BenchNodeRF>(
    storeNodes.map((n) => ({
      id: n.id,
      type: 'component' as const,
      position: { x: n.x, y: n.y },
      data: buildData(n.id, n.type),
    })),
  )

  // Keep node data (readings, lit flags, switch state) in sync with the store.
  const dataByKey = useMemo(() => {
    const m = new Map<string, ComponentData>()
    for (const n of storeNodes) m.set(n.id, buildData(n.id, n.type))
    return m
  }, [storeNodes, components, solution, origins]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildData(id: string, type: BenchNodeRF['data']['componentType']): ComponentData {
    const comp = components.find((c) => c.id === id)
    const reading = solution.readings[id]
    return {
      componentId: id,
      componentType: type,
      value: comp?.value ?? 0,
      closed: comp?.closed,
      burnedOut: comp?.burnedOut,
      blown: comp?.blown,
      voltage: reading?.voltage ?? 0,
      current: reading?.current ?? 0,
      origin: origins[id],
      lit: isLit(type, !comp?.burnedOut && !comp?.blown ? reading : undefined),
    }
  }

  const syncData = useCallback(
    () =>
      setRfNodes((nds) => {
        // Add nodes that appeared in the store (lesson load, placement).
        const known = new Set(nds.map((n) => n.id))
        const added = storeNodes
          .filter((n) => !known.has(n.id))
          .map((n) => ({
            id: n.id,
            type: 'component' as const,
            position: { x: n.x, y: n.y },
            data: buildData(n.id, n.type),
          }))
        const kept = nds
          .filter((n) => storeNodes.some((s) => s.id === n.id))
          .map((n) => {
            const d = dataByKey.get(n.id)
            return d ? { ...n, data: d } : n
          })
        return [...kept, ...added]
      }),
    [dataByKey, setRfNodes, storeNodes],
  )

  // Re-sync after any store-driven change; cheap at bench scale (<50 nodes).
  useMemo(() => syncData(), [syncData])

  // Drop RF nodes the store no longer has (component deleted, lesson reset).
  useEffect(() => {
    setRfNodes((nds) => nds.filter((n) => storeNodes.some((s) => s.id === n.id)))
  }, [storeNodes, setRfNodes])

  const rfEdges: Edge[] = useMemo(
    () =>
      wires.map((w) => ({
        id: w.id,
        source: w.from.slice(0, w.from.lastIndexOf(':')),
        sourceHandle: w.from.slice(w.from.lastIndexOf(':') + 1),
        target: w.to.slice(0, w.to.lastIndexOf(':')),
        targetHandle: w.to.slice(w.to.lastIndexOf(':') + 1),
        type: 'wire' as const,
      })),
    [wires],
  )
  const [renderedEdges, setRenderedEdges, onEdgesChange] = useEdgesState(rfEdges)
  useMemo(() => setRenderedEdges(rfEdges), [rfEdges, setRenderedEdges])

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return
      connectTerminals(
        `${conn.source}:${conn.sourceHandle}` as Terminal,
        `${conn.target}:${conn.targetHandle}` as Terminal,
      )
    },
    [connectTerminals],
  )

  const onNodeDragStop: OnNodeDrag<BenchNodeRF> = useCallback(
    (_event, node) => moveNode(node.id, node.position.x, node.position.y),
    [moveNode],
  )

  return (
    <div className="workbench">
      <aside className="side-left">
        <LessonPanel />
        <Palette allowed={lesson?.allowedComponents ?? []} />
      </aside>

      <main className="canvas-wrap">
        <ReactFlow
          nodes={rfNodes}
          edges={renderedEdges}
          onNodesChange={(changes) => {
            onNodesChange(changes)
            // Commit positions as they change so the store stays authoritative.
            for (const ch of changes) {
              if (ch.type === 'position' && ch.position) {
                moveNode(ch.id, ch.position.x ?? 0, ch.position.y ?? 0)
              }
            }
          }}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={(changes) => {
            onEdgesChange(changes)
            for (const ch of changes) {
              if (ch.type === 'remove') removeWire(ch.id)
            }
          }}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'wire' }}
          deleteKeyCode={['Backspace', 'Delete']}
          connectionRadius={24}
          fitView
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          aria-label="Circuit workbench canvas"
        >
          <Background gap={18} color="#1c232b" className="bench-bg" />
          <Controls showInteractive={false} aria-label="Canvas zoom controls" />
          <MiniMap pannable zoomable className="minimap" aria-label="Canvas minimap" />
        </ReactFlow>
        <NotesLayer />
      </main>

      <aside className="side-right">
        <Inspector />
      </aside>
    </div>
  )
}

function isLit(type: string, reading?: { power: number }): boolean {
  if (!reading) return false
  if (type !== 'led' && type !== 'bulb') return false
  return reading.power > 1e-4
}

/** Provider wrapper so hooks like useReactFlow work inside panels later. */
export function Workbench() {
  return (
    <ReactFlowProvider>
      <WorkbenchInner />
    </ReactFlowProvider>
  )
}

// Re-exported for tests that seed edges through addEdge semantics.
export { addEdge }
