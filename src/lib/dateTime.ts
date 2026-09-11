import type { TranslationKey } from '@/i18n/useTranslation'
import { Locale, type Locale as LocaleType } from '@/lib/config'

/** Greeting key for an hour of the day (DESIGN.md: <12 morning, <20 afternoon). */
export function greetingKey(hour: number): TranslationKey {
  if (hour < 12) return 'home.greeting.morning'
  if (hour < 20) return 'home.greeting.afternoon'
  return 'home.greeting.evening'
}

/** "Lunes, 21 de julio" / "Monday, July 21" — written out, first letter capitalised. */
export function formatLongDate(date: Date, locale: LocaleType): string {
  const text = new Intl.DateTimeFormat(locale === Locale.ES ? 'es-AR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
