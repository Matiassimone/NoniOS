import { describe, expect, it } from 'vitest'

import { DEFAULT_CONFIG } from '@/lib/config'

import { HomeView, INITIAL_HOME_STATE, homeReducer, type HomeState } from './homeMachine'

const tile = DEFAULT_CONFIG.tiles[1]
const run = (events: Parameters<typeof homeReducer>[1][], from: HomeState = INITIAL_HOME_STATE) =>
  events.reduce(homeReducer, from)

describe('homeReducer', () => {
  it('walks the happy path home -> launching -> inApp -> returning -> home', () => {
    expect(run([{ type: 'tap', tile }])).toEqual({ view: HomeView.LAUNCHING, active: tile })
    expect(run([{ type: 'tap', tile }, { type: 'shown' }]).view).toBe(HomeView.IN_APP)
    expect(run([{ type: 'tap', tile }, { type: 'shown' }, { type: 'closed' }]).view).toBe(
      HomeView.RETURNING,
    )
    expect(
      run([{ type: 'tap', tile }, { type: 'shown' }, { type: 'closed' }, { type: 'returnDone' }]),
    ).toEqual(INITIAL_HOME_STATE)
  })

  it('returns home (never an error) when the launch fails or the app never shows', () => {
    expect(run([{ type: 'tap', tile }, { type: 'launchFailed' }]).view).toBe(HomeView.RETURNING)
    expect(run([{ type: 'tap', tile }, { type: 'closed' }]).view).toBe(HomeView.RETURNING)
  })

  it('ignores a second tap while busy and stray events at rest', () => {
    const launching = run([{ type: 'tap', tile }])
    expect(homeReducer(launching, { type: 'tap', tile: DEFAULT_CONFIG.tiles[0] })).toBe(launching)
    expect(homeReducer(INITIAL_HOME_STATE, { type: 'closed' })).toBe(INITIAL_HOME_STATE)
    expect(homeReducer(INITIAL_HOME_STATE, { type: 'shown' })).toBe(INITIAL_HOME_STATE)
  })
})
