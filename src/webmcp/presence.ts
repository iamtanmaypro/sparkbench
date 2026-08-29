// Agent presence plumbing: every registered tool's execute() is wrapped so
// the identity chip (AgentChip) goes "active" for the duration of any tool
// call, imperative or per-lesson dynamic. Tools themselves never touch
// agentActive; the registration layer owns it, so the wrapper cannot drift
// from the inventory as tools are added.
//
// Why here and not in each execute: budgets.test.ts lints the tool pool
// (descriptions, schemas), which stays untouched; the wrap happens at
// registration time in useTool/useLessonTools, so both the static ping tool
// and the dynamic per-lesson toolset get the same treatment.

import type { ToolDefinition, ModelContextToolCallOptions } from './model-context'
import { useBenchStore } from '../store/useBenchStore'

/**
 * Wrap a tool so its execute flips the agent-presence flag around the call.
 * Handles the three shapes execute can take: synchronous return, thrown
 * error, and returned promise (active stays on until the promise settles).
 */
export function withAgentPresence(tool: ToolDefinition): ToolDefinition {
  return {
    ...tool,
    execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
      useBenchStore.getState().setAgentActive(true)
      let result: unknown
      try {
        result = tool.execute(args, context)
      } catch (err) {
        useBenchStore.getState().setAgentActive(false)
        throw err
      }
      if (result instanceof Promise) {
        return result.finally(() => useBenchStore.getState().setAgentActive(false))
      }
      useBenchStore.getState().setAgentActive(false)
      return result
    },
  }
}
