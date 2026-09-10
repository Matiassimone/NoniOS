import { useState, type ReactNode } from 'react'

import { ChevronDown, ChevronUp, LayoutGrid, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'

import { NoniButton } from '@/components/NoniButton'
import { NoniIconGlyph } from '@/components/NoniIconGlyph'
import { useConfig } from '@/hooks/useConfig'
import { useTranslation } from '@/i18n/useTranslation'
import { TargetKind, TileKind, type Tile } from '@/lib/config'
import { findInstalledApp, listInstalledApps } from '@/lib/installedApps'
import { moveTile, tileMeta } from '@/lib/tiles'
import { cn } from '@/lib/utils'

import { AddTileModal } from './AddTileModal'
import { TileEditorModal } from './TileEditorModal'

/** Extra spinner time after the answer so a fast re-detect still reads as feedback. */
const REDETECT_MIN_MS = 600

/**
 * Admin -> Tiles: the ordered list Home renders, with up/down reorder (no
 * drag-and-drop by design), inline re-detect for app tiles, edit and delete,
 * plus the empty state (DESIGN.md -> Admin -> Tiles).
 */
export function TilesSection() {
  const { t } = useTranslation()
  const { config, update } = useConfig()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Tile | null>(null)
  const [redetecting, setRedetecting] = useState<string | null>(null)
  const tiles = config.tiles
  const name = config.user.name || 'Noni'

  const setTiles = (recipe: (tiles: Tile[]) => Tile[]) =>
    update((current) => ({ ...current, tiles: recipe(current.tiles) }))

  const redetect = (tile: Tile) => {
    setRedetecting(tile.id)
    listInstalledApps()
      .map((apps) => findInstalledApp(apps, tile.name))
      .match(
        (match) => {
          if (match) {
            setTiles((list) =>
              list.map((item) =>
                item.id === tile.id
                  ? { ...item, target: match.appId, targetKind: TargetKind.AUMID }
                  : item,
              ),
            )
          }
        },
        () => undefined,
      )
      .finally(() => {
        // Keep the spinner up a beat so a fast answer still reads as "detected".
        window.setTimeout(() => setRedetecting(null), REDETECT_MIN_MS)
      })
  }

  const metaLabels = {
    app: t('admin.tiles.metaApp'),
    web: t('admin.tiles.metaWeb'),
    notDetected: t('admin.tiles.notDetected'),
  }

  return (
    <div className="flex flex-col">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <h1 className="mb-1.5 text-[34px] font-semibold tracking-tight text-ink">
            {t('admin.tiles.title')}
          </h1>
          <p className="text-[15px] text-ink2">{t('admin.tiles.subtitle', { name })}</p>
        </div>
        {tiles.length > 0 && (
          <NoniButton className="h-auto px-5 py-3 text-sm" onClick={() => setAdding(true)}>
            <Plus strokeWidth={2.4} />
            {t('admin.tiles.add')}
          </NoniButton>
        )}
      </div>

      {tiles.length === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border bg-surface px-10 py-20 text-center">
          <span className="flex size-[88px] items-center justify-center rounded-[20px] bg-tint text-muted">
            <LayoutGrid className="size-[42px]" strokeWidth={1.7} />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] font-semibold text-ink">{t('admin.tiles.emptyTitle')}</h2>
            <p className="max-w-[380px] text-[15px] text-ink2">{t('admin.tiles.emptyBody')}</p>
          </div>
          <NoniButton
            className="h-auto rounded-xl px-7 py-4 text-base"
            onClick={() => setAdding(true)}
          >
            <Plus strokeWidth={2.4} />
            {t('admin.tiles.addFirst')}
          </NoniButton>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tiles.map((tile, index) => (
            <li
              key={tile.id}
              className="flex items-center gap-[18px] rounded-[13px] border border-border bg-surface px-[18px] py-4 transition-colors hover:bg-tint"
            >
              <div className="flex flex-col gap-0.5">
                <IconButton
                  label={t('admin.tiles.moveUp')}
                  disabled={index === 0}
                  onClick={() => setTiles((list) => moveTile(list, index, -1))}
                >
                  <ChevronUp className="size-[17px]" strokeWidth={2.4} />
                </IconButton>
                <IconButton
                  label={t('admin.tiles.moveDown')}
                  disabled={index === tiles.length - 1}
                  onClick={() => setTiles((list) => moveTile(list, index, 1))}
                >
                  <ChevronDown className="size-[17px]" strokeWidth={2.4} />
                </IconButton>
              </div>

              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-tint2 text-ink">
                <NoniIconGlyph icon={tile.icon} className="size-[26px]" />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[17px] font-semibold text-ink">{tile.name}</span>
                <span className="truncate font-mono text-[13px] tracking-[0.02em] text-muted">
                  {tileMeta(tile, metaLabels)}
                </span>
              </div>

              {tile.kind === TileKind.APP && (
                <NoniButton
                  variant="outline"
                  className="h-auto px-3.5 py-2 text-[13px] font-medium text-ink2 hover:border-moss"
                  disabled={redetecting === tile.id}
                  onClick={() => redetect(tile)}
                >
                  <RefreshCw
                    className={cn('size-[15px]', redetecting === tile.id && 'animate-spin')}
                  />
                  {redetecting === tile.id
                    ? t('admin.tiles.redetecting')
                    : t('admin.tiles.redetect')}
                </NoniButton>
              )}

              <div className="flex gap-1.5">
                <IconButton label={t('admin.tiles.edit')} onClick={() => setEditing(tile)} large>
                  <Pencil className="size-[18px]" />
                </IconButton>
                <IconButton
                  label={t('admin.tiles.delete')}
                  onClick={() => setTiles((list) => list.filter((item) => item.id !== tile.id))}
                  large
                  danger
                >
                  <Trash2 className="size-[18px]" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddTileModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(tile) => setTiles((list) => [...list, tile])}
      />
      {editing && (
        <TileEditorModal
          tile={editing}
          onClose={() => setEditing(null)}
          onSave={(saved) =>
            setTiles((list) => list.map((item) => (item.id === saved.id ? saved : item)))
          }
        />
      )}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  large,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  large?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <NoniButton
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'text-ink2 disabled:opacity-25',
        large ? 'size-10 rounded-[9px]' : 'size-7 rounded-md text-muted',
        danger && 'hover:bg-danger/10 hover:text-danger',
      )}
    >
      {children}
    </NoniButton>
  )
}
