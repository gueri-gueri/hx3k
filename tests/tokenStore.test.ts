import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The saved TONE3000 session, with a stand-in for the OS keystore.

const work = mkdtempSync(join(tmpdir(), 'hx3k-tokens-'))
const file = join(work, 'tone3000-session.bin')

const keystore = vi.hoisted(() => ({ available: true, reEncrypt: false, calls: [] as string[] }))

vi.mock('electron', () => ({
  app: { isPackaged: true, getPath: () => work },
  safeStorage: {
    isAsyncEncryptionAvailable: async () => keystore.available,
    encryptStringAsync: async (text: string) => {
      keystore.calls.push('encrypt')
      return Buffer.from(`sealed:${text}`)
    },
    decryptStringAsync: async (data: Buffer) => {
      keystore.calls.push('decrypt')
      const text = data.toString()
      if (!text.startsWith('sealed:')) throw new Error('not ours')
      return { result: text.slice(7), shouldReEncrypt: keystore.reEncrypt }
    },
    // The deprecated synchronous calls must not be used at all.
    isEncryptionAvailable: () => {
      throw new Error('deprecated call')
    },
    encryptString: () => {
      throw new Error('deprecated call')
    },
    decryptString: () => {
      throw new Error('deprecated call')
    },
  },
}))

const tokens = { access_token: 'a', refresh_token: 'r', expires_at: 123 }

/** A token store that has not read anything yet, as at start-up. */
async function freshStore(): Promise<(typeof import('../src/main/tokenStore'))['tokenStore']> {
  vi.resetModules()
  return (await import('../src/main/tokenStore')).tokenStore
}

beforeEach(() => {
  rmSync(file, { force: true })
  keystore.available = true
  keystore.reEncrypt = false
  keystore.calls = []
})

afterAll(() => rmSync(work, { recursive: true, force: true }))

describe('the saved session', () => {
  it('is empty when nothing was saved', async () => {
    const store = await freshStore()
    await store.ready()
    expect(store.get()).toBeNull()
  })

  it('is written sealed, never in the clear, and read back at the next start', async () => {
    const store = await freshStore()
    await store.ready()
    await store.set(tokens)
    expect(store.get()).toEqual(tokens)
    expect(readFileSync(file, 'utf8')).toBe(`sealed:${JSON.stringify(tokens)}`)

    const next = await freshStore()
    expect(next.get()).toBeNull() // not read yet
    await next.ready()
    expect(next.get()).toEqual(tokens)
  })

  it('is forgotten on clear, on disk too', async () => {
    const store = await freshStore()
    await store.ready()
    void store.set(tokens)
    await store.clear() // queued behind the write: the clear wins
    expect(store.get()).toBeNull()
    expect(existsSync(file)).toBe(false)
  })

  it('stays in memory only where there is no keystore', async () => {
    keystore.available = false
    const store = await freshStore()
    await store.ready()
    await store.set(tokens)
    expect(store.get()).toEqual(tokens)
    expect(existsSync(file)).toBe(false)
  })

  it('ignores a file it cannot decrypt or that holds something else', async () => {
    writeFileSync(file, 'garbage')
    let store = await freshStore()
    await store.ready()
    expect(store.get()).toBeNull()

    writeFileSync(file, 'sealed:{"access_token":1}')
    store = await freshStore()
    await store.ready()
    expect(store.get()).toBeNull()
  })

  it('saves again when the keystore says its key was rotated', async () => {
    writeFileSync(file, `sealed:${JSON.stringify(tokens)}`)
    keystore.reEncrypt = true
    const store = await freshStore()
    await store.ready()
    expect(store.get()).toEqual(tokens)
    await store.set(tokens) // waits for the queued re-save too
    expect(keystore.calls.filter((c) => c === 'encrypt').length).toBeGreaterThanOrEqual(2)
  })

  it('does not bring an old session back over a newer one', async () => {
    writeFileSync(file, `sealed:${JSON.stringify(tokens)}`)
    const store = await freshStore()
    const loading = store.ready()
    const newer = { ...tokens, access_token: 'newer' }
    void store.set(newer)
    await loading
    expect(store.get()).toEqual(newer)
  })

  it('reads the keystore once, however often it is asked', async () => {
    writeFileSync(file, `sealed:${JSON.stringify(tokens)}`)
    const store = await freshStore()
    await Promise.all([store.ready(), store.ready(), store.ready()])
    expect(keystore.calls).toEqual(['decrypt'])
  })
})
