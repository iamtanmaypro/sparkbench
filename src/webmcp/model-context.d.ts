/**
 * Minimal ambient types for the WebMCP API surface (Aug 2026).
 *
 * WHY hand-rolled: the spec is still moving fast enough that pulling in a
 * community .d.ts risks drift with what actually ships in Chrome 153+ and
 * ChatGPT's browser. We only type the slice Sparkbench uses.
 */

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
 */
export interface ModelContextRegistry {
  registerTool(tool: ToolDefinition): void
  removeTool?(name: string): void
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
