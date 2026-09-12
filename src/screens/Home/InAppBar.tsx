import { createPortal } from 'react-dom'

import { ArrowLeft, Home } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { useTranslation } from '@/i18n/useTranslation'

/**
 * Height in CSS (logical) pixels of the strip the embedded web tile leaves free
 * at the top. Must match `BAR_HEIGHT` in `src-tauri/src/launchers/webview_app.rs`.
 */
export const BAR_HEIGHT = 120

/**
 * The bar above an embedded web tile: the page title, a browser-style "Atrás"
 * and the one way home. Rendered through a portal to <body>, deliberately
 * OUTSIDE the scaled design canvas, because it has to line up with the child
 * webview's real pixel offset, not the canvas.
 */
export function InAppBar({
  title,
  onBack,
  onReturn,
}: {
  title: string
  onBack: () => void
  onReturn: () => void
}) {
  const { t } = useTranslation()
  return createPortal(
    <div
      className="fixed top-0 right-0 left-0 z-[100] flex items-center justify-between gap-6 border-b border-border bg-paper px-10"
      style={{ height: BAR_HEIGHT }}
    >
      <div className="flex items-center gap-6">
        <NoniButton
          variant="outline"
          className="h-[76px] rounded-2xl px-8 text-[26px] font-semibold [&_svg]:size-8"
          onClick={onBack}
        >
          <ArrowLeft strokeWidth={2.2} />
          {t('home.inApp.pageBack')}
        </NoniButton>
        <span className="text-[34px] font-semibold text-ink">{title}</span>
      </div>
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
