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
  ConnectionMode,
  useReactFlow,
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
import { ApprovalCard } from './ApprovalCard'
import { HintPanel } from './HintPanel'

const nodeTypes = { component: ComponentNode }
const edgeTypes = { wire: WireEdge }

function WorkbenchInner() {
  const currentLessonId = useBenchStore((s) => s.currentLessonId)
  const lesson = useMemo(() => getLesson(currentLessonId), [currentLessonId])
  const rf = useReactFlow()

  // A new lesson seeds a fresh bench; if the student panned away, the seeded
  // parts would render offscreen. Re-fit whenever the lesson changes. Empty
  // benches (free build) are skipped: fitting zero nodes clamps zoom to max.
  // No duration: d3 tweens run on rAF, which browsers throttle for occluded
  // windows, leaving the viewport frozen mid-animation.
  useEffect(() => {
    const next = getLesson(currentLessonId)
    if (!next || next.initialNetlist.components.length === 0) return
    const t = setTimeout(() => rf.fitView({ padding: 0.25 }), 60)
    return () => clearTimeout(t)
  }, [currentLessonId, rf])

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
  const removeComponent = useBenchStore((s) => s.removeComponent)
  const select = useBenchStore((s) => s.select)
  const focusRequest = useBenchStore((s) => s.focusRequest)

  // Agent "look here" (focus_component): pan/zoom to the part. Same pattern
  // as the lesson fit above: settle after layout, no duration (rAF throttle).
  useEffect(() => {
    if (!focusRequest) return
    const t = setTimeout(() => {
      rf.fitView({ nodes: [{ id: focusRequest.id }], padding: 0.6, maxZoom: 1.5 })
    }, 60)
    return () => clearTimeout(t)
  }, [focusRequest, rf])

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
            const storeNode = storeNodes.find((s) => s.id === n.id)!
            const d = dataByKey.get(n.id)
            return {
              // The store owns positions too: lesson reseed/reset must move
              // existing RF nodes, not just fresh ones. During drags this is a
              // no-op because moveNode commits the same coordinates back.
              ...n,
              position: { x: storeNode.x, y: storeNode.y },
              ...(d ? { data: d } : {}),
            }
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

  // Clicking the empty canvas is the natural "deselect" gesture. React Flow's
  // own pane click only hides the selection box; node.selected flags persist,
  // so a later Backspace would delete a part the student believes is
  // deselected. Clear both the store selection and RF's node selection.
  const onPaneClick = useCallback(() => {
    select(null)
    setRfNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)))
  }, [select, setRfNodes])

  return (
    <div className="workbench">
      <aside className="side-left" aria-label="Lessons and parts">
        <LessonPanel />
        <Palette allowed={lesson?.allowedComponents ?? []} />
      </aside>

      {/* A plain region, not a second <main>: the app shell owns the page's
          single main landmark (axe: landmark-no-duplicate-main). */}
      <div className="canvas-wrap" role="region" aria-label="Circuit workbench canvas">
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
              // Keyboard delete (Backspace/Delete on a selected node) must
              // reach the store, or the part silently resurrects on re-sync.
              if (ch.type === 'remove') removeComponent(ch.id)
            }
          }}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
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
          // Loose mode: any terminal post can start or receive a wire. With
          // strict mode the right-hand post is target-only on top, so dragging
          // from it (the natural gesture) silently did nothing.
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']}
          connectionRadius={24}
          fitView
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          // No aria-label here: it would land on a plain wrapper div where
          // aria-label is prohibited. The named region above carries the
          // canvas's accessible name.
        >
          <Background gap={18} color="#1c232b" className="bench-bg" />
          {/* No aria-label on Controls: RF renders a plain wrapper div, where
              aria-label is prohibited (axe: aria-prohibited-attr). The zoom
              buttons inside carry their own labels. */}
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="minimap" aria-label="Canvas minimap" />
        </ReactFlow>
        <NotesLayer />
        <ApprovalCard />
        {/* Empty state: an empty bench (free build, fresh reset) shows the
            example prompts right on the canvas. The overlay ignores pointer
            events so panning/zooming around it still works. */}
        {components.length === 0 && (
          <div className="canvas-empty">
            <HintPanel variant="canvas" />
          </div>
        )}
      </div>

      <aside className="side-right" aria-label="Component inspector">
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
