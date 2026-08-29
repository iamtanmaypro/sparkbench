// Inspector: the selected component's live readout and editable value, plus
// delete. This is the mouse-only user's control surface for properties.

import { useEffect, useState } from 'react'
import { useBenchStore } from '../store/useBenchStore'

const VALUE_UNITS: Record<string, string> = {
  battery: 'V',
  resistor: 'Ω',
  bulb: 'Ω',
  fuse: 'A',
}

export function Inspector() {
  const selectedId = useBenchStore((s) => s.selectedId)
  const comp = useBenchStore((s) => s.components.find((c) => c.id === s.selectedId))
  const node = useBenchStore((s) => s.nodes.find((n) => n.id === s.selectedId))
  const reading = useBenchStore((s) => (s.selectedId ? s.solution.readings[s.selectedId] : undefined))
  const setProperty = useBenchStore((s) => s.setProperty)
  const removeComponent = useBenchStore((s) => s.removeComponent)
  const toggleSwitch = useBenchStore((s) => s.toggleSwitch)
  const origin = useBenchStore((s) => (s.selectedId ? s.origins[s.selectedId] : undefined))

  // Local text state so typing feels normal; commits on blur or Enter.
  const [valueText, setValueText] = useState('')
  useEffect(() => {
    setValueText(comp && comp.value > 0 ? String(comp.value) : '')
  }, [comp?.id, comp?.value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedId || !comp) {
    return (
      <div className="inspector">
        <div className="panel-title">Inspector</div>
        <p className="muted">Select a part on the bench to inspect it.</p>
      </div>
    )
  }

  const unit = VALUE_UNITS[comp.type]
  const commitValue = () => {
    const n = Number(valueText)
    if (!Number.isNaN(n) && n >= 0) setProperty(comp.id, n)
    else setValueText(comp.value > 0 ? String(comp.value) : '')
  }

  return (
    <div className="inspector">
      <div className="panel-title">Inspector</div>
      <div className="inspector-head">
        <strong>{comp.id}</strong>
        <span className="muted">{comp.type}</span>
        {origin === 'agent' && <span className="agent-badge">placed by Agent</span>}
      </div>

      <dl className="readings">
        <dt>Voltage</dt>
        <dd>{(reading?.voltage ?? 0).toFixed(3)} V</dd>
        <dt>Current</dt>
        <dd>{Math.abs(reading?.current ?? 0).toFixed(4)} A</dd>
        <dt>Power</dt>
        <dd>{(reading?.power ?? 0).toPrecision(3)} W</dd>
      </dl>

      {unit && (
        <label className="prop-row">
          Value ({unit})
          <input
            type="text"
            inputMode="decimal"
            value={valueText}
            onChange={(e) => setValueText(e.target.value)}
            onBlur={commitValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            aria-label={`${comp.id} value in ${unit === 'Ω' ? 'ohms' : unit.toLowerCase()}`}
          />
        </label>
      )}

      {comp.type === 'switch' && (
        <button type="button" className="ghost-btn" onClick={() => toggleSwitch(comp.id)}>
          {comp.closed ? 'Open switch' : 'Close switch'}
        </button>
      )}

      {(comp.burnedOut || comp.blown) && (
        <p className="fault-note">{comp.blown ? 'This fuse is blown.' : 'This part burned out. Replace it.'}</p>
      )}

      <button
        type="button"
        className="danger-btn"
        onClick={() => removeComponent(comp.id)}
        aria-label={`Delete ${comp.id}`}
      >
        Delete {comp.id}
      </button>

      <p className="muted small">
        Position: {Math.round(node?.x ?? 0)}, {Math.round(node?.y ?? 0)}. Drag the part to move; drag from a
        terminal post to wire. Select a wire and press Backspace to cut it.
      </p>
    </div>
  )
}
