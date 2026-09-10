import type { ReactNode } from 'react'

import { ArrowLeft, X } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'

interface NoniModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** When set, a back arrow appears before the title (multi-step flows). */
  onBack?: () => void
  footer?: ReactNode
  width?: number
  children: ReactNode
}

/**
 * Admin modal: header (optional back arrow, title, close X), scrollable body,
 * optional footer — the shape both the "Add tile" flow and the tile editor
 * use (DESIGN.md -> Admin -> Tiles). Built on the shadcn `Dialog` primitives,
 * rendered inside the scaled canvas (see `ui/dialog.tsx`).
 */
export function NoniModal({
  open,
  onClose,
  title,
  onBack,
  footer,
  width,
  children,
}: NoniModalProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent style={width ? { width } : undefined} aria-describedby={undefined}>
        <div className="flex items-center justify-between border-b border-border px-7 py-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <NoniButton
                variant="ghost"
                size="icon"
                aria-label={t('admin.tiles.addModal.back')}
                onClick={onBack}
                className="text-ink2"
              >
                <ArrowLeft className="size-5" />
              </NoniButton>
            )}
            <DialogTitle className="text-ink">{title}</DialogTitle>
          </div>
          <DialogClose asChild>
            <NoniButton
              variant="ghost"
              size="icon"
              aria-label={t('admin.tiles.addModal.close')}
              className="text-muted"
            >
              <X className="size-5" />
            </NoniButton>
          </DialogClose>
        </div>
        <div className={cn('overflow-y-auto p-7', footer && 'pb-7')}>{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-border px-7 py-5">{footer}</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
