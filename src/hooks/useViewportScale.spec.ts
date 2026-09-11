import { describe, expect, it } from 'vitest'

import { computeViewport, computeViewportScale } from '@/hooks/useViewportScale'

describe('computeViewportScale', () => {
  it('is 1 at the native 1920x1080 and doubles at 4K', () => {
    expect(computeViewportScale(1920, 1080)).toBe(1)
    expect(computeViewportScale(3840, 2160)).toBe(2)
  })

  it('fits 1366x768 (common older hardware) — the non-1080p check', () => {
    expect(computeViewportScale(1366, 768)).toBeCloseTo(0.7111, 4)
  })
})

describe('computeViewport', () => {
  it('keeps the exact design canvas on a 16:9 display', () => {
    expect(computeViewport(1920, 1080)).toEqual({ scale: 1, width: 1920, height: 1080 })
    expect(computeViewport(1366, 768)).toMatchObject({ width: 1921, height: 1080 })
  })

  it('grows the canvas vertically on a 16:10 or square display instead of letterboxing', () => {
    expect(computeViewport(1920, 1200)).toEqual({ scale: 1, width: 1920, height: 1200 })
    // Square window (a resized VM): width-bound, so the canvas becomes 1920x1920.
    expect(computeViewport(1000, 1000)).toMatchObject({ width: 1920, height: 1920 })
  })

  it('grows the canvas horizontally on an ultra-wide display', () => {
    const viewport = computeViewport(3440, 1440)
    expect(viewport.scale).toBeCloseTo(1.3333, 4)
    expect(viewport.height).toBe(1080)
    expect(viewport.width).toBe(2580)
  })

  it('never shrinks below the design canvas', () => {
    expect(computeViewport(800, 600).width).toBeGreaterThanOrEqual(1920)
    expect(computeViewport(800, 600).height).toBeGreaterThanOrEqual(1080)
  })
})
