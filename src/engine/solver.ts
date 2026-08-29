// Modified nodal analysis DC solver.
// Pure math, zero framework or DOM references (~150 lines per architecture.md).
//
// Method: every wire-connected group of terminals becomes one node (union-find).
// The first node is chosen as ground/reference and dropped from the linear
// system. Each battery is modeled as an ideal voltage source in series with its
// internal resistance via one synthetic internal node (so a shorted battery
// yields a huge-but-finite current instead of a singular matrix).
// Resistive branches stamp conductance 1/R. LEDs use a piecewise model
// (blocked below the forward drop; Norton equivalent of Vf + small dynamic
// resistance above it) converged by iterating conduction states.

import type { Component, Netlist } from './netlist'
import { componentDefaults } from './components'

export interface Reading {
  /** Terminal-pair voltage across the component, in volts. */
  voltage: number
  /** Conventional current through the component, positive a -> b, in amperes. */
  current: number
  /** Power dissipated by the component, in watts. */
  power: number
}

export interface SolutionNode {
  id: string
  /** Voltage relative to the reference (ground) node. */
  voltage: number
}

export interface SolveResult {
  ok: boolean
  nodes: SolutionNode[]
  readings: Record<string, Reading>
}

const EPS = 1e-9

/** Small dynamic resistance an LED presents once conducting, in ohms. */
const LED_DYNAMIC_R = 10

/** Effective ohms of a purely resistive component; null = open branch. */
function effectiveResistance(c: Component): number | null {
  if (c.type === 'switch') return c.closed ? EPS : null
  if (c.type === 'fuse') return c.blown ? null : Math.max(c.value * 0.1, 0.05)
  if (c.type === 'ammeter') return EPS
  if (c.type === 'voltmeter') return null
  if (c.burnedOut) return null // dead LED / bulb filament / cooked battery
  if (c.type === 'resistor') return c.value > 0 ? c.value : componentDefaults.resistor.resistance!
  if (c.type === 'bulb') return c.value > 0 ? c.value : componentDefaults.bulb.bulbResistance
  return null // batteries and plain LEDs handled separately
}

function find(parent: number[], start: number): number {
  let i = start
  while (parent[i] !== i) {
    const p = parent[i]!
    parent[i] = parent[p]!
    i = p
  }
  return i
}

/** Gaussian elimination with partial pivoting; null when singular. */
function gauss(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const m = A.map((row, i) => [...row, b[i]!] as number[])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r
    }
    if (Math.abs(m[piv]![col]!) < 1e-12) return null
    const tmp = m[col]!
    m[col] = m[piv]!
    m[piv] = tmp
    const p = m[col]![col]!
    for (let r = 0; r < n; r++) {
      if (r === col || m[r]![col] === 0) continue
      const f = m[r]![col]!
      const mr = m[r]!
      const mc = m[col]!
      for (let k = col; k <= n; k++) mr[k] = mr[k]! - (f * mc[k]!) / p
    }
  }
  // Gauss-Jordan leaves each pivot on the diagonal; after full elimination
  // every row's leading entry is its diagonal, so x[i] = rhs/diag per row.
  // (Rows were swapped only among themselves, so diagonal pivots persist.)
  const out = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) out[i] = m[i]![n]! / m[i]![i]!
  return out
}

interface LedBranch {
  id: string
  a: number
  b: number
  conducting: boolean
}

