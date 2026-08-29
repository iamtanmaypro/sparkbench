/**
 * Minimal ambient types for the WebMCP API surface (Aug 2026).
 *
 * WHY hand-rolled: the spec is still moving fast enough that pulling in a
 * community .d.ts risks drift with what actually ships in Chrome 153+ and
 * ChatGPT's browser. We only type the slice Sparkbench uses.
 */

/**
 * Declarative WebMCP form attributes (declarative-api-explainer.md): a plain
 * <form toolname=... tooldescription=...> is exposed to agents as a tool, and
 * each form control's `toolparamdescription` becomes that parameter's schema
 * description. `toolautosubmit` is deliberately never set by us (state-changing
 * form => the human submits); it is typed here only so its absence stays a
 * choice, not a type error waiting to happen.
 *
 * These augment React's module-scope attribute interfaces (which is what
 * JSX.IntrinsicElements references in React 19), so no extends clauses here:
 * augmentation merging requires them to match the original declarations.
 */
declare module 'react' {
  interface FormHTMLAttributes<T> {
    toolname?: string
    tooldescription?: string
    toolautosubmit?: boolean | 'true' | 'false'
  }
  interface InputHTMLAttributes<T> {
    toolparamdescription?: string
  }
  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string
  }
}

interface ModelContextToolResultContent {
  type: string
  text?: string
}

export interface ModelContextToolCallOptions {
  /** AbortSignal from the host; every execute() must respect it. */
  signal?: AbortSignal
}

/** Plain JSON-Schema literal, not Zod: keeps char budgets visible in code. */
export interface JsonSchemaObject {
  type: 'object'
  properties?: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema?: JsonSchemaObject
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
    untrustedContentHint?: boolean
    [key: string]: unknown
  }
  execute: (
    args: Record<string, unknown>,
    context: ModelContextToolCallOptions,
  ) => unknown | Promise<unknown>
}

/**
 * Registration surface. Chrome 150+ exposes this on `document.modelContext`;
 * `navigator.modelContext` is the deprecated fallback we only feature-detect,
 * never rely on alone.
 *
 * The real ModelContext is an EventTarget (the spec fires `toolchange` after
 * registration changes and `toolactivated`/`toolcanceled` around declarative
 * form use), but the listeners are typed optional so partial test fakes stay
 * valid; call sites must feature-detect before subscribing.
 */
export interface ModelContextRegistry {
  registerTool(tool: ToolDefinition): void
  removeTool?(name: string): void
  addEventListener?(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener?(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void
}

interface DocumentWithModelContext extends Document {
  modelContext?: ModelContextRegistry
}
interface NavigatorWithModelContext extends Navigator {
  modelContext?: ModelContextRegistry
}

declare global {
  // Interface merging with lib.dom adds the optional WebMCP surfaces without
  // replacing anything; both stay optional because most browsers lack them.
  interface Document {
    modelContext?: ModelContextRegistry
  }
  interface Navigator {
    modelContext?: ModelContextRegistry
  }
}

export {}
