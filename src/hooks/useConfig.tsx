import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { DEFAULT_CONFIG, loadConfig, saveConfig, type Config } from '@/lib/config'

interface ConfigContextValue {
  config: Config
  /** True until the backend has answered `get_config`. */
  ready: boolean
  /** True only on the boot where no config file existed yet (opens Admin first). */
  firstBoot: boolean
  /** Applies a change and persists it. */
  update: (recipe: (current: Config) => Config) => void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

/**
 * Single owner of the in-memory config. Loads once, then persists every update
 * through `save_config`. A failed save is logged and the UI keeps the in-memory
 * value — the next successful save writes the whole file anyway.
 */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [ready, setReady] = useState(false)
  const [firstBoot, setFirstBoot] = useState(false)
  const dirty = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadConfig().match(
      (envelope) => {
        if (cancelled) return
        setConfig(envelope.config)
        setFirstBoot(envelope.firstBoot)
        setReady(true)
      },
      (error) => {
        console.error('config load failed, using defaults', error)
        if (!cancelled) setReady(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!dirty.current) return
    dirty.current = false
    saveConfig(config).mapErr((error) => console.error('config save failed', error))
  }, [config])

  const update = (recipe: (current: Config) => Config) => {
    dirty.current = true
    setConfig(recipe)
  }

  return (
    <ConfigContext.Provider value={{ config, ready, firstBoot, update }}>
      {children}
    </ConfigContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook + provider belong together
export function useConfig(): ConfigContextValue {
  const value = useContext(ConfigContext)
  if (!value) throw new Error('useConfig must be used inside <ConfigProvider>')
  return value
}
