// Shared execution + output plumbing for every WebMCP tool.
//
// Chrome's secure-tools budget is law: a tool output must stay under 1.5K
// chars. Instead of letting a big bench produce an over-budget (or clipped
// mid-JSON) payload, tools serialize through boundedOutput, which compacts
// gracefully: try the clean full shape first, then trim secondary lists
// (summaries, faults), then primary lists (rows), always reporting what was
// left out so the agent knows it saw a slice, not the whole bench.

/** Chrome secure-tools doc: <=1.5K chars per tool output. */
export const MAX_OUTPUT_CHARS = 1500

export function fits(value: unknown): number {
  return JSON.stringify(value)?.length ?? 0
}

/**
 * Round to `dp` decimals for stable, compact JSON numbers; normalizes -0 to 0.
 */
export function round(v: number, dp: number): number {
  const r = Number(v.toFixed(dp))
  return r === 0 ? 0 : r
}

/**
 * Build a tool output that always fits the budget.
 *
 * `header` is object-shaped context (lesson title, flags...). `primary` is the
 * main list (measurements, components) and is trimmed first; `secondary` an
 * optional auxiliary list (faults, connections) of few high-value summaries
 * that survives as long as possible. When the clean full shape fits, it is
 * returned untouched with no bookkeeping fields.
 */
export function boundedOutput(
  header: Record<string, unknown>,
  primary: { key: string; items: unknown[] },
  secondary?: { key: string; items: unknown[] },
): unknown {
  const clean: Record<string, unknown> = {
    ...header,
    [primary.key]: primary.items,
    ...(secondary ? { [secondary.key]: secondary.items } : {}),
  }
  if (fits(clean) <= MAX_OUTPUT_CHARS) return clean

  let np = primary.items.length
  let ns = secondary?.items.length ?? 0
  const build = (np: number, ns: number): Record<string, unknown> => {
    const out: Record<string, unknown> = {
      ...header,
      [primary.key]: primary.items.slice(0, np),
      ...(np < primary.items.length ? { [`${primary.key}_total`]: primary.items.length } : {}),
      ...(secondary
        ? {
            [secondary.key]: secondary.items.slice(0, ns),
            ...(ns < secondary.items.length ? { [`${secondary.key}_total`]: secondary.items.length } : {}),
          }
        : {}),
      truncated: true,
    }
    return out
  }
  let out = build(np, ns)
  // Trim the primary (bulk row) list first; secondary lists carry the few
  // high-value summaries (faults), so they survive until primary is exhausted.
  while (fits(out) > MAX_OUTPUT_CHARS && (np > 0 || ns > 0)) {
    if (np > 0) np = Math.max(0, np - 2)
    else ns = Math.max(0, ns - 2)
    out = build(np, ns)
  }
  return out
}

/**
 * Every execute() honors the host's AbortSignal: a call that arrives already
 * aborted returns this instead of doing work (A16: abort handled everywhere).
 */
export function aborted(context: { signal?: AbortSignal } | undefined): boolean {
  return context?.signal?.aborted === true
}

export const ABORTED = { status: 'aborted' } as const
