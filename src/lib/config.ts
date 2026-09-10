import { invoke } from '@tauri-apps/api/core'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

/** Bundled glyph library keys (DESIGN.md -> Icon glyph library). */
export const ICON_KEYS = [
  'play',
  'tv',
  'photos',
  'phone',
  'video',
  'music',
  'globe',
  'book',
  'heart',
  'weather',
] as const
export type IconKey = (typeof ICON_KEYS)[number]

export const Locale = { ES: 'es', EN: 'en' } as const
export type Locale = (typeof Locale)[keyof typeof Locale]

export const TileKind = { APP: 'app', WEB: 'web' } as const
export type TileKind = (typeof TileKind)[keyof typeof TileKind]

export const TargetKind = { AUMID: 'aumid', EXE: 'exe', URL: 'url' } as const
export type TargetKind = (typeof TargetKind)[keyof typeof TargetKind]

export const tileSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: z.enum([TileKind.APP, TileKind.WEB]),
  // An unknown icon key must not invalidate the whole config — fall back to a glyph.
  icon: z.enum(ICON_KEYS).catch('globe'),
  target: z.string(),
  targetKind: z.enum([TargetKind.AUMID, TargetKind.EXE, TargetKind.URL]),
})
export type Tile = z.infer<typeof tileSchema>

export const configSchema = z.object({
  schemaVersion: z.literal(1),
  user: z.object({
    name: z.string(),
    locale: z.enum([Locale.ES, Locale.EN]),
  }),
  autostart: z.boolean(),
  weather: z.object({ city: z.string(), lat: z.number(), lon: z.number() }).nullable(),
  tiles: z.array(tileSchema),
  anydeskId: z.string().nullable(),
})
export type Config = z.infer<typeof configSchema>

const envelopeSchema = z.object({ config: configSchema, firstBoot: z.boolean() })
export type ConfigEnvelope = z.infer<typeof envelopeSchema>

/**
 * Mirror of the Rust `Config::default()` seed — used when the IPC payload fails
 * validation so the UI always has something safe to render.
 */
export const DEFAULT_CONFIG: Config = {
  schemaVersion: 1,
  user: { name: '', locale: Locale.EN },
  autostart: true,
  weather: null,
  tiles: [
    {
      id: 'netflix',
      name: 'Netflix',
      kind: TileKind.APP,
      icon: 'play',
      target: '',
      targetKind: TargetKind.AUMID,
    },
    {
      id: 'telefe',
      name: 'Telefe',
      kind: TileKind.WEB,
      icon: 'tv',
      target: 'https://www.mitelefe.com/telefe-en-vivo',
      targetKind: TargetKind.URL,
    },
  ],
  anydeskId: null,
}

/**
 * Validates whatever the backend returned. Anything malformed becomes the seed
 * config with `firstBoot: false` — never a crash, never a blank Home
 * (CLAUDE.md -> Architecture Rule 4).
 */
export function parseEnvelope(payload: unknown): ConfigEnvelope {
  const parsed = envelopeSchema.safeParse(payload)
  return parsed.success ? parsed.data : { config: DEFAULT_CONFIG, firstBoot: false }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

const toConfigError = (cause: unknown) => new ConfigError(String(cause))

export function loadConfig(): ResultAsync<ConfigEnvelope, ConfigError> {
  return ResultAsync.fromPromise(invoke<unknown>('get_config'), toConfigError).map(parseEnvelope)
}

export function saveConfig(config: Config): ResultAsync<void, ConfigError> {
  return ResultAsync.fromPromise(invoke<void>('save_config', { config }), toConfigError)
}

export function setAutostart(enabled: boolean): ResultAsync<void, ConfigError> {
  return ResultAsync.fromPromise(invoke<void>('set_autostart', { enabled }), toConfigError)
}
