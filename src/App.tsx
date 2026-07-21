import { Sprout } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'

/**
 * Temporary scaffold screen (Build Order step 1). Exists only to prove the
 * stack end to end — Tailwind tokens, Geist fonts, and the shadcn/`Noni*`
 * pipeline all render. Replaced by the real Home/Admin screens in later steps.
 */
export default function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 bg-paper">
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
