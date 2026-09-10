import { useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'
import { Sprout } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { ViewportScaler } from '@/components/ViewportScaler'
import { ConfigProvider, useConfig } from '@/hooks/useConfig'
import { TranslationProvider } from '@/i18n/useTranslation'
import { Admin } from '@/screens/Admin/Admin'

const View = { HOME: 'home', ADMIN: 'admin' } as const
type View = (typeof View)[keyof typeof View]

export default function App() {
  return (
    <ConfigProvider>
      <Shell />
    </ConfigProvider>
  )
}

/**
 * Owns the Home <-> Admin switch. The hidden F4 hotkey (emitted by
 * `kiosk/admin_hotkey.rs`) toggles it; the first boot (no config file yet)
 * lands in Admin directly (CLAUDE.md -> First Boot). Until the config has
 * loaded, nothing but the paper background is shown — never a flash of
 * placeholder content.
 */
function Shell() {
  const { config, ready, firstBoot } = useConfig()
  // `null` = "not toggled yet": derive from firstBoot so no effect is needed.
  const [chosenView, setView] = useState<View | null>(null)
  const view = chosenView ?? (firstBoot ? View.ADMIN : View.HOME)

  useEffect(() => {
    const pending = listen('admin-hotkey', () => {
      setView((current) => (current === View.HOME ? View.ADMIN : View.HOME))
    })
    return () => {
      pending.then((unlisten) => unlisten())
    }
  }, [])

  return (
    <TranslationProvider locale={config.user.locale}>
      <ViewportScaler>
        {!ready ? null : view === View.HOME ? (
          <HomePlaceholder />
        ) : (
          <Admin onBackToHome={() => setView(View.HOME)} />
        )}
      </ViewportScaler>
    </TranslationProvider>
  )
}

function HomePlaceholder() {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
          Kiosk launcher
        </span>
        <h1 className="text-6xl font-semibold text-ink">NoniOS</h1>
      </div>
      <NoniButton size="lg">
        <Sprout />
        NoniOS
      </NoniButton>
    </main>
  )
}
