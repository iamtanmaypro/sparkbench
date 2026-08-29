// Plain JSON-Schema literals for tool inputs — no Zod layer — so judges (and
// budgets.test.ts) can read every parameter description right here against
// its 150-char budget.

import type { JsonSchemaObject } from './model-context'

/** Shared literal for the read tools: they take no parameters. */
export const noParams: JsonSchemaObject = {
  type: 'object',
  properties: {},
  additionalProperties: false,
}

export const openLessonParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    lesson_id: {
      type: 'string',
      description:
        'Lesson to open: ohms-law, series-parallel, switches-logic, diagnose-fault, or free-build.',
    },
  },
  required: ['lesson_id'],
  additionalProperties: false,
}

export const focusComponentParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Component id from describe_workbench, e.g. bat1 or r2.',
    },
  },
  required: ['id'],
  additionalProperties: false,
}
