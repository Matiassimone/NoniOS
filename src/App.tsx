import { useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'
import { Sprout } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { ViewportScaler } from '@/components/ViewportScaler'
import { Admin } from '@/screens/Admin/Admin'

type View = 'home' | 'admin'

/**
 * Temporary scaffold app. Proves the stack plus the fixed scaled canvas, and
 * wires the hidden F4 hotkey to a Home <-> Admin toggle. The Home placeholder
 * stands in for the real screen (Build Order step 9); Admin is currently the
 * minimal escape shell (see @/screens/Admin/Admin).
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
    <ViewportScaler>
      {view === 'home' ? <HomePlaceholder /> : <Admin onBackToHome={() => setView('home')} />}
    </ViewportScaler>
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
