import type { Tile } from '@/lib/config'

/**
 * Home's four-state machine (CLAUDE.md -> Screens -> Home). Pure and
 * event-driven: the `launching -> inApp` and `inApp -> returning` steps come
 * from `kiosk/window_watcher.rs` events, never from timers. The only timer is
 * the short `returning` beat, which the component owns.
 */
export const HomeView = {
  HOME: 'home',
  LAUNCHING: 'launching',
  IN_APP: 'inApp',
  RETURNING: 'returning',
} as const
export type HomeView = (typeof HomeView)[keyof typeof HomeView]

export interface HomeState {
  view: HomeView
  /** The tile being launched / in front; null only in `home`. */
  active: Tile | null
}

export type HomeEvent =
  | { type: 'tap'; tile: Tile }
  | { type: 'shown' }
  | { type: 'closed' }
  | { type: 'launchFailed' }
  | { type: 'returnDone' }

export const INITIAL_HOME_STATE: HomeState = { view: HomeView.HOME, active: null }

export function homeReducer(state: HomeState, event: HomeEvent): HomeState {
  switch (state.view) {
    case HomeView.HOME:
      return event.type === 'tap' ? { view: HomeView.LAUNCHING, active: event.tile } : state
    case HomeView.LAUNCHING:
      if (event.type === 'shown') return { ...state, view: HomeView.IN_APP }
      if (event.type === 'closed' || event.type === 'launchFailed') {
        return { ...state, view: HomeView.RETURNING }
      }
      return state
    case HomeView.IN_APP:
      return event.type === 'closed' ? { ...state, view: HomeView.RETURNING } : state
    case HomeView.RETURNING:
      return event.type === 'returnDone' ? INITIAL_HOME_STATE : state
  }
}
