import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => '/nowhere' },
  WebContentsView: class {},
  shell: {},
  net: {},
  session: {},
  safeStorage: {},
}))

const { buildAuthorizeUrl, pkce } = await import('../src/main/oauth')
const { isPublishableKey } = await import('../src/main/config')

describe('the authorize request', () => {
  it('is PKCE with S256, a state and the loopback redirect', () => {
    const url = new URL(buildAuthorizeUrl({ prompt: 'select_tone' }, 'the-challenge', 'the-state', 't3k_pub_testkey123'))
    expect(url.origin + url.pathname).toBe('https://www.tone3000.com/api/v1/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 't3k_pub_testkey123',
      redirect_uri: 'http://127.0.0.1:38300/callback',
      response_type: 'code',
      code_challenge: 'the-challenge',
      code_challenge_method: 'S256',
      state: 'the-state',
      prompt: 'select_tone',
      // The catalog scoped to what the HX Stomp can load.
      format: 'nam',
      architecture: '2',
      menubar: 'true',
      preview: 'true',
    })
  })

  it('names the tone to check in the Load Tone flow', () => {
    const p = new URL(buildAuthorizeUrl({ prompt: 'load_tone', toneId: 42 }, 'c', 's', 't3k_pub_testkey123')).searchParams
    expect(p.get('prompt')).toBe('load_tone')
    expect(p.get('tone_id')).toBe('42')
    expect(p.has('preview')).toBe(false)
  })

  it('makes a fresh verifier, its SHA-256 challenge and a state each time', () => {
    const a = pkce()
    const b = pkce()
    expect(a.codeVerifier).not.toBe(b.codeVerifier)
    expect(a.state).not.toBe(b.state)
    expect(a.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a.codeChallenge).toBe(createHash('sha256').update(a.codeVerifier).digest('base64url'))
  })
})

describe('the publishable key', () => {
  it('is told apart from a secret key', () => {
    expect(isPublishableKey('t3k_pub_abcDEF123456')).toBe(true)
    expect(isPublishableKey('t3k_cs_abcDEF123456')).toBe(false)
    expect(isPublishableKey('t3k_pub_')).toBe(false)
    expect(isPublishableKey('')).toBe(false)
  })
})
