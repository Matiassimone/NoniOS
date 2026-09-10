import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import type { Locale } from '@/lib/config'

/**
 * Open-Meteo client — free, no API key, CORS-enabled. Two calls: city search
 * (geocoding, done once from Admin) and the current temperature (from Home,
 * using the coordinates saved in the config so Home never depends on the
 * geocoder being up).
 */

export class WeatherError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WeatherError'
  }
}

export interface CityResult {
  city: string
  lat: number
  lon: number
}

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
})

const forecastSchema = z.object({
  current: z.object({ temperature_2m: z.number() }),
})

/** Pure: turns a geocoding payload into display-ready results. */
export function parseCityResults(payload: unknown): CityResult[] {
  const parsed = geocodingSchema.safeParse(payload)
  if (!parsed.success || !parsed.data.results) return []
  return parsed.data.results.map((row) => ({
    city: [row.name, row.admin1, row.country].filter(Boolean).join(', '),
    lat: row.latitude,
    lon: row.longitude,
  }))
}

/** Pure: rounds the current temperature to whole degrees, or null if malformed. */
export function parseTemperature(payload: unknown): number | null {
  const parsed = forecastSchema.safeParse(payload)
  return parsed.success ? Math.round(parsed.data.current.temperature_2m) : null
}

function getJson(url: string): ResultAsync<unknown, WeatherError> {
  return ResultAsync.fromPromise(
    fetch(url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<unknown>
    }),
    (cause) => new WeatherError(String(cause)),
  )
}

export function searchCity(query: string, locale: Locale): ResultAsync<CityResult[], WeatherError> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', locale)
  url.searchParams.set('format', 'json')
  return getJson(url.toString()).map(parseCityResults)
}

export function fetchTemperature(lat: number, lon: number): ResultAsync<number, WeatherError> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', 'temperature_2m')
  return getJson(url.toString()).andThen((payload) => {
    const temperature = parseTemperature(payload)
    return temperature === null
      ? ResultAsync.fromPromise(
          Promise.reject(new WeatherError('malformed forecast')),
          (cause) => cause as WeatherError,
        )
      : ResultAsync.fromSafePromise(Promise.resolve(temperature))
  })
}
