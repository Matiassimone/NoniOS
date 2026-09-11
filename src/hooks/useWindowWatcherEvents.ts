import { useEffect } from 'react'

import { listen } from '@tauri-apps/api/event'

/** Event names emitted by `kiosk/window_watcher.rs`. */
const SHOWN_EVENT = 'external-app-shown'
const CLOSED_EVENT = 'external-app-closed'

/**
 * Subscribes to the window watcher's two events for as long as the component
 * is mounted. Handlers are read through a ref-free closure on purpose: the
 * caller passes stable dispatchers (a `useReducer` dispatch).
 */
export function useWindowWatcherEvents(onShown: () => void, onClosed: () => void) {
  useEffect(() => {
    const subscriptions = Promise.all([
      listen(SHOWN_EVENT, onShown),
      listen(CLOSED_EVENT, onClosed),
    ])
    return () => {
      subscriptions.then((unlisteners) => unlisteners.forEach((unlisten) => unlisten()))
    }
  }, [onShown, onClosed])
}
