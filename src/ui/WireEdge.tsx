// Wire edges: a thicker colored stroke over React Flow's base path so wires
// read as physical leads. Selection/delete still handled by the canvas.

import { BaseEdge, getSmoothStepPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export function WireEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } = props
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 6,
  })
  return <BaseEdge path={path} markerEnd={markerEnd} className="wire-edge" />
}
