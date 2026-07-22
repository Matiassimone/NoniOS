import { useEffect, useState } from 'react'

/** The fixed design canvas every NoniOS screen is laid out against. */
export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

/**
 * Uniform scale that fits the fixed {@link CANVAS_WIDTH}×{@link CANVAS_HEIGHT}
 * canvas inside a `width`×`height` window without ever distorting it — the
 * layout never changes, only its rendered size (CLAUDE.md / DESIGN.md: never a
 * responsive redesign). Displays that aren't 16:9 letterbox rather than stretch.
 */
export function computeViewportScale(width: number, height: number): number {
  return Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT)
}

/**
 * Tracks the viewport scale for the current window size, recomputing on resize.
 * Consumed by {@link import('@/components/ViewportScaler').ViewportScaler}.
 */
export function useViewportScale(): number {
  const [scale, setScale] = useState(() =>
    computeViewportScale(window.innerWidth, window.innerHeight),
  )

  useEffect(() => {
    const update = () => setScale(computeViewportScale(window.innerWidth, window.innerHeight))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}
