import { NoniIconGlyph } from '@/components/NoniIconGlyph'
import { useTranslation } from '@/i18n/useTranslation'
import type { IconKey } from '@/lib/config'
import { cn } from '@/lib/utils'

/** Display order from the Admin prototype (most generic first). */
const PICKER_ORDER: IconKey[] = [
  'globe',
  'video',
  'music',
  'phone',
  'photos',
  'play',
  'tv',
  'book',
  'heart',
  'weather',
]

/** The glyph-library picker shared by the add-web-tile and edit-tile modals. */
export function IconPicker({
  value,
  onChange,
}: {
  value: IconKey
  onChange: (icon: IconKey) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {PICKER_ORDER.map((key) => {
        const selected = key === value
        return (
          <button
            key={key}
            type="button"
            aria-label={t('admin.tiles.addModal.iconLabel')}
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={cn(
              'flex size-[52px] items-center justify-center rounded-[11px] border-2 transition-colors',
              selected
                ? 'border-moss bg-tint2 text-moss'
                : 'border-border bg-surface text-ink2 hover:bg-tint',
            )}
          >
            <NoniIconGlyph icon={key} className="size-[26px]" />
          </button>
        )
      })}
    </div>
  )
}
