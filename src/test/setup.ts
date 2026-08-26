// Vitest setup: mark the happy-dom environment as a React act() environment
// so react-dom's act warnings stay quiet in component tests.
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
