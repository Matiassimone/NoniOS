import { invoke } from '@tauri-apps/api/core'
import { ResultAsync } from 'neverthrow'

/** The machine's AnyDesk ID (digits only) or null when AnyDesk isn't installed. */
export function getAnydeskId(): ResultAsync<string | null, Error> {
  return ResultAsync.fromPromise(
    invoke<unknown>('get_anydesk_id'),
    (cause) => new Error(String(cause)),
  ).map((value) => (typeof value === 'string' && value.length > 0 ? value : null))
}

/** `528914673` → `528 914 673`, the way AnyDesk itself displays IDs. */
export function formatAnydeskId(id: string): string {
  const digits = id.replace(/\D/g, '')
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ')
}
