import { invoke } from '@tauri-apps/api/core'

import { NoniButton } from '@/components/NoniButton'
import { useTranslation } from '@/i18n/useTranslation'

/**
 * Minimal Admin shell — for now just the sidebar escape actions that resolve the
 * kiosk dead-end (an administrator with no keyboard way out). The three config
 * sections (General / Tiles / Remote Access) arrive in Build Order step 8.
 */
export function Admin({ onBackToHome }: { onBackToHome: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-[320px] flex-col border-r border-border bg-surface p-8">
        <div>
          <div className="text-2xl font-semibold text-ink">NoniOS</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            {t('admin.brand.subtitle')}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex flex-col items-stretch gap-1">
            <NoniButton className="w-full" onClick={onBackToHome}>
              {t('admin.backHome')}
            </NoniButton>
            <span className="text-center text-xs text-muted">{t('admin.backHomeHint')}</span>
          </div>

          <NoniButton
            variant="outline"
            className="w-full"
            onClick={() => void invoke('exit_kiosk')}
          >
            {t('admin.closeApp')}
          </NoniButton>
          <p className="px-1 text-xs text-muted">{t('admin.closeAppHint')}</p>
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
