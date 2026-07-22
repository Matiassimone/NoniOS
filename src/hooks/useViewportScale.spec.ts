import { describe, expect, it } from 'vitest'

import { computeViewportScale } from '@/hooks/useViewportScale'

describe('computeViewportScale', () => {
  it('is 1 at the native 1920x1080', () => {
    expect(computeViewportScale(1920, 1080)).toBe(1)
  })

  it('doubles at 4K (3840x2160)', () => {
    expect(computeViewportScale(3840, 2160)).toBe(2)
  })

  it('fits 1366x768 (common older hardware) — the non-1080p check', () => {
    // min(1366/1920, 768/1080) ≈ min(0.7115, 0.7111) = 0.7111
    expect(computeViewportScale(1366, 768)).toBeCloseTo(0.7111, 4)
  })

  it('is width-bound (letterboxed top/bottom) on a 16:10 display', () => {
    // 1920x1200 -> min(1.0, 1.111) = 1.0
    expect(computeViewportScale(1920, 1200)).toBe(1)
  })

  it('is width-bound (letterboxed left/right) on a 5:4 display', () => {
    // 1280x1024 -> min(0.6667, 0.9481) = 0.6667
    expect(computeViewportScale(1280, 1024)).toBeCloseTo(0.6667, 4)
  })
})
