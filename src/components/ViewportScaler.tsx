import type { ReactNode } from 'react'

import { CANVAS_HEIGHT, CANVAS_WIDTH, useViewportScale } from '@/hooks/useViewportScale'

/**
 * Renders `children` inside the fixed 1920×1080 design canvas, scaled uniformly
 * to fill the real window and centered (letterboxed on non-16:9 displays). Every
 * NoniOS screen lives inside this so its layout matches the reviewed design 1:1
 * at any resolution — never a responsive redesign (CLAUDE.md / DESIGN.md).
 */
export function ViewportScaler({ children }: { children: ReactNode }) {
  const scale = useViewportScale()
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-paper">
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
