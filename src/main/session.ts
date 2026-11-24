// Who is signed in to TONE3000, as far as the app knows.

import { session } from 'electron'
import type { User } from '@shared/types'
import { MOCK, T3K_PARTITION } from './config'
import { AppError } from './errors'
import { mockSession } from './mock'
import { backend } from './t3k'
import { tokenStore } from './tokenStore'

let user: User | null = null

export function isConnected(): boolean {
  return MOCK ? mockSession.connected : tokenStore.get() !== null
}

export function currentUser(): User | null {
  return isConnected() ? user : null
}

/** Loads the signed-in user once. A session TONE3000 no longer accepts ends here. */
export async function loadUser(): Promise<User | null> {
  if (!isConnected()) {
    user = null
    return null
  }
  if (user) return user
  try {
    user = await backend().user()
  } catch (err) {
    // Offline or a server error: stay connected, the name just is not known yet.
    if (!(err instanceof AppError) || err.code !== 'session_expired') console.warn('The TONE3000 user could not be loaded.', err)
    user = null
  }
  return user
}

/** Forgets the tokens and the TONE3000 web session of the embedded view. */
export async function signOut(): Promise<void> {
  user = null
  if (MOCK) {
    mockSession.connected = false
    return
  }
  await tokenStore.clear()
  await session.fromPartition(T3K_PARTITION).clearStorageData()
}