export function solve(netlist: Netlist): SolveResult {
  const comps = netlist.components
  if (comps.length === 0) return { ok: false, nodes: [], readings: {} }

  // --- union-find over terminal ids -> node index ---------------------------
  const termIndex = new Map<string, number>()
  for (const c of comps) {
    if (!termIndex.has(`${c.id}:a`)) termIndex.set(`${c.id}:a`, termIndex.size)
    if (!termIndex.has(`${c.id}:b`)) termIndex.set(`${c.id}:b`, termIndex.size)
  }
  const parent = Array.from(termIndex.keys(), (_, i) => i)
  const rootOf = (t: string) => find(parent, termIndex.get(t)!)
  for (const w of netlist.wires) {
    const rf = rootOf(w.from)
    const rt = rootOf(w.to)
    if (rf !== rt) parent[rf] = rt
  }
  const nodeId = new Map<number, number>()
  for (const t of termIndex.keys()) {
    const r = rootOf(t)
    if (!nodeId.has(r)) nodeId.set(r, nodeId.size)
  }

  // --- collect branches -------------------------------------------------------
  type ResStamp = { a: number; b: number; g: number }
  const resistive: ResStamp[] = []
  const vsrc: { value: number; nPlus: number; nMid: number }[] = []
  const leds: LedBranch[] = []

  let nextNode = nodeId.size
  for (const c of comps) {
    const na = nodeId.get(rootOf(`${c.id}:a`))!
    const nb = nodeId.get(rootOf(`${c.id}:b`))!
    if (c.type === 'battery' && !c.burnedOut) {
      const mid = nextNode++ // synthetic node between ideal source and Rint
      vsrc.push({ value: c.value > 0 ? c.value : componentDefaults.battery.voltage, nPlus: na, nMid: mid })
      resistive.push({ a: mid, b: nb, g: 1 / componentDefaults.battery.internalResistance })
    } else if (c.type === 'led' && !c.burnedOut) {
      leds.push({ id: c.id, a: na, b: nb, conducting: false })
    } else {
      const r = effectiveResistance(c)
      if (r !== null && Number.isFinite(r)) resistive.push({ a: na, b: nb, g: 1 / Math.max(r, EPS) })
    }
  }

  // One reference (ground) per ELECTRICAL island: nodes joined by ANY stamped
  // conductance (resistors, Rint, LEDs in either state) or source coupling.
  // Grounding each island keeps a partially-wired bench solvable (a floating
  // part grounds itself and reads its open-circuit physics) instead of
  // blanking every meter. The island containing node 0 keeps node 0 as its
  // reference, so fully-wired circuits produce the exact same system as before.
  const islandParent = new Map<number, number>()
  const islandFind = (r: number): number => {
    while (islandParent.get(r) !== r) {
      const p = islandParent.get(r)!
      islandParent.set(r, islandParent.get(p)!)
      r = islandParent.get(p)!
    }
    return r
  }
  for (let n = 0; n < nextNode; n++) islandParent.set(n, n)
  for (const s of resistive) {
    const ra = islandFind(s.a)
    const rb = islandFind(s.b)
    if (ra !== rb) islandParent.set(ra, rb)
  }
  for (const led of leds) {
    const ra = islandFind(led.a)
    const rb = islandFind(led.b)
    if (ra !== rb) islandParent.set(ra, rb)
  }
  for (const s of vsrc) {
    const ra = islandFind(s.nPlus)
    const rb = islandFind(s.nMid)
    if (ra !== rb) islandParent.set(ra, rb)
  }
  const islandGround = new Map<number, number>() // island root -> ground node idx
  for (let n = 0; n < nextNode; n++) {
    const island = islandFind(n)
    const current = islandGround.get(island)
    if (current === undefined || n < current) islandGround.set(island, n)
  }

  const extra = vsrc.length
  // Column per non-ground node (real + synthetic) + current unknown per source.
  const matrixIdx = new Map<number, number>()
  for (let idx = 0; idx < nextNode; idx++) {
    if (idx >= nodeId.size) {
      // Synthetic battery-internal nodes are never grounds.
      matrixIdx.set(idx, matrixIdx.size)
      continue
    }
    const island = islandFind(idx)
    if (islandGround.get(island) === idx) continue
    matrixIdx.set(idx, matrixIdx.size)
  }
  const numCols = matrixIdx.size
  const size = numCols + extra
  const v = (node: number): number => matrixIdx.get(node) ?? -1 // -1 = this island's ground

  function stampRes(A: number[][], a: number, b: number, g: number): void {
    const va = v(a)
    const vb = v(b)
    if (va >= 0) A[va]![va] = A[va]![va]! + g
    if (vb >= 0) A[vb]![vb] = A[vb]![vb]! + g
    if (va >= 0 && vb >= 0) {
      A[va]![vb] = A[va]![vb]! - g
      A[vb]![va] = A[vb]![va]! - g
    }
  }

  const baseRhs = new Array<number>(size).fill(0)

  const buildMatrix = (): { A: number[][]; rhs: number[] } => {
    const A: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0))
    const rhs = [...baseRhs]
    for (const s of resistive) stampRes(A, s.a, s.b, s.g)
    for (const led of leds) {
      if (led.conducting) {
        const g = 1 / LED_DYNAMIC_R
        stampRes(A, led.a, led.b, g)
        // Norton injection modeling the fixed forward drop (current a -> b).
        const vaL = v(led.a)
        const vbL = v(led.b)
        if (vaL >= 0) rhs[vaL] = rhs[vaL]! + componentDefaults.led.forwardDrop * g
        if (vbL >= 0) rhs[vbL] = rhs[vbL]! - componentDefaults.led.forwardDrop * g
      } else {
        stampRes(A, led.a, led.b, 1e-9) // blocked below Vf: essentially open
      }
    }
    vsrc.forEach((s, k) => {
      const row = numCols + k
      const vp = v(s.nPlus)
      const vm = v(s.nMid)
      if (vp >= 0) {
        A[vp]![row] = A[vp]![row]! + 1
        A[row]![vp] = A[row]![vp]! + 1
      }
      if (vm >= 0) {
        A[vm]![row] = A[vm]![row]! - 1
        A[row]![vm] = A[row]![vm]! - 1
      }
      rhs[row] = s.value
    })
    return { A, rhs }
  }

  // --- solve, iterating LED conduction states ---------------------------------
  let x: number[] | null = null
  for (let pass = 0; pass <= leds.length + 2; pass++) {
    const { A, rhs } = buildMatrix()
    x = gauss(A, rhs)
    if (!x) return { ok: false, nodes: [], readings: {} }
    let changed = false
    for (const led of leds) {
      const vd = val(x!, led.a) - val(x!, led.b)
      const vf = componentDefaults.led.forwardDrop
      if (!led.conducting && vd >= vf - 1e-9) {
        led.conducting = true
        changed = true
      } else if (led.conducting && (vd - vf) / LED_DYNAMIC_R < 0) {
        led.conducting = false
        changed = true
      }
    }
    if (!changed) break
  }

  function val(vec: number[], node: number): number {
    const vi = v(node)
    return vi >= 0 ? vec[vi]! : 0
  }

  // --- read out ------------------------------------------------------------------
  const readings: Record<string, Reading> = {}
  for (const c of comps) {
    const na = nodeId.get(rootOf(`${c.id}:a`))!
    const nb = nodeId.get(rootOf(`${c.id}:b`))!
    const volt = val(x!, na) - val(x!, nb)
    let cur = 0
    if (c.type === 'battery' && !c.burnedOut) {
      // MNA's unknown is current into the + terminal; flip for discharge convention.
      const k = vsrc.findIndex((s) => s.nPlus === na)
      cur = -x![numCols + k]!
    } else if (c.type === 'led' && !c.burnedOut) {
      const led = leds.find((l) => l.id === c.id)!
      cur = led.conducting ? Math.max((volt - componentDefaults.led.forwardDrop) / LED_DYNAMIC_R, 0) : 0
    } else {
      const r = effectiveResistance(c)
      if (r !== null && Number.isFinite(r)) cur = volt / Math.max(r, EPS)
    }
    readings[c.id] = { voltage: volt, current: cur, power: Math.abs(volt * cur) }
  }

  const nodes: SolutionNode[] = Array.from(nodeId.entries(), ([root, idx]) => ({
    id: `n${root}`,
    // Relative to the node's own island ground (node 0 for the powered island).
    voltage: val(x!, idx),
  }))
  return { ok: true, nodes, readings }
}
