// Netlist types: the pure data description of a circuit.
// Everything in src/engine is framework-free and side-effect-free so the
// solver can run identically from Zustand selectors or WebMCP tools.

export type ComponentType =
  | 'battery'
  | 'resistor'
  | 'led'
  | 'bulb'
  | 'switch'
  | 'fuse'
  | 'ammeter'
  | 'voltmeter'

/** Every component exposes exactly two terminals named "a" and "b". */
export type Terminal = `${string}:a` | `${string}:b`

export interface Component {
  id: string
  type: ComponentType
  /** Nominal value; unit depends on type (V, ohm, A...). 0 means "use type default". */
  value: number
  /**
   * Behavioral state that survives solves:
   * - switch: closed = true/false
   * - led/fuse/bulb: burnedOut / blown latches after a fault trip
   */
  closed?: boolean
  burnedOut?: boolean
  blown?: boolean
}

/**
 * A wire joins two component terminals. Terminal ids are "<componentId>:a|b",
 * e.g. "r1:a" -> "bat1:b".
 */
export interface Wire {
  id: string
  from: Terminal
  to: Terminal
}

export interface Netlist {
  components: Component[]
  wires: Wire[]
}

let nextId = 0

/** Short unique id for placed components, e.g. "r3", "led2". */
export function makeId(type: ComponentType): string {
  const prefix =
    type === 'battery'
      ? 'bat'
      : type === 'resistor'
        ? 'r'
        : type === 'led'
          ? 'led'
          : type === 'bulb'
            ? 'bulb'
            : type.slice(0, 2)
  nextId += 1
  return `${prefix}${nextId}`
}

/** Test/reset hook so tests can get deterministic ids. */
export function resetIds(): void {
  nextId = 0
}
