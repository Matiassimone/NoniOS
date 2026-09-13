import { useState, type ReactNode } from 'react'

import { AppWindow, Gamepad2, Globe } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { NoniField } from '@/components/NoniField'
import { NoniInput } from '@/components/NoniInput'
import { NoniModal } from '@/components/NoniModal'
import { NoniSwitch } from '@/components/NoniSwitch'
import { useConfig } from '@/hooks/useConfig'
import { useTranslation } from '@/i18n/useTranslation'
import { TargetKind, TileKind, type IconKey, type Tile } from '@/lib/config'
import type { InstalledApp } from '@/lib/installedApps'
import { normaliseUrl } from '@/lib/tiles'

import { IconPicker } from './IconPicker'
import { InstalledAppsPicker } from './InstalledAppsPicker'

const Step = { TYPE: 'type', APP: 'app', WEB: 'web' } as const
type Step = (typeof Step)[keyof typeof Step]

/**
 * Two-step "Add tile" flow (DESIGN.md -> Admin -> Tiles): pick a type, then
 * either choose an installed app (one click adds it) or fill in a web page.
 */
export function AddTileModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (tile: Tile) => void
}) {
  const { t } = useTranslation()
  const { config } = useConfig()
  const [step, setStep] = useState<Step>(Step.TYPE)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState<IconKey>('globe')
  const [focusVideo, setFocusVideo] = useState(false)

  const reset = () => {
    setStep(Step.TYPE)
    setUrl('')
    setLabel('')
    setIcon('globe')
    setFocusVideo(false)
  }
  const close = () => {
    reset()
    onClose()
  }

  const addApp = (app: InstalledApp) => {
    onAdd({
      id: `app-${Date.now()}`,
      name: app.name,
      kind: TileKind.APP,
      icon: 'play',
      target: app.appId,
      targetKind: TargetKind.AUMID,
      focusVideo: false,
    })
    close()
  }

  const addSpider = () => {
    onAdd({
      id: 'game-spider',
      name: t('admin.tiles.game.spider'),
      kind: TileKind.WEB,
      icon: 'heart',
      target: 'spider',
      targetKind: TargetKind.BUILTIN,
      focusVideo: false,
    })
    close()
  }

  const canAddWeb = url.trim().length > 0 && label.trim().length > 0
  const addWeb = () => {
    if (!canAddWeb) return
    onAdd({
      id: `web-${Date.now()}`,
      name: label.trim(),
      kind: TileKind.WEB,
      icon,
      target: normaliseUrl(url),
      targetKind: TargetKind.URL,
      focusVideo,
    })
    close()
  }

  const title =
    step === Step.APP
      ? t('admin.tiles.addModal.pickAppTitle')
      : step === Step.WEB
        ? t('admin.tiles.addModal.webStepTitle')
        : t('admin.tiles.addModal.title')

  return (
    <NoniModal
      open={open}
      onClose={close}
      title={title}
      onBack={step === Step.TYPE ? undefined : () => setStep(Step.TYPE)}
      footer={
        step === Step.WEB ? (
          <>
            <NoniButton
              variant="ghost"
              className="h-auto px-5 py-3 text-sm text-ink2"
              onClick={close}
            >
              {t('admin.tiles.addModal.cancel')}
            </NoniButton>
            <NoniButton className="h-auto px-6 py-3 text-sm" disabled={!canAddWeb} onClick={addWeb}>
              {t('admin.tiles.addModal.confirm')}
            </NoniButton>
          </>
        ) : undefined
      }
    >
      {step === Step.TYPE && (
        <div className="flex flex-col gap-3.5">
          <p className="mb-1.5 text-sm text-ink2">{t('admin.tiles.addModal.question')}</p>
          <TypeCard
            icon={<AppWindow />}
            title={t('admin.tiles.addModal.appTitle')}
            body={t('admin.tiles.addModal.appBody')}
            onClick={() => setStep(Step.APP)}
          />
          <TypeCard
            icon={<Globe />}
            title={t('admin.tiles.addModal.webTitle')}
            body={t('admin.tiles.addModal.webBody')}
            onClick={() => setStep(Step.WEB)}
          />
          <TypeCard
            icon={<Gamepad2 />}
            title={t('admin.tiles.addModal.gameTitle')}
            body={t('admin.tiles.addModal.gameBody')}
            onClick={addSpider}
          />
        </div>
      )}

      {step === Step.APP && <InstalledAppsPicker onPick={addApp} />}

      {step === Step.WEB && (
        <div className="flex flex-col gap-6">
          <NoniField label={t('admin.tiles.addModal.urlLabel')}>
            <NoniInput
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t('admin.tiles.addModal.urlPlaceholder')}
              autoFocus
            />
          </NoniField>
          <NoniField
            label={t('admin.tiles.addModal.labelLabel')}
            hint={t('admin.tiles.addModal.labelHint', { name: config.user.name || 'Noni' })}
          >
            <NoniInput
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t('admin.tiles.addModal.labelPlaceholder')}
            />
          </NoniField>
          <NoniField label={t('admin.tiles.addModal.iconLabel')}>
            <IconPicker value={icon} onChange={setIcon} />
          </NoniField>
          <FocusVideoField value={focusVideo} onChange={setFocusVideo} />
        </div>
      )}
    </NoniModal>
  )
}

function TypeCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: ReactNode
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[18px] rounded-[13px] border border-border p-[22px] text-left transition-colors hover:border-moss hover:bg-tint"
    >
      <span className="flex size-[52px] shrink-0 items-center justify-center rounded-[11px] bg-tint2 text-moss [&_svg]:size-[26px]">
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-muted">{body}</span>
      </span>
    </button>
  )
}

/** The "show only the video" switch, shared by the add and edit web forms. */
export function FocusVideoField({
  value,
  onChange,
}: {
  value: boolean
  onChange: (next: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-6 rounded-[11px] border border-border bg-surface px-4 py-3.5">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">
          {t('admin.tiles.addModal.focusVideoLabel')}
        </span>
        <span className="text-[13px] text-muted">{t('admin.tiles.addModal.focusVideoHint')}</span>
      </div>
      <NoniSwitch checked={value} onCheckedChange={onChange} />
    </div>
  )
}
