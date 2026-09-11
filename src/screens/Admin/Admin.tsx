import { useEffect, useState } from 'react'

import { Home, LayoutGrid, MonitorSmartphone, Settings } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { NoniLogo } from '@/components/NoniLogo'
import { useConfig } from '@/hooks/useConfig'
import { useTranslation, type TranslationKey } from '@/i18n/useTranslation'
import { TargetKind, TileKind } from '@/lib/config'
import { findInstalledApp, listInstalledApps } from '@/lib/installedApps'
import { invoke } from '@/lib/ipc'
import { cn } from '@/lib/utils'

import { GeneralSection } from './GeneralSection'
import { RemoteAccessSection } from './RemoteAccessSection'
import { TilesSection } from './TilesSection'

const Section = { GENERAL: 'general', TILES: 'tiles', REMOTE: 'remoteAccess' } as const
type Section = (typeof Section)[keyof typeof Section]

const NAV: { id: Section; key: TranslationKey; icon: typeof Settings }[] = [
  { id: Section.GENERAL, key: 'admin.nav.general', icon: Settings },
  { id: Section.TILES, key: 'admin.nav.tiles', icon: LayoutGrid },
  { id: Section.REMOTE, key: 'admin.nav.remoteAccess', icon: MonitorSmartphone },
]

/** How long the "Returning to the home screen…" overlay shows before Home. */
const LEAVING_MS = 900

/**
 * The hidden Admin screen (F4). Sidebar with three flat sections plus the two
 * always-visible exits — "Back to Home" and "Close NoniOS" — and the main pane
 * (DESIGN.md -> Admin). On first boot it also shows a short notice and kicks
 * off installed-app detection for seeded app tiles whose target is still empty
 * (CLAUDE.md -> First Boot).
 */
export function Admin({ onBackToHome }: { onBackToHome: () => void }) {
  const { t } = useTranslation()
  const { firstBoot } = useConfig()
  const [section, setSection] = useState<Section>(Section.GENERAL)
  const [leaving, setLeaving] = useState(false)

  useDetectUndetectedAppTiles()

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(onBackToHome, LEAVING_MS)
    return () => window.clearTimeout(timer)
  }, [leaving, onBackToHome])

  return (
    <div className="relative flex h-full w-full bg-paper text-ink">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border bg-surface px-[22px] py-8">
        <div className="flex items-center gap-3 px-2.5 pb-[26px]">
          <NoniLogo size={30} />
          <div className="flex flex-col leading-[1.1]">
            <span className="text-base font-semibold tracking-tight">NoniOS</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
              {t('admin.brand.subtitle')}
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ id, key, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                'flex items-center gap-3.5 rounded-[10px] px-4 py-3.5 text-[15px] font-medium transition-colors',
                section === id ? 'bg-tint text-ink' : 'text-ink2 hover:bg-tint',
              )}
            >
              <Icon className="size-[22px]" strokeWidth={1.9} />
              {t(key)}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-3">
            <NoniButton
              className="h-auto w-full rounded-[11px] py-[18px] text-base"
              onClick={() => setLeaving(true)}
            >
              <Home className="size-5" strokeWidth={2.2} />
              {t('admin.backHome')}
            </NoniButton>
            <span className="text-center font-mono text-[10px] tracking-[0.06em] text-muted">
              {t('admin.backHomeHint')}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <NoniButton
              variant="outline"
              className="h-auto w-full rounded-[11px] py-3 text-sm"
              onClick={() => void invoke('exit_kiosk')}
            >
              {t('admin.closeApp')}
            </NoniButton>
            <p className="px-1 text-xs leading-relaxed text-muted">{t('admin.closeAppHint')}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-[72px] py-14">
        <div className="mx-auto max-w-[860px]">
          {firstBoot && (
            <div className="mb-8 rounded-[11px] border border-accent-border bg-tint2 px-[18px] py-4 text-sm leading-relaxed text-ink2">
              {t('admin.firstBoot.notice')}
            </div>
          )}
          {section === Section.GENERAL && <GeneralSection />}
          {section === Section.TILES && <TilesSection />}
          {section === Section.REMOTE && <RemoteAccessSection />}
        </div>
      </main>

      {leaving && (
        <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center gap-[26px] bg-paper">
          <NoniLogo size={72} />
          <span className="text-[22px] font-medium text-ink2">{t('admin.leaving')}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Background detection for app tiles that have no launch target yet (the
 * seeded Netflix row on first boot, or a re-installed app). One Start-menu
 * enumeration per Admin visit; misses stay "not detected" for the manual
 * Re-detect button.
 */
function useDetectUndetectedAppTiles() {
  const { config, update } = useConfig()
  const pending = config.tiles.some((tile) => tile.kind === TileKind.APP && tile.target === '')

  useEffect(() => {
    if (!pending) return
    let cancelled = false
    listInstalledApps().match(
      (apps) => {
        if (cancelled || apps.length === 0) return
        update((current) => ({
          ...current,
          tiles: current.tiles.map((tile) => {
            if (tile.kind !== TileKind.APP || tile.target !== '') return tile
            const match = findInstalledApp(apps, tile.name)
            return match ? { ...tile, target: match.appId, targetKind: TargetKind.AUMID } : tile
          }),
        }))
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` is stable enough; re-run only when a tile becomes undetected
  }, [pending])
}
