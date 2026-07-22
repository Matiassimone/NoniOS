import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

// Scaffold smoke test: proves Vitest + the `@` alias + TS resolve end to end,
// and that cn() actually resolves conflicting Tailwind utilities.
describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('lets the last conflicting Tailwind utility win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
  })
})
