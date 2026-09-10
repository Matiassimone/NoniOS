import { describe, expect, it } from 'vitest'

import { DEFAULT_CONFIG, parseEnvelope } from './config'

describe('parseEnvelope', () => {
  it('accepts a valid envelope untouched', () => {
    const envelope = { config: DEFAULT_CONFIG, firstBoot: true }
    expect(parseEnvelope(envelope)).toEqual(envelope)
  })

  it('falls back to the seed config on garbage', () => {
    expect(parseEnvelope('nonsense')).toEqual({ config: DEFAULT_CONFIG, firstBoot: false })
    expect(parseEnvelope({ config: { tiles: 'nope' }, firstBoot: true })).toEqual({
      config: DEFAULT_CONFIG,
      firstBoot: false,
    })
  })

  it('repairs an unknown icon key instead of discarding the config', () => {
    const tile = { ...DEFAULT_CONFIG.tiles[1], icon: 'dragon' }
    const result = parseEnvelope({
      config: { ...DEFAULT_CONFIG, tiles: [tile] },
      firstBoot: false,
    })
    expect(result.config.tiles[0].icon).toBe('globe')
    expect(result.config.tiles[0].name).toBe('Telefe')
  })

  it('rejects a foreign schema version', () => {
    const result = parseEnvelope({
      config: { ...DEFAULT_CONFIG, schemaVersion: 2 },
      firstBoot: false,
    })
    expect(result.config).toEqual(DEFAULT_CONFIG)
  })
})
