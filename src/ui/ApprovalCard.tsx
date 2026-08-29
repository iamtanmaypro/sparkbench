// On-canvas approval cards: the human gate for every agent write. Write tools
// only queue proposals in the store; nothing changes on the bench until the
// student taps Approve here, or batch-approves the next N for fluid demos
// after the first explicit card decision.

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useBenchStore } from '../store/useBenchStore'

const BATCH_INPUT_MIN = 1
const BATCH_INPUT_MAX = 99

function clampBatch(raw: string): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return BATCH_INPUT_MIN
  return Math.min(BATCH_INPUT_MAX, Math.max(BATCH_INPUT_MIN, n))
}

export function ApprovalCard() {
  const pending = useBenchStore(
    useShallow((s) => s.proposals.filter((p) => p.status === 'pending_approval')),
  )
  const approveProposal = useBenchStore((s) => s.approveProposal)
  const rejectProposal = useBenchStore((s) => s.rejectProposal)
  const approveNextN = useBenchStore((s) => s.approveNextN)
  const [batchN, setBatchN] = useState(10)

  if (pending.length === 0) return null

  return (
    <div className="approval-layer" aria-label="Agent proposals awaiting your approval">
      {pending.map((p) => (
        <div key={p.id} className="approval-card" role="group" aria-label={`Proposal ${p.id}`}>
          <div className="approval-head">
            <span className="approval-title">Agent proposal</span>
            <span className="approval-count">
              {pending.length} pending
            </span>
          </div>
          <p className="approval-summary">
            <span className="approval-wants">wants to:</span> {p.summary}
          </p>
          <div className="approval-actions">
            <button
              type="button"
              className="approval-approve"
              onClick={() => approveProposal(p.id)}
              aria-label={`Approve: ${p.summary}`}
            >
              Approve
            </button>
            <button
              type="button"
              className="approval-reject"
              onClick={() => rejectProposal(p.id)}
              aria-label={`Reject: ${p.summary}`}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
      <div className="approval-batch">
        <input
          id="approval-batch-n"
          type="number"
          min={BATCH_INPUT_MIN}
          max={BATCH_INPUT_MAX}
          value={batchN}
          onChange={(e) => setBatchN(clampBatch(e.target.value))}
          aria-label="How many pending proposals to approve"
        />
        <button
          type="button"
          className="approval-batch-btn"
          onClick={() => approveNextN(batchN)}
          aria-label={`Approve next ${batchN} pending proposals`}
        >
          Approve next {batchN}
        </button>
      </div>
    </div>
  )
}
