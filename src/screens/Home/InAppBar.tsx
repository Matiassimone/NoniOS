import { createPortal } from 'react-dom'

import { Home } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { useTranslation } from '@/i18n/useTranslation'

/**
 * Height in CSS (logical) pixels of the strip the external web window leaves
 * free at the top. Must match `BAR_HEIGHT` in `src-tauri/src/launchers/webview_app.rs`.
 */
export const BAR_HEIGHT = 120

/**
 * The one way back from a web tile: a large "Back to home" bar across the top
 * of the real screen. Rendered through a portal to <body>, deliberately
 * OUTSIDE the scaled 1920x1080 canvas, because it has to line up with the
 * external window's real pixel offset, not the design canvas.
 */
export function InAppBar({ title, onReturn }: { title: string; onReturn: () => void }) {
  const { t } = useTranslation()
  return createPortal(
    <div
      className="fixed top-0 right-0 left-0 z-[100] flex items-center justify-between border-b border-border bg-paper px-10"
      style={{ height: BAR_HEIGHT }}
    >
      <span className="text-[34px] font-semibold text-ink">{title}</span>
      <NoniButton
        className="h-[76px] rounded-2xl px-10 text-[28px] font-semibold [&_svg]:size-8"
        onClick={onReturn}
      >
        <Home strokeWidth={2.2} />
        {t('home.inApp.back')}
      </NoniButton>
    </div>,
    document.body,
  )
}
