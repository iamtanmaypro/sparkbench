// Vitest setup: mark the happy-dom environment as a React act() environment
// so react-dom's act warnings stay quiet in component tests.
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// happy-dom has no layout engine, so ResizeObserver reports a 0x0 container
// and React Flow refuses to render nodes. Report a fixed bench size instead,
// matching the standard React Flow component-testing recipe.
class FixedResizeObserver {
  private cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
  }
  observe(target: Element): void {
    const entry = {
      target,
      contentRect: {
        width: 1000,
        height: 700,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 700,
        toJSON: () => ({}),
      },
    } as unknown as ResizeObserverEntry
    this.cb([entry], this as unknown as ResizeObserver)
  }
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = FixedResizeObserver

// React Flow measures nodes via offsetWidth/offsetHeight (getDimensions) and
// keeps them visibility:hidden until measured; happy-dom reports 0 for both,
// so nodes never become visible or name-accessible. Report a bench-sized node.
if (typeof HTMLElement !== 'undefined') {
  for (const prop of ['offsetWidth', 'offsetHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get() {
        return prop === 'offsetWidth' ? 100 : 44
      },
    })
  }
}
