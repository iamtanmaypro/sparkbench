// Custom React Flow node: draws each electrical part as inline SVG so the
// canvas looks like a schematic, with terminal Handles at the lead tips.
// The node renders ONLY store data; interactions call store actions.

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { ComponentType } from '../../engine/netlist'
import type { Origin } from '../../store/useBenchStore'
import { useBenchStore } from '../../store/useBenchStore'

export interface ComponentData extends Record<string, unknown> {
  componentId: string
  componentType: ComponentType
  /** Nominal value (V / ohm / A); 0 means model default. */
  value: number
  closed?: boolean
  burnedOut?: boolean
  blown?: boolean
  lit: boolean
  /** Live solver reading for meter faces. */
  voltage: number
  current: number
  origin?: Origin
}

export type BenchNodeRF = Node<ComponentData, 'component'>

const W = 84
const H = 44
// Lead tip coordinates where terminals sit (relative to node box).
const LEAD_L = { x: 6, y: H / 2 }
const LEAD_R = { x: W - 6, y: H / 2 }

function fmt(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1) return v.toFixed(2)
  if (abs >= 0.001) return `${(v * 1000).toFixed(1)}m`
  return v.toExponential(1)
}

/** The schematic glyph for each part, drawn in an 84x44 box with leads. */
function Glyph(p: ComponentData) {
  switch (p.componentType) {
    case 'battery':
      return (
        <>
          {/* long plate = +, short plate = - */}
          <line x1={34} y1={8} x2={34} y2={36} className="stroke-thick" />
          <line x1={42} y1={14} x2={42} y2={30} className="stroke-thick" />
          <line x1={50} y1={8} x2={50} y2={36} className="stroke-thick" />
          <line x1={58} y1={14} x2={58} y2={30} className="stroke-thick" />
          <text x={W / 2} y={10} className="glyph-value">
            {p.value > 0 ? `${p.value}V` : '3V'}
          </text>
        </>
      )
    case 'resistor':
      return (
        <>
          <polyline
            points="24,22 28,10 35,34 42,10 49,34 56,10 60,22"
            fill="none"
            className="stroke-body"
          />
          <text x={W / 2} y={9} className="glyph-value">
            {p.value > 0 ? `${fmt(p.value)}Ω` : '100Ω'}
          </text>
        </>
      )
    case 'led':
      return (
        <>
          <polygon points="32,8 32,36 54,22" fill={p.burnedOut ? '#3a2f2f' : p.lit ? '#ffdf6b' : 'none'} className="stroke-body" />
          <line x1={54} y1={10} x2={54} y2={34} className="stroke-body" />
          {p.lit && !p.burnedOut && (
            <g className="led-rays">
              <line x1={26} y1={6} x2={20} y2={2} />
              <line x1={24} y1={16} x2={16} y2={13} />
              <line x1={58} y1={6} x2={64} y2={2} />
              <line x1={62} y1={16} x2={70} y2={13} />
            </g>
          )}
        </>
      )
    case 'bulb':
      return (
        <>
          <circle cx={42} cy={22} r={14} fill={p.lit ? 'radial-gradient(#fff7cf,#f5a623)' : p.burnedOut ? '#33291f' : 'none'} className={`stroke-body ${p.lit ? 'bulb-glow' : ''}`} />
          <line x1={33} y1={13} x2={51} y2={31} className="stroke-thin" />
          <line x1={51} y1={13} x2={33} y2={31} className="stroke-thin" />
        </>
      )
    case 'switch':
      return (
        <>
          <circle cx={30} cy={22} r={3} className="dot" />
          <circle cx={54} cy={22} r={3} className="dot" />
          <line
            x1={30}
            y1={22}
            x2={54}
            y2={p.closed ? 22 : 8}
            className="stroke-body lever"
            style={{ transformOrigin: '30px 22px', transition: 'transform 120ms ease' }}
          />
        </>
      )
    case 'fuse':
      return (
        <>
          <rect x={26} y={12} width={32} height={20} rx={4} fill="none" className="stroke-body" />
          {p.blown ? (
            // Broken element: the visual tell of a blown fuse.
            <>
              <path d="M28 22 q5 -6 10 0" fill="none" className="stroke-thin" />
              <path d="M46 22 q5 -6 10 0" fill="none" className="stroke-thin" transform="translate(-4 0)" />
              <circle cx={41} cy={25} r={1.6} className="fault-dot" />
            </>
          ) : (
            <path d="M28 22 q7 -8 14 0 t14 0" fill="none" className="stroke-thin" />
          )}
        </>
      )
    case 'ammeter':
      return (
        <>
          <circle cx={42} cy={22} r={15} fill="var(--panel)" className="stroke-body" />
          <text x={42} y={27} textAnchor="middle" className="meter-face">
            {`${fmt(Math.abs(p.current))}A`}
          </text>
        </>
      )
    case 'voltmeter':
      return (
        <>
          <circle cx={42} cy={22} r={15} fill="var(--panel)" className="stroke-body" />
          <text x={42} y={27} textAnchor="middle" className="meter-face">
            {`${fmt(Math.abs(p.voltage))}V`}
          </text>
        </>
      )
    default:
      return null
  }
}

