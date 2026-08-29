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

export const placeComponentParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      description:
        'Component to place: battery, resistor, led, bulb, switch, fuse, ammeter, or voltmeter (the lesson may restrict this).',
    },
    x: {
      type: 'number',
      description: 'Horizontal position on the bench; omit to let the bench pick a free spot.',
    },
    y: {
      type: 'number',
      description: 'Vertical position on the bench; omit to let the bench pick a free spot.',
    },
    properties: {
      type: 'object',
      properties: {
        value: {
          type: 'number',
          description: 'Starting value: ohms for resistors, volts for batteries, amps for fuses.',
        },
      },
      additionalProperties: false,
    },
  },
  required: ['type'],
  additionalProperties: false,
}

export const connectParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    from_terminal: {
      type: 'string',
      description: 'Terminal to start the wire from, format <component>:a or :b, e.g. bat1:a.',
    },
    to_terminal: {
      type: 'string',
      description: 'Terminal to end the wire at, format <component>:a or :b, e.g. r1:b.',
    },
  },
  required: ['from_terminal', 'to_terminal'],
  additionalProperties: false,
}

export const setPropertyParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Component id from describe_workbench, e.g. r2.',
    },
    property: {
      type: 'string',
      enum: ['value', 'closed'],
      description:
        'Which property to change: value (number) or closed (boolean, switches only). Defaults to value.',
    },
    value: {
      type: ['number', 'boolean'],
      description: 'New setting: a number for value (ohms, volts, amps), or true/false for closed.',
    },
  },
  required: ['id', 'value'],
  additionalProperties: false,
}

export const removeComponentParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Component id from describe_workbench, e.g. r1.',
    },
  },
  required: ['id'],
  additionalProperties: false,
}

export const addNoteParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: 'The note text: a short, useful explanation or observation for the student.',
    },
    x: {
      type: 'number',
      description: 'Horizontal position on the bench; omit for a default spot.',
    },
    y: {
      type: 'number',
      description: 'Vertical position on the bench; omit for a default spot.',
    },
  },
  required: ['text'],
  additionalProperties: false,
}

export const getProposalStatusParams: JsonSchemaObject = {
  type: 'object',
  properties: {
    proposal_id: {
      type: 'string',
      description: 'The proposal_id a write tool returned, e.g. prop12.',
    },
  },
  required: ['proposal_id'],
  additionalProperties: false,
}
