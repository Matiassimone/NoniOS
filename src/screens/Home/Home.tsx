import { useCallback, useEffect, useReducer, useState } from 'react'

import { NoniLogo } from '@/components/NoniLogo'
import { useConfig } from '@/hooks/useConfig'
import { useSound } from '@/hooks/useSound'
import { useWindowWatcherEvents } from '@/hooks/useWindowWatcherEvents'
import { useTranslation } from '@/i18n/useTranslation'
import { TileKind, type Tile } from '@/lib/config'
import { externalBack, launchTile, returnHome } from '@/lib/launch'

import { HomeHeader } from './HomeHeader'
import { InAppBar } from './InAppBar'
import { TileGrid, TileIcon } from './TileGrid'
import { HomeView, INITIAL_HOME_STATE, homeReducer } from './homeMachine'

/** How long the returning beat (just the logo) stays before Home is shown again. */
const RETURNING_MS = 1000
/** Header clock granularity (greeting + date only need minute precision). */
const CLOCK_MS = 60 * 1000

/**
 * The end user's screen. Owns the home/launching/inApp/returning machine
 * (CLAUDE.md -> Screens -> Home); transitions come from the window watcher's
 * events, the `returning` beat is the only timer here.
 */
export function Home({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const { t } = useTranslation()
  const { config } = useConfig()
  const { playTap, playReturnHome } = useSound()
  const [state, dispatch] = useReducer(homeReducer, INITIAL_HOME_STATE)
  const now = useClock()

  const onShown = useCallback(() => dispatch({ type: 'shown' }), [])
  const onClosed = useCallback(() => dispatch({ type: 'closed' }), [])
  useWindowWatcherEvents(onShown, onClosed)

  const tap = (tile: Tile) => {
    if (state.view !== HomeView.HOME) return
    playTap()
    dispatch({ type: 'tap', tile })
    launchTile(tile.id).mapErr(() => dispatch({ type: 'launchFailed' }))
  }

  // The returning beat: warm tone, then back to the grid.
  useEffect(() => {
    if (state.view !== HomeView.RETURNING) return
    playReturnHome()
    const timer = window.setTimeout(() => dispatch({ type: 'returnDone' }), RETURNING_MS)
    return () => window.clearTimeout(timer)
  }, [state.view, playReturnHome])

  // Leaving Home while something is in front (F4 -> Admin): bring the kiosk back.
  const busy = state.view === HomeView.LAUNCHING || state.view === HomeView.IN_APP
  useEffect(() => {
    if (!busy) return
    return () => {
      void returnHome()
    }
  }, [busy])

  // A tile with nothing to launch (e.g. Netflix before detection) is not shown:
  // the end user must never tap something that does nothing. Admin still lists it.
  const launchable = config.tiles.filter((tile) => tile.target !== '')

  return (
    <div className="relative flex h-full w-full flex-col bg-paper text-ink">
      {/* Hidden maintenance hotspot (top-left, 96x96) — also F4. */}
      <button
        type="button"
        aria-label={t('admin.brand.subtitle')}
        onClick={onOpenAdmin}
        className="absolute top-0 left-0 z-[60] size-24 cursor-default opacity-0"
      />

      <HomeHeader now={now} />
      <TileGrid tiles={launchable} onTap={tap} />

      {/* Maintenance hint for the administrator; deliberately small and muted. */}
      <span className="absolute right-10 bottom-8 font-mono text-[13px] tracking-[0.06em] text-muted/70">
        {t('home.adminHint')}
      </span>

      {state.view === HomeView.LAUNCHING && state.active && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-12 bg-paper">
          <div className="relative flex size-[240px] items-center justify-center">
            <svg
              width="240"
              height="240"
              viewBox="0 0 240 240"
              className="absolute inset-0 animate-spin [animation-duration:1.1s]"
            >
              <circle cx="120" cy="120" r="112" fill="none" stroke="var(--tint)" strokeWidth="8" />
              <circle
                cx="120"
                cy="120"
                r="112"
                fill="none"
                stroke="var(--moss)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="180 704"
              />
            </svg>
            <TileIcon tile={state.active} size={172} className="animate-pulse" />
          </div>
          <div className="text-[48px] font-semibold tracking-[-0.01em]">
            {t('home.launching', { app: state.active.name })}
          </div>
        </div>
      )}

      {state.view === HomeView.RETURNING && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-paper">
          <NoniLogo size={120} className="animate-pulse" />
        </div>
      )}

      {state.view === HomeView.IN_APP && state.active?.kind === TileKind.WEB && (
        <InAppBar
          title={state.active.name}
          onBack={() => void externalBack()}
          onReturn={() => void returnHome()}
        />
      )}
    </div>
  )
}

function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CLOCK_MS)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
