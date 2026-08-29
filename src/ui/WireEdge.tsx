// Wire edges: a thicker colored stroke over React Flow's base path so wires
// read as physical leads. Selection/delete still handled by the canvas.
//
// Energize (DESIGN.md 7): when the solved circuit carries current, wires
// transition to the live --spark color over a soft --spark-soft halo. The
// conduction signal is read from the same store projection the meters use;
// wires carry no separate electrical state, so "current is flowing" is the
// honest bench-level tell that a wire is part of a live loop.

import { BaseEdge, getSmoothStepPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { useBenchStore } from '../store/useBenchStore'

const CURRENT_EPS = 1e-6

export function WireEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } = props
  const live = useBenchStore((s) => {
    if (!s.solution.ok) return false
    for (const id in s.solution.readings) {
      if (Math.abs(s.solution.readings[id]!.current) > CURRENT_EPS) return true
    }
    return false
  })
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 6,
  })
  return (
    <g className={live ? 'wire-live' : undefined}>
      <path d={path} className="wire-halo" />
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        className={`wire-edge ${live ? 'wire-conducting' : ''}`}
      />
    </g>
  )
}
