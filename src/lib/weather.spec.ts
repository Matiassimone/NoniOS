import { describe, expect, it } from 'vitest'

import { parseCityResults, parseTemperature } from './weather'

describe('parseCityResults', () => {
  it('joins name, region and country and keeps coordinates', () => {
    const payload = {
      results: [
        { name: 'Buenos Aires', latitude: -34.6, longitude: -58.4, country: 'Argentina' },
        {
          name: 'Córdoba',
          latitude: -31.4,
          longitude: -64.2,
          admin1: 'Córdoba',
          country: 'Argentina',
        },
      ],
    }
    expect(parseCityResults(payload)).toEqual([
      { city: 'Buenos Aires, Argentina', lat: -34.6, lon: -58.4 },
      { city: 'Córdoba, Córdoba, Argentina', lat: -31.4, lon: -64.2 },
    ])
  })
  it('returns an empty list when there are no results or the shape is wrong', () => {
    expect(parseCityResults({})).toEqual([])
    expect(parseCityResults({ results: 'no' })).toEqual([])
    expect(parseCityResults(null)).toEqual([])
  })
})

describe('parseTemperature', () => {
  it('rounds to whole degrees', () => {
    expect(parseTemperature({ current: { temperature_2m: 21.6 } })).toBe(22)
    expect(parseTemperature({ current: { temperature_2m: -0.4 } })).toBe(-0)
  })
  it('rejects malformed payloads', () => {
    expect(parseTemperature({ current: {} })).toBeNull()
    expect(parseTemperature(undefined)).toBeNull()
  })
})
