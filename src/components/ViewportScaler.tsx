import type { ReactNode } from 'react'

import { useViewportScale } from '@/hooks/useViewportScale'

/**
 * Renders `children` inside the fixed design canvas, scaled uniformly so it
 * covers the real window: 1920x1080 on a 16:9 display, taller or wider on other
 * aspect ratios (see `computeViewport`). Every NoniOS screen lives inside this
 * so its layout matches the reviewed design 1:1 at any resolution.
 */
export function ViewportScaler({ children }: { children: ReactNode }) {
  const { scale, width, height } = useViewportScale()
  return (
    <div className="fixed inset-0 overflow-hidden bg-paper">
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
