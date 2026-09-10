import { describe, expect, it } from 'vitest'

import { formatAnydeskId } from './anydesk'

describe('formatAnydeskId', () => {
  it('groups digits in threes from the left', () => {
    expect(formatAnydeskId('528914673')).toBe('528 914 673')
    expect(formatAnydeskId('1234567890')).toBe('123 456 789 0')
    expect(formatAnydeskId('528 914 673')).toBe('528 914 673')
  })
})
