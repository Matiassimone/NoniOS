/* eslint-disable react-refresh/only-export-components -- provider, hook and pure lookup belong together */
import { createContext, useContext, type ReactNode } from 'react'

import type { Locale } from '@/lib/config'

import { en } from './en'
import { es, type TranslationKey } from './es'

export type { TranslationKey }

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { es, en }

export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

/**
 * Pure lookup + `{placeholder}` interpolation. Exported so it can be unit tested
 * and used outside React (none today; kept trivially small on purpose).
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const template = DICTIONARIES[locale][key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

interface TranslationContextValue {
  locale: Locale
  t: TranslateFn
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

export function TranslationProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t: TranslateFn = (key, vars) => translate(locale, key, vars)
  return <TranslationContext.Provider value={{ locale, t }}>{children}</TranslationContext.Provider>
}

export function useTranslation(): TranslationContextValue {
  const value = useContext(TranslationContext)
  if (!value) throw new Error('useTranslation must be used inside <TranslationProvider>')
  return value
}
