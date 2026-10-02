import { describe, expect, it } from 'vitest'
import { VIZ_AWAY, VIZ_DRAW, VIZ_HOME, vizRgba } from '../utils/viz'

describe('vizRgba', () => {
  it('derives a tint from its token instead of re-typing the channels', () => {
    expect(vizRgba(VIZ_HOME, 0.5)).toBe('rgba(77, 143, 255, 0.500)')
    expect(vizRgba(VIZ_AWAY, 0.1)).toBe('rgba(248, 81, 79, 0.100)')
    expect(vizRgba(VIZ_DRAW, 1)).toBe('rgba(107, 114, 128, 1.000)')
  })
})
