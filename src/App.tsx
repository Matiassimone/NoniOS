import { useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'
import { Cog, Sprout } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { ViewportScaler } from '@/components/ViewportScaler'

type View = 'home' | 'admin'

/**
 * Temporary scaffold app (Build Order steps 1, 3 & 4). Proves the stack plus the
 * fixed scaled canvas, and wires the hidden F4 hotkey to a Home <-> Admin toggle.
 * The two placeholders below stand in for the real screens (Build Order 8-9) and
 * their copy is not yet routed through i18n (Build Order step 7) — both land
 * before real copy does.
 */
export default function App() {
  const [view, setView] = useState<View>('home')

  useEffect(() => {
    const pending = listen('admin-hotkey', () => {
      setView((current) => (current === 'home' ? 'admin' : 'home'))
    })
    return () => {
      pending.then((unlisten) => unlisten())
    }
  }, [])

  return (
    <ViewportScaler>{view === 'home' ? <HomePlaceholder /> : <AdminPlaceholder />}</ViewportScaler>
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

function AdminPlaceholder() {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface">
      <Cog className="size-16 text-moss" />
      <span className="font-mono text-sm uppercase tracking-[0.13em] text-muted">Admin</span>
      <span className="text-2xl text-ink2">Press F4 to return</span>
    </main>
  )
}
