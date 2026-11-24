import { app, safeStorage } from 'electron'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MOCK } from './config'

export interface Tokens {
  access_token: string
  refresh_token: string
  /** ms since the epoch */
  expires_at: number
}

// Encrypted with the OS keystore (Keychain, DPAPI, libsecret). Where there is
// none, the tokens stay in memory for the session and are never written in the clear.
//
// The keystore is asynchronous (the synchronous safeStorage calls are deprecated),
// so the saved session is read once by ready(); after that get() answers from
// memory, and set() and clear() write behind it, one after the other.
const file = (): string => join(app.getPath('userData'), 'tone3000-session.bin')

let cached: Tokens | null = null
/** set() or clear() ran: a load still in flight must not bring the old session back. */
let touched = false
let loading: Promise<void> | null = null
let writes: Promise<void> = Promise.resolve()

function valid(t: unknown): t is Tokens {
  const x = t as Tokens
  return !!x && typeof x.access_token === 'string' && typeof x.refresh_token === 'string' && typeof x.expires_at === 'number'
}

async function persist(tokens: Tokens): Promise<void> {
  try {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) return
    await writeFile(file(), await safeStorage.encryptStringAsync(JSON.stringify(tokens)), { mode: 0o600 })
  } catch (err) {
    console.warn('The TONE3000 session could not be saved; it lasts until the app quits.', err)
  }
}

/** Runs `work` after every write before it, so a clear() after a set() wins. */
function queue(work: () => Promise<void>): Promise<void> {
  writes = writes.then(work, work)
  return writes
}

async function load(): Promise<void> {
  // Sample mode never has a real session, and has no business in the keystore.
  if (MOCK) return
  try {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) return
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(await readFile(file()))
    const parsed: unknown = JSON.parse(result)
    if (!valid(parsed) || touched) return
    cached = parsed
    // The keystore's key was rotated: save again under the new one.
    if (shouldReEncrypt) void queue(() => persist(parsed))
  } catch {
    /* no session saved, or one this machine can no longer decrypt */
  }
}

export const tokenStore = {
  /** Reads the saved session, once. Await it (after the app is ready) before the first get(). */
  ready(): Promise<void> {
    return (loading ??= load())
  },

  get(): Tokens | null {
    return cached
  },

  /** Resolves when the tokens are on disk (or could not be saved). */
  set(tokens: Tokens): Promise<void> {
    touched = true
    cached = tokens
    return queue(() => persist(tokens))
  },

  clear(): Promise<void> {
    touched = true
    cached = null
    return queue(() => rm(file(), { force: true }))
  },
}
