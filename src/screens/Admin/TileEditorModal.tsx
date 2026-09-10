import { useState } from 'react'

import { NoniButton } from '@/components/NoniButton'
import { NoniInput } from '@/components/NoniInput'
import { NoniField } from '@/components/NoniField'
import { NoniModal } from '@/components/NoniModal'
import { useTranslation } from '@/i18n/useTranslation'
import type { IconKey, Tile } from '@/lib/config'

import { IconPicker } from './IconPicker'

/** Edit modal: label + icon (DESIGN.md -> Admin -> Tiles -> Edit modal). */
export function TileEditorModal({
  tile,
  onClose,
  onSave,
}: {
  tile: Tile
  onClose: () => void
  onSave: (tile: Tile) => void
}) {
  const { t } = useTranslation()
  const [label, setLabel] = useState(tile.name)
  const [icon, setIcon] = useState<IconKey>(tile.icon)

  const save = () => {
    onSave({ ...tile, name: label.trim() || tile.name, icon })
    onClose()
  }

  return (
    <NoniModal
      open
      onClose={onClose}
      title={t('admin.tiles.editModal.title')}
      width={560}
      footer={
        <>
          <NoniButton
            variant="ghost"
            className="h-auto px-5 py-3 text-sm text-ink2"
            onClick={onClose}
          >
            {t('admin.tiles.addModal.cancel')}
          </NoniButton>
          <NoniButton className="h-auto px-6 py-3 text-sm" onClick={save}>
            {t('admin.tiles.editModal.save')}
          </NoniButton>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <NoniField label={t('admin.tiles.addModal.labelLabel')}>
          <NoniInput value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
        </NoniField>
        <NoniField label={t('admin.tiles.addModal.iconLabel')}>
          <IconPicker value={icon} onChange={setIcon} />
        </NoniField>
      </div>
    </NoniModal>
  )
}
