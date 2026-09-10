import { useEffect, useState } from 'react'

import { Search } from 'lucide-react'

import { NoniCard } from '@/components/NoniCard'
import { NoniField } from '@/components/NoniField'
import { NoniInput } from '@/components/NoniInput'
import { NoniSwitch } from '@/components/NoniSwitch'
import { useConfig } from '@/hooks/useConfig'
import { useTranslation } from '@/i18n/useTranslation'
import { Locale, setAutostart } from '@/lib/config'
import { cn } from '@/lib/utils'
import { searchCity, type CityResult } from '@/lib/weather'

const SEARCH_DEBOUNCE_MS = 400

/**
 * Admin -> General: name, language, weather location, autostart (DESIGN.md ->
 * Admin -> General; CLAUDE.md adds the autostart toggle).
 */
export function GeneralSection() {
  const { t, locale } = useTranslation()
  const { config, update } = useConfig()
  const name = config.user.name || 'Noni'

  return (
    <div>
      <h1 className="mb-1.5 text-[34px] font-semibold tracking-tight text-ink">
        {t('admin.general.title')}
      </h1>
      <p className="mb-10 text-[15px] text-ink2">{t('admin.general.subtitle')}</p>

      <NoniCard className="flex flex-col gap-8">
        <NoniField
          label={t('admin.general.nameLabel')}
          hint={t('admin.general.nameHint', { name })}
        >
          <NoniInput
            className="max-w-[360px]"
            value={config.user.name}
            placeholder={t('admin.general.namePlaceholder')}
            onChange={(event) =>
              update((current) => ({
                ...current,
                user: { ...current.user, name: event.target.value },
              }))
            }
          />
        </NoniField>

        <Divider />

        <NoniField label={t('admin.general.languageLabel')}>
          <div className="inline-flex w-max rounded-[11px] border border-border bg-tint p-1">
            {(
              [
                [Locale.ES, 'Español'],
                [Locale.EN, 'English'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={locale === value}
                onClick={() =>
                  update((current) => ({ ...current, user: { ...current.user, locale: value } }))
                }
                className={cn(
                  'rounded-lg px-[26px] py-2.5 text-sm font-semibold transition-colors',
                  locale === value ? 'bg-surface text-ink' : 'text-muted hover:text-ink2',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </NoniField>

        <Divider />

        <NoniField label={t('admin.general.weatherLabel')} hint={t('admin.general.weatherHint')}>
          <WeatherLocationPicker />
        </NoniField>

        <Divider />

        <AutostartToggle />
      </NoniCard>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border-soft" />
}

function WeatherLocationPicker() {
  const { t, locale } = useTranslation()
  const { config, update } = useConfig()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  // Results are tagged with the query that produced them, so stale answers and
  // a cleared field are ignored without any state reset inside the effect.
  const [found, setFound] = useState<{ query: string; results: CityResult[] } | null>(null)
  const needle = query.trim()
  const active = needle.length >= 2
  const results = found && found.query === needle ? found.results : null

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setSearching(true)
      searchCity(needle, locale).match(
        (list) => {
          if (cancelled) return
          setFound({ query: needle, results: list })
          setSearching(false)
        },
        () => {
          if (cancelled) return
          setFound({ query: needle, results: [] })
          setSearching(false)
        },
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [needle, active, locale])

  const pick = (city: CityResult) => {
    update((current) => ({ ...current, weather: city }))
    setQuery('')
  }

  return (
    <div className="flex max-w-[420px] flex-col gap-2">
      <NoniInput
        leadingIcon={<Search />}
        value={query}
        placeholder={config.weather?.city ?? t('admin.general.weatherPlaceholder')}
        onChange={(event) => setQuery(event.target.value)}
      />
      {active && searching && (
        <span className="text-[13px] text-muted">{t('admin.general.weatherSearching')}</span>
      )}
      {active && !searching && results?.length === 0 && (
        <span className="text-[13px] text-muted">{t('admin.general.weatherNoResults')}</span>
      )}
      {active && results && results.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-[11px] border border-border bg-surface">
          {results.map((city) => (
            <li key={`${city.lat},${city.lon}`}>
              <button
                type="button"
                onClick={() => pick(city)}
                className="w-full px-3.5 py-2.5 text-left text-sm text-ink transition-colors hover:bg-tint"
              >
                {city.city}
              </button>
            </li>
          ))}
        </ul>
      )}
      <span className="text-[13px] text-ink2">
        {config.weather
          ? t('admin.general.weatherCurrent', { city: config.weather.city })
          : t('admin.general.weatherNone')}
      </span>
    </div>
  )
}

function AutostartToggle() {
  const { t } = useTranslation()
  const { config, update } = useConfig()
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const name = config.user.name || 'Noni'

  const toggle = (enabled: boolean) => {
    setBusy(true)
    setError(false)
    setAutostart(enabled).match(
      () => {
        update((current) => ({ ...current, autostart: enabled }))
        setBusy(false)
      },
      () => {
        setError(true)
        setBusy(false)
      },
    )
  }

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">{t('admin.general.autostartLabel')}</span>
        <span className="text-[13px] text-muted">{t('admin.general.autostartHint', { name })}</span>
        {error && (
          <span className="text-[13px] text-danger">{t('admin.general.autostartError')}</span>
        )}
      </div>
      <NoniSwitch checked={config.autostart} disabled={busy} onCheckedChange={toggle} />
    </div>
  )
}
