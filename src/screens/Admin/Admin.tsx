import { invoke } from '@tauri-apps/api/core'

import { NoniButton } from '@/components/NoniButton'

/**
 * Minimal Admin shell — for now just the sidebar escape actions that resolve the
 * kiosk dead-end (an administrator with no keyboard way out). The three config
 * sections (General / Tiles / Remote Access) arrive in Build Order step 8.
 */
// ponytail: copy here is temporary Spanish, pre-i18n (Build Order step 7 routes it)
export function Admin({ onBackToHome }: { onBackToHome: () => void }) {
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-[320px] flex-col border-r border-border bg-surface p-8">
        <div>
          <div className="text-2xl font-semibold text-ink">NoniOS</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            Administración
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex flex-col items-stretch gap-1">
            <NoniButton className="w-full" onClick={onBackToHome}>
              Volver a Home
            </NoniButton>
            <span className="text-center text-xs text-muted">o presioná F4</span>
          </div>

          <NoniButton
            variant="outline"
            className="w-full"
            onClick={() => void invoke('exit_kiosk')}
          >
            Cerrar NoniOS
          </NoniButton>
          <p className="px-1 text-xs text-muted">
            Sale del modo kiosco al escritorio de Windows. Si el inicio automático está activo,
            NoniOS se reabre solo en ~1 minuto.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center">
        <span className="font-mono text-sm uppercase tracking-[0.13em] text-muted">
          Admin (placeholder)
        </span>
      </main>
    </div>
  )
}
