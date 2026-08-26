import { useEffect, useState } from 'react'
import type { ModelContextRegistry, ToolDefinition } from './model-context'

/**
 * Feature-detect the WebMCP registration surface.
 *
 * WHY document first: `document.modelContext` is the current API (Chrome 150+);
 * `navigator.modelContext` is deprecated since Chrome 150 and exists only as a
 * fallback for older runtimes (e.g. early ChatGPT in-app browser builds). We
 * register against whichever is present, never the deprecated path alone.
 */
export function getModelContext(): ModelContextRegistry | null {
  if (typeof document === 'undefined') return null
  return document.modelContext ?? navigator.modelContext ?? null
}

/**
 * ~40-line hook: registers one tool while the WebMCP model context exists,
 * and reports availability so the UI can show a dismissible banner when the
 * app is opened outside an agent-capable runtime.
 *
 * Re-registers if the tool object changes; cleans up on unmount so React
 * StrictMode double-invocation never leaves stale registrations behind.
 */
export function useTool(tool: ToolDefinition): boolean {
  const [available, setAvailable] = useState(() => getModelContext() !== null)

  useEffect(() => {
    const mc = getModelContext()
    if (!mc) {
      setAvailable(false)
      return
    }
    mc.registerTool(tool)
    return () => {
      // removeTool is optional in the draft spec; absence is harmless here:
      // re-registering the same name overwrites the previous definition.
      mc.removeTool?.(tool.name)
    }
  }, [tool])

  return available
}
