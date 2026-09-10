import { describe, expect, it } from 'vitest'

import { DEFAULT_CONFIG } from '@/lib/config'

import { moveTile, normaliseUrl, tileMeta } from './tiles'

const LABELS = { app: 'App', web: 'Web', notDetected: 'not detected' }

describe('moveTile', () => {
  const [netflix, telefe] = DEFAULT_CONFIG.tiles
  it('swaps neighbours and ignores out-of-range moves', () => {
    expect(moveTile([netflix, telefe], 0, 1).map((tile) => tile.id)).toEqual(['telefe', 'netflix'])
    expect(moveTile([netflix, telefe], 0, -1)).toEqual([netflix, telefe])
    expect(moveTile([netflix, telefe], 1, 1)).toEqual([netflix, telefe])
  })
})

describe('tileMeta', () => {
  it('shows the host for web tiles and the target or a not-detected note for apps', () => {
    expect(tileMeta(DEFAULT_CONFIG.tiles[1], LABELS)).toBe('Web · www.mitelefe.com')
    expect(tileMeta(DEFAULT_CONFIG.tiles[0], LABELS)).toBe('App · not detected')
    expect(tileMeta({ ...DEFAULT_CONFIG.tiles[0], target: 'x!App' }, LABELS)).toBe('App · x!App')
  })
})

describe('normaliseUrl', () => {
  it('adds https:// to bare hosts and leaves full URLs alone', () => {
    expect(normaliseUrl(' youtube.com ')).toBe('https://youtube.com')
    expect(normaliseUrl('http://example.org/x')).toBe('http://example.org/x')
    expect(normaliseUrl('HTTPS://a.b')).toBe('HTTPS://a.b')
  })
})
