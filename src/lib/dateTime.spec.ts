import { describe, expect, it } from 'vitest'

import { formatLongDate, greetingKey } from './dateTime'

describe('greetingKey', () => {
  it('splits the day at noon and 20:00', () => {
    expect(greetingKey(0)).toBe('home.greeting.morning')
    expect(greetingKey(11)).toBe('home.greeting.morning')
    expect(greetingKey(12)).toBe('home.greeting.afternoon')
    expect(greetingKey(19)).toBe('home.greeting.afternoon')
    expect(greetingKey(20)).toBe('home.greeting.evening')
  })
})

describe('formatLongDate', () => {
  const monday = new Date(2025, 6, 21, 15)
  it('writes the date out per locale with a capital first letter', () => {
    expect(formatLongDate(monday, 'es')).toBe('Lunes, 21 de julio')
    expect(formatLongDate(monday, 'en')).toBe('Monday, July 21')
  })
})
