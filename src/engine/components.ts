// Component models: default electrical parameters plus the per-type behaviors
// the solver needs. Values follow hobby-lab conventions (AA pack ~3V, 5mm LED
// with a 20mA max, small incandescent bulb, 500mA fuse).

import type { ComponentType } from './netlist'

export interface ModelParams {
  /** Nominal display value used when a component's own value is 0. */
  nominal: number
  resistance?: number
}

// Type-specific physics constants (kept out of the generic table so the
// solver can read them without narrowing).
export const componentDefaults: Record<ComponentType, ModelParams> & {
  battery: { voltage: number; internalResistance: number }
  led: { forwardDrop: number; maxCurrent: number }
  bulb: { bulbResistance: number; burnoutPower: number }
  fuse: { fuseResistance: number; blowMultiplier: number }
} = {
  // AA pack ~3V with realistic internal resistance.
  battery: { nominal: 3, voltage: 3, internalResistance: 0.5 },
  resistor: { nominal: 100, resistance: 100 },
  // 5mm indicator LED: 2V forward drop, burns out past 20mA sustained.
  led: { nominal: 2, forwardDrop: 2, maxCurrent: 0.02 },
  // Small incandescent bulb: hot filament resistance, burnout power threshold.
  bulb: { nominal: 30, bulbResistance: 30, burnoutPower: 1 },
  switch: { nominal: 0 },
  // Fuse rated in amps (default 500mA); blows at rated x blowMultiplier.
  fuse: { nominal: 0.5, fuseResistance: 0.05, blowMultiplier: 2 },
  ammeter: { nominal: 0 },
  voltmeter: { nominal: 0 },
}

/** Human label for UI + fault strings ("R1 (resistor)"). */
export function describeComponent(type: ComponentType): string {
  return type
}
