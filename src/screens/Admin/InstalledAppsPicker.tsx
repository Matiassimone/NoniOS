import { useEffect, useState } from 'react'

import { Search } from 'lucide-react'

import { NoniInput } from '@/components/NoniInput'
import { useTranslation } from '@/i18n/useTranslation'
import { filterInstalledApps, listInstalledApps, type InstalledApp } from '@/lib/installedApps'

const Status = { LOADING: 'loading', READY: 'ready', FAILED: 'failed' } as const
type Status = (typeof Status)[keyof typeof Status]

/**
 * Step B (app) of the add-tile flow: search field + the Start menu apps
 * detected by `installed_apps.rs`. One click picks an app.
 */
export function InstalledAppsPicker({ onPick }: { onPick: (app: InstalledApp) => void }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>(Status.LOADING)
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    listInstalledApps().match(
      (list) => {
        if (cancelled) return
        setApps(list)
        setStatus(Status.READY)
      },
      () => {
        if (!cancelled) setStatus(Status.FAILED)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const visible = filterInstalledApps(apps, query)
  const message =
    status === Status.LOADING
      ? t('admin.tiles.addModal.appsLoading')
      : status === Status.FAILED || apps.length === 0
        ? t('admin.tiles.addModal.appsUnavailable')
        : visible.length === 0
          ? t('admin.tiles.addModal.appsEmpty')
          : null

  return (
    <div className="flex flex-col gap-4">
      <NoniInput
        leadingIcon={<Search />}
        placeholder={t('admin.tiles.addModal.searchApps')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoFocus
      />
      <div className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto">
        {message ? (
          <p className="px-3.5 py-6 text-center text-sm text-muted">{message}</p>
        ) : (
          visible.map((app) => (
            <button
              key={app.appId}
              type="button"
              onClick={() => onPick(app)}
              className="flex items-center gap-3.5 rounded-[11px] px-3.5 py-3 text-left transition-colors hover:bg-tint"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-tint2 font-mono text-sm text-ink2">
                {app.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-[15px] font-medium text-ink">{app.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
