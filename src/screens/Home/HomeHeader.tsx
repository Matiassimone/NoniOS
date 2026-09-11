import { useEffect, useState } from 'react'

import { Sun } from 'lucide-react'

import { useConfig } from '@/hooks/useConfig'
import { useTranslation } from '@/i18n/useTranslation'
import { formatLongDate, greetingKey } from '@/lib/dateTime'
import { fetchTemperature } from '@/lib/weather'

/** Refresh the temperature this often while Home is mounted. */
const WEATHER_REFRESH_MS = 30 * 60 * 1000

/** Greeting + name, the date, and the weather chip (DESIGN.md -> Home -> Header). */
export function HomeHeader({ now }: { now: Date }) {
  const { t, locale } = useTranslation()
  const { config } = useConfig()
  const temperature = useTemperature(config.weather?.lat, config.weather?.lon)
  const greeting = t(greetingKey(now.getHours()))
  const name = config.user.name.trim()

  return (
    <header className="flex items-start justify-between gap-8 px-24 pt-16">
      <div className="flex flex-col gap-2.5">
        <div className="text-[64px] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap text-ink">
          {name ? `${greeting}, ${name}` : greeting}
        </div>
        <div className="text-[32px] whitespace-nowrap text-ink2">{formatLongDate(now, locale)}</div>
      </div>
      {temperature !== null && (
        <div className="flex items-center gap-[22px] rounded-[22px] border border-border bg-surface px-8 py-[22px]">
          <Sun className="size-[52px] fill-[#d9a441] text-[#d9a441]" strokeWidth={1.7} />
          <span className="text-[52px] leading-none font-semibold text-ink">{temperature}°</span>
        </div>
      )}
    </header>
  )
}

function useTemperature(lat: number | undefined, lon: number | undefined): number | null {
  const [temperature, setTemperature] = useState<number | null>(null)
  useEffect(() => {
    if (lat === undefined || lon === undefined) return
    let cancelled = false
    const refresh = () => {
      fetchTemperature(lat, lon).match(
        (value) => {
          if (!cancelled) setTemperature(value)
        },
        () => undefined,
      )
    }
    refresh()
    const timer = window.setInterval(refresh, WEATHER_REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [lat, lon])
  return lat === undefined || lon === undefined ? null : temperature
}
