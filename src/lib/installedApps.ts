import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { invoke } from '@/lib/ipc'

export const installedAppSchema = z.object({ name: z.string(), appId: z.string() })
export type InstalledApp = z.infer<typeof installedAppSchema>

export class InstalledAppsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InstalledAppsError'
  }
}

/** Start menu apps as reported by `installed_apps.rs`, already sorted by name. */
export function listInstalledApps(): ResultAsync<InstalledApp[], InstalledAppsError> {
  return ResultAsync.fromPromise(
    invoke<unknown>('list_installed_apps'),
    (cause) => new InstalledAppsError(String(cause)),
  ).andThen((payload) => {
    const parsed = z.array(installedAppSchema).safeParse(payload)
    return parsed.success
      ? ResultAsync.fromSafePromise(Promise.resolve(parsed.data))
      : ResultAsync.fromPromise(
          Promise.reject(new InstalledAppsError('malformed app list')),
          (cause) => cause as InstalledAppsError,
        )
  })
}

/**
 * Best match for a tile name among the installed apps (used by "Re-detect" and
 * the first-boot Netflix detection). Exact name first, then a name that starts
 * with it, then an AppID containing it — all case-insensitive.
 */
export function findInstalledApp(apps: InstalledApp[], name: string): InstalledApp | null {
  const needle = name.trim().toLowerCase()
  if (!needle) return null
  const lower = apps.map((app) => ({
    app,
    name: app.name.toLowerCase(),
    id: app.appId.toLowerCase(),
  }))
  return (
    lower.find((entry) => entry.name === needle)?.app ??
    lower.find((entry) => entry.name.startsWith(needle))?.app ??
    lower.find((entry) => entry.id.includes(needle))?.app ??
    null
  )
}

/** Case-insensitive substring filter for the picker's search field. */
export function filterInstalledApps(apps: InstalledApp[], query: string): InstalledApp[] {
  const needle = query.trim().toLowerCase()
  return needle ? apps.filter((app) => app.name.toLowerCase().includes(needle)) : apps
}
