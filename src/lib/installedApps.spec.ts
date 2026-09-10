import { describe, expect, it } from 'vitest'

import { filterInstalledApps, findInstalledApp } from './installedApps'

const APPS = [
  { name: 'Calculator', appId: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App' },
  { name: 'Netflix', appId: '4DF9E0F8.Netflix_mcm4njqhnhss8!App' },
  { name: 'Netflix Helper', appId: 'helper!App' },
  { name: 'Spotify', appId: 'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify' },
]

describe('findInstalledApp', () => {
  it('prefers an exact name match over a prefix match', () => {
    expect(findInstalledApp(APPS, 'netflix')?.appId).toBe('4DF9E0F8.Netflix_mcm4njqhnhss8!App')
  })
  it('falls back to prefix, then to the app id', () => {
    expect(findInstalledApp(APPS, 'Calc')?.name).toBe('Calculator')
    expect(findInstalledApp(APPS, 'spotifymusic')?.name).toBe('Spotify')
  })
  it('returns null for blanks and misses', () => {
    expect(findInstalledApp(APPS, '  ')).toBeNull()
    expect(findInstalledApp(APPS, 'Telefe')).toBeNull()
  })
})

describe('filterInstalledApps', () => {
  it('filters by substring and returns everything for an empty query', () => {
    expect(filterInstalledApps(APPS, 'net').map((app) => app.name)).toEqual([
      'Netflix',
      'Netflix Helper',
    ])
    expect(filterInstalledApps(APPS, '')).toHaveLength(4)
  })
})
