import { useMemo } from 'react'

import returnHomeUrl from '@/assets/audio/return-home.wav'
import tapUrl from '@/assets/audio/tap.wav'

/**
 * The two bundled UI sounds (DESIGN.md -> Home -> Sound), played through the
 * webview's `<audio>`; both are best-effort — a blocked or failed play must
 * never affect the launch itself.
 */
export function useSound() {
  return useMemo(() => {
    const play = (url: string) => {
      try {
        const audio = new Audio(url)
        void audio.play().catch(() => undefined)
      } catch {
        // audio unavailable (e.g. tests) — silently ignore
      }
    }
    return {
      playTap: () => play(tapUrl),
      playReturnHome: () => play(returnHomeUrl),
    }
  }, [])
}
