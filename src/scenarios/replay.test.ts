import { beforeEach, describe, expect, it } from 'vitest'
import { solve, detectFaults } from '../engine'
import type { Netlist } from '../engine'
import { useBenchStore } from '../store/useBenchStore'
import { setPropertyTool, removeComponentTool, getProposalStatusTool } from '../webmcp/approvals'
import { runDiagnosisTool } from '../webmcp/diagnosis'

const tools = {
  set_property: setPropertyTool,
  remove_component: removeComponentTool,
  run_diagnosis: runDiagnosisTool,
}

interface Reading {
  component: string
  quantity: 'voltage' | 'current' | 'power'
  value: number
  tolerance: number
}

interface Scenario {
  id: string
  title: string
  netlist: Netlist
  readings: Reading[]
  steps: {
    tool: keyof typeof tools
    args: Record<string, unknown>
    expect: Record<string, unknown>
    decision?: 'approve' | 'reject'
    readings?: Reading[]
  }[]
}

const scenarios = Object.values(import.meta.glob<Scenario>(
  '../../fixtures/scenarios/*.json', { eager: true, import: 'default' },
))

function circuit() {
  const { components, wires } = useBenchStore.getState()
  return structuredClone({ components, wires })
}

function checkReadings(readings: Reading[]) {
  const solution = useBenchStore.getState().solution
  expect(solution.ok).toBe(true)
  for (const reading of readings) {
    const actual = solution.readings[reading.component]?.[reading.quantity]
    expect(Number.isFinite(actual), `${reading.component}.${reading.quantity} must be finite`).toBe(true)
    expect(Number.isFinite(reading.tolerance) && reading.tolerance > 0).toBe(true)
    expect(Math.abs(actual! - reading.value), `${reading.component}.${reading.quantity}`)
      .toBeLessThanOrEqual(reading.tolerance)
  }
}

beforeEach(() => {
  localStorage.clear()
  useBenchStore.getState().openLesson('free-build')
})

describe('public circuit scenarios (deterministic tool replay, no model or browser host)', () => {
  it('discovers the published fixture set', () => {
    expect(scenarios.map((scenario) => scenario.id).sort()).toEqual([
      'burned-led', 'divider-correction', 'parallel-veto', 'series-switch',
    ])
  })

  for (const scenario of scenarios) {
    it(`${scenario.id}: ${scenario.title}`, async () => {
      const netlist = structuredClone(scenario.netlist)
      const solution = solve(netlist)
      useBenchStore.setState({
        ...netlist,
        nodes: netlist.components.map((c, i) => ({ id: c.id, type: c.type, x: i * 150, y: 100 })),
        solution,
        faults: detectFaults(netlist, solution),
        proposals: [], notes: [], log: [], origins: {},
      })
      checkReadings(scenario.readings)

      for (const step of scenario.steps) {
        const before = circuit()
        const result = await tools[step.tool].execute(step.args, {}) as Record<string, unknown>
        expect(result).toMatchObject(step.expect)
        // Every tool in these fixtures must preserve circuit data until a decision.
        expect(circuit()).toEqual(before)

        if (step.decision) {
          expect(result.status).toBe('pending_approval')
          expect(typeof result.proposal_id).toBe('string')
          const id = result.proposal_id as string
          const store = useBenchStore.getState()
          if (step.decision === 'approve') expect(store.approveProposal(id)).toBe(true)
          else store.rejectProposal(id)
          expect(await getProposalStatusTool.execute({ proposal_id: id }, {}))
            .toMatchObject({ status: step.decision === 'approve' ? 'approved' : 'rejected' })
          if (step.decision === 'reject') expect(circuit()).toEqual(before)
        } else {
          expect(useBenchStore.getState().proposals).toHaveLength(0)
        }
        checkReadings(step.readings ?? [])
      }
    })
  }
})
