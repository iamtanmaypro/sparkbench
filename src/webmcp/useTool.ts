import { useEffect, useRef, useState } from 'react'
import { useBenchStore } from '../store/useBenchStore'
import { benchTools } from './register'
import { toolsetForLesson } from './toolsets'
import { withAgentPresence } from './presence'
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
    // Register wrapped so the identity chip activates for this tool's calls.
    mc.registerTool(withAgentPresence(tool))
    return () => {
      // removeTool is optional in the draft spec; absence is harmless here:
      // re-registering the same name overwrites the previous definition.
      mc.removeTool?.(tool.name)
    }
  }, [tool])

  return available
}

/**
 * Dynamic per-lesson registration — the provideContext/toolchange feature
 * (A13). The toolset follows the lesson stage (matrix in toolsets.ts): lesson
 * 1 exposes only the minimal battery/resistor writes, remove_component and
 * add_note join in lessons 2-3, run_diagnosis appears from lesson 4 on, and
 * free build exposes everything.
 *
 * On every lesson change the diff is applied to the live model context —
 * tools that left the stage are unregistered, new ones registered — and the
 * browser then fires `toolchange`, so the agent sees the new toolset without
 * any page reload. Reads and navigation stay registered throughout; only the
 * write surface moves.
 *
 * The effect keys on lessonId alone; the benchTools pool and the toolset
 * matrix are module-level, so the only trigger is a lesson change.
 * StrictMode's mount-unmount-mount still ends with the current lesson's set
 * registered.
 */
export function useLessonTools(): boolean {
  const lessonId = useBenchStore((s) => s.currentLessonId)
  // Feature detection cannot change mid-session (document.modelContext is
  // SameObject per spec), so read it once at mount instead of in the effect.
  const [available] = useState(() => getModelContext() !== null)
  const registeredRef = useRef<Map<string, ToolDefinition>>(new Map())

  useEffect(() => {
    const mc = getModelContext()
    if (!mc) return
    const registered = registeredRef.current
    const wanted = toolsetForLesson(lessonId, benchTools)
    const wantedNames = new Set(wanted.map((t) => t.name))
    for (const name of [...registered.keys()]) {
      if (!wantedNames.has(name)) {
        // removeTool is optional in the draft spec; when it is missing the
        // next registerTool of the same name overwrites the old definition.
        mc.removeTool?.(name)
        registered.delete(name)
      }
    }
    for (const tool of wanted) {
      if (!registered.has(tool.name)) {
        // Wrapped: the chip activates during any per-lesson tool's execute.
        mc.registerTool(withAgentPresence(tool))
        registered.set(tool.name, tool)
      }
    }
  }, [lessonId])

  // Unmount (or StrictMode's double mount) must not leave the whole toolset
  // behind on a model context the app no longer owns.
  useEffect(
    () => () => {
      const mc = getModelContext()
      if (!mc) return
      for (const name of registeredRef.current.keys()) mc.removeTool?.(name)
      registeredRef.current.clear()
    },
    [],
  )

  return available
}
