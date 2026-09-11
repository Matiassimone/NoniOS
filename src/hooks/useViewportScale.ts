import { useEffect, useState } from 'react'

/** The fixed design canvas every NoniOS screen is laid out against. */
export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

export interface Viewport {
  /** Uniform CSS scale applied to the canvas. */
  scale: number
  /** Canvas size in design pixels — at least 1920x1080, larger on the axis the
   *  real screen has extra room, so the canvas always covers the whole window. */
  width: number
  height: number
}

/**
 * Fits the fixed {@link CANVAS_WIDTH}x{@link CANVAS_HEIGHT} design into a
 * `width`x`height` window without distortion, then grows the canvas along the
 * longer axis so no letterbox band is left. Component sizes, spacing and grid
 * wrapping stay exactly as designed (never a responsive redesign — CLAUDE.md /
 * DESIGN.md); screens only get extra breathing room on unusual aspect ratios.
 */
export function computeViewport(width: number, height: number): Viewport {
  const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT)
  return {
    scale,
    width: Math.max(CANVAS_WIDTH, Math.round(width / scale)),
    height: Math.max(CANVAS_HEIGHT, Math.round(height / scale)),
  }
}

/** Kept for callers that only need the scale. */
export function computeViewportScale(width: number, height: number): number {
  return computeViewport(width, height).scale
}

/**
 * Tracks the viewport for the current window size, recomputing on resize.
 * Consumed by {@link import('@/components/ViewportScaler').ViewportScaler}.
 */
export function useViewportScale(): Viewport {
  const [viewport, setViewport] = useState(() =>
    computeViewport(window.innerWidth, window.innerHeight),
  )

  useEffect(() => {
    const update = () => setViewport(computeViewport(window.innerWidth, window.innerHeight))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return viewport
}