export const ComponentNode = memo(function ComponentNode({ id, data }: NodeProps<BenchNodeRF>) {
  const d = data as ComponentData
  const toggleSwitch = useBenchStore((s) => s.toggleSwitch)
  const select = useBenchStore((s) => s.select)
  const selectedId = useBenchStore((s) => s.selectedId)
  const focusId = useBenchStore((s) => s.focusRequest?.id ?? null)
  const isSelected = selectedId === id
  // focus_component targets this part: pulse so "look here" reads at a glance.
  const isFocused = focusId === id

  const faulty = !!(d.burnedOut || d.blown)

  const body = (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${d.componentId} (${d.componentType})`}>
      {/* leads */}
      <line x1={LEAD_L.x} y1={LEAD_L.y} x2={26} y2={LEAD_L.y} className="lead" />
      <line x1={W - 26} y1={LEAD_R.y} x2={LEAD_R.x} y2={LEAD_R.y} className="lead" />
      <Glyph {...d} />
    </svg>
  )

  return (
    <div
      className={[
        'comp-node',
        `type-${d.componentType}`,
        isSelected ? 'is-selected' : '',
        isFocused ? 'focus-pulse' : '',
        d.lit ? 'is-lit' : '',
        faulty ? 'is-faulty' : '',
        d.origin === 'agent' ? 'from-agent' : '',
      ].join(' ')}
      // Select on click, not mousedown: React Flow's d3-drag stops immediate
      // propagation on mousedown, so a mousedown handler never sees body
      // clicks and the Inspector could only ever show the last-placed part.
      // d3 suppresses click after a real drag, so this stays click-only.
      onClick={() => select(id)}
    >
      {/* Two terminal posts; each exposes source+target so wires can run any direction. */}
      <Handle type="target" position={Position.Left} id="a" className="terminal" style={{ left: 4 }} />
      <Handle type="source" position={Position.Left} id="a" className="terminal terminal-start" style={{ left: 4 }} />
      <Handle type="source" position={Position.Right} id="b" className="terminal" style={{ right: 4 }} />
      <Handle type="target" position={Position.Right} id="b" className="terminal terminal-start" style={{ right: 4 }} />

      {d.componentType === 'switch' ? (
        <button
          type="button"
          className="comp-body as-button"
          onClick={() => toggleSwitch(id)}
          aria-label={`${d.closed ? 'Open' : 'Close'} switch ${id}`}
          aria-pressed={!!d.closed}
        >
          {body}
        </button>
      ) : (
        <div className="comp-body">{body}</div>
      )}

      <div className="node-meta">
        <span className="node-id">{id}</span>
        {d.origin === 'agent' && <span className="agent-badge">placed by Agent</span>}
        {(d.burnedOut || d.blown) && (
          <span className="fault-badge">{d.blown ? 'blown' : 'burned out'}</span>
        )}
      </div>
    </div>
  )
})
