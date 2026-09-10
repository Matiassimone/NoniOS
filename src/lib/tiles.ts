import { TileKind, type Tile } from '@/lib/config'

/** Swaps the tile at `index` with its neighbour; out-of-range moves are no-ops. */
export function moveTile(tiles: Tile[], index: number, direction: -1 | 1): Tile[] {
  const target = index + direction
  if (index < 0 || index >= tiles.length || target < 0 || target >= tiles.length) return tiles
  const next = [...tiles]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** `App · Netflix` / `Web · mitelefe.com` — the mono meta line under a tile name. */
export function tileMeta(tile: Tile, labels: { app: string; web: string; notDetected: string }) {
  if (tile.kind === TileKind.WEB) {
    let host = tile.target
    try {
      host = new URL(tile.target).host
    } catch {
      // keep the raw target if it isn't a parseable URL
    }
    return `${labels.web} · ${host}`
  }
  return `${labels.app} · ${tile.target || labels.notDetected}`
}

/** Adds a scheme when the administrator typed a bare host (`youtube.com`). */
export function normaliseUrl(input: string): string {
  const trimmed = input.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
