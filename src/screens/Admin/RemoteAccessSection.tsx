import { useEffect, useState } from 'react'

import { Check, Copy, Lock, RefreshCw } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { NoniCard } from '@/components/NoniCard'
import { useConfig } from '@/hooks/useConfig'
import { useTranslation } from '@/i18n/useTranslation'
import { formatAnydeskId, getAnydeskId } from '@/lib/anydesk'
import { cn } from '@/lib/utils'

const COPIED_FEEDBACK_MS = 1800

/**
 * Admin -> Remote Access: shows this machine's AnyDesk ID (read from AnyDesk
 * itself) with a copy button, how to reconnect, and the explicit note that the
 * password lives in AnyDesk only (DESIGN.md -> Admin -> Remote Access).
 */
export function RemoteAccessSection() {
  const { t } = useTranslation()
  const { config, update } = useConfig()
  const [detecting, setDetecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const anydeskId = config.anydeskId

  const detect = () => {
    setDetecting(true)
    getAnydeskId().match(
      (id) => {
        if (id && id !== anydeskId) update((current) => ({ ...current, anydeskId: id }))
        setDetecting(false)
      },
      () => setDetecting(false),
    )
  }

  // Refresh once per visit; the cached ID (if any) stays visible meanwhile.
  useEffect(() => {
    let cancelled = false
    getAnydeskId().match(
      (id) => {
        if (!cancelled && id)
          update((current) => (current.anydeskId === id ? current : { ...current, anydeskId: id }))
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const copy = () => {
    if (!anydeskId) return
    void navigator.clipboard?.writeText(formatAnydeskId(anydeskId))
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
  }

  return (
    <div>
      <h1 className="mb-1.5 text-[34px] font-semibold tracking-tight text-ink">
        {t('admin.remoteAccess.title')}
      </h1>
      <p className="mb-10 text-[15px] text-ink2">{t('admin.remoteAccess.subtitle')}</p>

      <NoniCard>
        <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
          {t('admin.remoteAccess.idLabel')}
        </div>

        {anydeskId ? (
          <div className="flex items-center gap-[18px]">
            <span className="font-mono text-[44px] font-semibold tracking-[0.02em] text-ink">
              {formatAnydeskId(anydeskId)}
            </span>
            <NoniButton
              variant="outline"
              onClick={copy}
              className={cn('h-auto px-[18px] py-3 text-sm', copied && 'bg-tint2 text-moss')}
            >
              {copied ? <Check strokeWidth={2.4} /> : <Copy />}
              {copied ? t('admin.remoteAccess.copied') : t('admin.remoteAccess.copy')}
            </NoniButton>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="text-[22px] font-semibold text-ink">
              {t('admin.remoteAccess.notDetectedTitle')}
            </span>
            <p className="max-w-[560px] text-sm leading-relaxed text-ink2">
              {t('admin.remoteAccess.notDetectedBody')}
            </p>
            <NoniButton
              variant="outline"
              className="h-auto w-max px-3.5 py-2 text-[13px]"
              disabled={detecting}
              onClick={detect}
            >
              <RefreshCw className={cn(detecting && 'animate-spin')} />
              {detecting ? t('admin.remoteAccess.detecting') : t('admin.remoteAccess.redetect')}
            </NoniButton>
          </div>
        )}

        <div className="my-8 h-px bg-border-soft" />

        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold text-ink">{t('admin.remoteAccess.howTitle')}</span>
          <p className="max-w-[560px] text-sm leading-relaxed text-ink2">
            {t('admin.remoteAccess.howBody')}
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-[11px] border border-accent-border bg-tint2 px-[18px] py-4">
          <Lock className="mt-px size-[19px] shrink-0 text-moss" />
          <p className="text-[13.5px] leading-relaxed text-ink2">
            {t('admin.remoteAccess.passwordNote')}
          </p>
        </div>
      </NoniCard>
    </div>
  )
}
