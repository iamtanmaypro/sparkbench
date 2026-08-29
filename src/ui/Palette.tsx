// Component palette: the parts bin. Click to place on the bench. Only lesson
// allowedComponents are enabled, so lessons gate themselves naturally.

import type { ComponentType } from '../engine/netlist'
import { useBenchStore } from '../store/useBenchStore'

const LABELS: Record<ComponentType, string> = {
  battery: 'Battery',
  resistor: 'Resistor',
  led: 'LED',
  bulb: 'Bulb',
  switch: 'Switch',
  fuse: 'Fuse',
  ammeter: 'Ammeter',
  voltmeter: 'Voltmeter',
}

export function Palette({ allowed }: { allowed: readonly ComponentType[] }) {
  const addComponent = useBenchStore((s) => s.addComponent)

  const types = Object.keys(LABELS) as ComponentType[]

  return (
    <div className="palette" role="toolbar" aria-label="Component palette">
      <div className="panel-title">Parts</div>
      {types.map((t) => {
        const enabled = allowed.includes(t)
        return (
          <button
            key={t}
            type="button"
            className={`palette-btn type-${t}`}
            disabled={!enabled}
            aria-label={`Place ${LABELS[t]}${enabled ? '' : ' (locked in this lesson)'}`}
            onClick={(e) => {
              // Place at a spot derived from the click for keyboard parity.
              const rect = (e.currentTarget.closest('.workbench') as HTMLElement | null)?.getBoundingClientRect()
              addComponent(t, rect ? { x: 160 + Math.random() * 240, y: 120 + Math.random() * 180 } : undefined)
            }}
          >
            <PaletteGlyph t={t} />
            <span>{LABELS[t]}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Tiny schematic preview inside each palette button. */
function PaletteGlyph({ t }: { t: ComponentType }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }
  switch (t) {
    case 'battery':
      return (
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <line x1={9} y1={2} x2={9} y2={14} {...common} />
          <line x1={13} y1={5} x2={13} y2={11} {...common} />
          <line x1={17} y1={2} x2={17} y2={14} {...common} />
        </svg>
      )
    case 'resistor':
      return (
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <polyline points="2,8 6,3 10,13 14,3 18,13 22,8" {...common} />
        </svg>
      )
    case 'led':
      return (
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <polygon points="7,2 7,14 19,8" {...common} />
          <line x1={19} y1={2} x2={19} y2={14} {...common} />
        </svg>
      )
    case 'bulb':
      return (
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <circle cx={13} cy={8} r={6} {...common} />
        </svg>
      )
    case 'switch':
      return (
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <circle cx={4} cy={12} r={2} {...common} />
          <circle cx={22} cy={12} r={2} {...common} />
          <line x1={5} y1={11} x2={20} y2={4} {...common} />
        </svg>
      )
    case 'fuse':
      return (
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <rect x={4} y={4} width={18} height={8} rx={3} {...common} />
        </svg>
      )
    default:
      return (
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <circle cx={13} cy={8} r={6} {...common} />
          <text x={13} y={11.5} textAnchor="middle" fontSize="8" fill="currentColor" stroke="none">
            {t === 'ammeter' ? 'A' : 'V'}
          </text>
        </svg>
      )
  }
}
