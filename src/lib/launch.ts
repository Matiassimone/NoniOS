import { ResultAsync } from 'neverthrow'

import { invoke } from '@/lib/ipc'

/** Thin wrapper over the `launch_tile` command — the frontend never builds a launch itself. */
export function launchTile(tileId: string): ResultAsync<void, Error> {
  return ResultAsync.fromPromise(
    invoke<void>('launch_tile', { tileId }),
    (cause) => new Error(String(cause)),
  )
}

/** Closes the external web window / stops the watcher and re-asserts the kiosk window. */
export function returnHome(): ResultAsync<void, Error> {
  return ResultAsync.fromPromise(invoke<void>('return_home'), (cause) => new Error(String(cause)))
}
