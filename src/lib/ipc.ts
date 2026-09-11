import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen as tauriListen, type UnlistenFn } from '@tauri-apps/api/event'

/**
 * Tauri IPC behind a promise boundary. Outside the Tauri webview (a plain
 * browser during `pnpm dev`, jsdom) the Tauri API throws synchronously; these
 * wrappers turn that into a rejected promise / a no-op subscription so the UI
 * still renders with defaults instead of crashing in an effect.
 */
export function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      tauriInvoke<T>(command, args).then(resolve, reject)
    } catch (error) {
      reject(error)
    }
  })
}

export function listen(event: string, handler: () => void): Promise<UnlistenFn> {
  const noop: UnlistenFn = () => undefined
  try {
    return tauriListen(event, handler).catch(() => noop)
  } catch {
    return Promise.resolve(noop)
  }
}
