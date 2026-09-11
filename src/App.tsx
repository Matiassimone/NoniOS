import { useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'

import { ViewportScaler } from '@/components/ViewportScaler'
import { ConfigProvider, useConfig } from '@/hooks/useConfig'
import { TranslationProvider } from '@/i18n/useTranslation'
import { Admin } from '@/screens/Admin/Admin'
import { Home } from '@/screens/Home/Home'

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
          <Home onOpenAdmin={() => setView(View.ADMIN)} />
        ) : (
          <Admin onBackToHome={() => setView(View.HOME)} />
        )}
      </ViewportScaler>
    </TranslationProvider>
  )
}
