import { NoniIconGlyph } from '@/components/NoniIconGlyph'
import type { Tile } from '@/lib/config'

/**
 * Home's tile grid: fixed 430x380 cards, 52 px gap, wrapping inside 990 px so
 * 2 fit a row and 3-4 wrap into 2x2 without any redesign (DESIGN.md -> Home ->
 * Tile grid). One tap = the action; no menus, no confirmations, no badges.
 */
export function TileGrid({ tiles, onTap }: { tiles: Tile[]; onTap: (tile: Tile) => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-24 pt-6 pb-[72px]">
      <div className="flex w-full max-w-[990px] flex-wrap content-center justify-center gap-[52px]">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            aria-label={tile.name}
            onClick={() => onTap(tile)}
            className="flex h-[380px] w-[430px] flex-col items-center justify-center gap-[34px] rounded-[28px] border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,.04)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_0_0_3px_var(--moss)] active:scale-[.965]"
          >
            <TileIcon tile={tile} size={196} />
            <span className="text-[44px] font-semibold tracking-[-0.01em] text-ink">
              {tile.name}
            </span>
          </button>
        ))}
      </div>
    </main>
  )
}

/** The icon cell shared by the grid and the launching overlay. */
export function TileIcon({
  tile,
  size,
  className,
}: {
  tile: Tile
  size: number
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 26,
        background: 'var(--tint2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--moss)',
      }}
    >
      <NoniIconGlyph
        icon={tile.icon}
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={1.5}
      />
    </div>
  )
}
