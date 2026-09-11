import { describe, expect, it } from 'vitest'

import { en } from './en'
import { es } from './es'
import { translate } from './useTranslation'

describe('i18n dictionaries', () => {
  it('es and en expose exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  it('no value is empty', () => {
    for (const dictionary of [es, en]) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), key).not.toBe('')
      }
    }
  })

  it('every placeholder in es exists in en and vice versa', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort()
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(es[key]))
    }
  })
})

describe('translate', () => {
  it('interpolates variables and leaves unknown placeholders visible', () => {
    expect(translate('es', 'home.launching', { app: 'Netflix' })).toBe('Abriendo Netflix…')
    expect(translate('en', 'admin.tiles.subtitle', { name: 'Noni' })).toBe(
      'The cards Noni sees on the home screen.',
    )
    expect(translate('en', 'admin.tiles.subtitle')).toBe(
      'The cards {name} sees on the home screen.',
    )
  })
})
