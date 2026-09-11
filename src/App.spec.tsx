import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_CONFIG } from '@/lib/config'

import App from './App'

// Tauri IPC is not available under jsdom: stand in for the commands and the
// event bus so the whole tree (providers, Home, Admin) can render and be driven.
const listeners = new Map<string, () => void>()
let envelope = { config: DEFAULT_CONFIG, firstBoot: false }

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((command: string) => {
    if (command === 'get_config') return Promise.resolve(envelope)
    if (command === 'list_installed_apps') return Promise.resolve([])
    if (command === 'get_anydesk_id') return Promise.resolve(null)
    return Promise.resolve(undefined)
  }),
}))
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((name: string, handler: () => void) => {
    listeners.set(name, handler)
    return Promise.resolve(() => listeners.delete(name))
  }),
}))
vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.reject(new Error('offline in tests'))),
)

let container: HTMLDivElement
let root: Root

async function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<App />)
  })
  await act(async () => {})
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  listeners.clear()
})

describe('App', () => {
  it('renders Home with the seeded tiles once the config has loaded', async () => {
    envelope = { config: DEFAULT_CONFIG, firstBoot: false }
    await render()
    expect(container.textContent).toContain('Netflix')
    expect(container.textContent).toContain('Telefe')
    expect(container.textContent).not.toContain('General settings')
  })

  it('opens Admin first on first boot and F4 toggles back to Home', async () => {
    envelope = { config: DEFAULT_CONFIG, firstBoot: true }
    await render()
    expect(container.textContent).toContain('General settings')
    expect(container.textContent).toContain('First time here')
    await act(async () => listeners.get('admin-hotkey')?.())
    expect(container.textContent).toContain('Netflix')
    expect(container.textContent).not.toContain('General settings')
  })

  it('renders the Spanish voice when the locale is es', async () => {
    envelope = {
      config: { ...DEFAULT_CONFIG, user: { name: 'Noni', locale: 'es' } },
      firstBoot: true,
    }
    await render()
    expect(container.textContent).toContain('Configuración general')
    expect(container.textContent).toContain('Volver a Home')
  })
})
