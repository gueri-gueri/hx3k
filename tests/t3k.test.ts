import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Model } from '../src/shared/types'

// The TONE3000 client against a fake network: what it asks for, with which
// token, and what it does when the token or the session runs out.

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => '/nowhere' },
  net: { fetch: (url: string, init?: RequestInit) => fetchMock(url, init) },
}))

const store = vi.hoisted(() => ({ tokens: null as null | { access_token: string; refresh_token: string; expires_at: number } }))

vi.mock('../src/main/tokenStore', () => ({
  tokenStore: {
    get: () => store.tokens,
    set: (t: typeof store.tokens) => {
      store.tokens = t
    },
    clear: () => {
      store.tokens = null
    },
  },
}))

vi.mock('../src/main/settings', () => ({ clientId: () => 't3k_pub_testkey123' }))

const { backend, exchangeCode } = await import('../src/main/t3k')

const API = 'https://www.tone3000.com'
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const auth = (call: number): string | undefined => (fetchMock.mock.calls[call][1]?.headers as Record<string, string> | undefined)?.Authorization
const fresh = (): void => {
  store.tokens = { access_token: 'access-1', refresh_token: 'refresh-1', expires_at: Date.now() + 3_600_000 }
}

beforeEach(() => {
  fetchMock.mockReset()
  fresh()
})

describe('requests', () => {
  it('asks for a page of a list with the Bearer token', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [], page: 2, total: 30, total_pages: 2 }))
    const page = await backend().tones('favorited', 2)
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}/api/v1/tones/favorited?page=2&page_size=24`)
    expect(auth(0)).toBe('Bearer access-1')
    expect(page).toEqual({ data: [], page: 2, totalPages: 2, total: 30 })
  })

  it('reads trending and latest as feeds of one page', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ id: 7, title: 'T', user: { username: 'u' }, format: 'nam', sizes: ['lite'] }] }))
    const page = await backend().tones('trending', 5)
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}/api/v1/tones/trending`)
    expect(page.totalPages).toBe(1)
    expect(page.data[0]).toMatchObject({ id: 7, title: 'T', user: { username: 'u', avatar_url: null }, images: null, tags: [] })
  })

  it('asks for the A2 models of a tone and offers A2 Lite first', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: [
          { id: 1, name: 'std', size: 'standard', architecture_version: '2', model_url: `${API}/m/1`, tone_id: 9 },
          { id: 2, name: 'lite', size: 'lite', architecture_version: '2', model_url: `${API}/m/2`, tone_id: 9 },
        ],
      }),
    )
    const models = await backend().models(9)
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/api/v1/models')
    expect(Object.fromEntries(url.searchParams)).toEqual({ tone_id: '9', architecture: '2', page_size: '300' })
    expect(models.map((m) => m.id)).toEqual([2, 1])
  })

  it('asks for a tone with architecture=2', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 9, title: 'T', user: {}, format: 'nam' }))
    await backend().tone(9)
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}/api/v1/tones/9?architecture=2`)
  })

  it("downloads a model from the API's own origin, whatever host model_url names", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"architecture":"WaveNet"}'))
    const model = { id: 5, model_url: 'https://elsewhere.example/api/v1/models/5/download?v=3' } as Model
    expect(await backend().modelText(model)).toBe('{"architecture":"WaveNet"}')
    // The token goes to tone3000.com only.
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}/api/v1/models/5/download?v=3`)
    expect(auth(0)).toBe('Bearer access-1')
  })

  it.each([
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [503, 'server'],
  ])('reports a %i as %s', async (status, code) => {
    fetchMock.mockResolvedValueOnce(json({}, status))
    await expect(backend().tone(1)).rejects.toMatchObject({ code })
  })

  it('reports an unreachable network', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await expect(backend().tone(1)).rejects.toMatchObject({ code: 'network' })
    expect(store.tokens).not.toBeNull()
  })

  it('refuses to ask anything when not connected', async () => {
    store.tokens = null
    await expect(backend().tone(1)).rejects.toMatchObject({ code: 'not_connected' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('tokens', () => {
  it('exchanges the code with the PKCE verifier and no secret', async () => {
    fetchMock.mockResolvedValueOnce(json({ access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'bearer' }))
    const before = Date.now()
    const tokens = await exchangeCode('the-code', 'the-verifier')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API}/api/v1/oauth/token`)
    expect(init?.method).toBe('POST')
    expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
      grant_type: 'authorization_code',
      code: 'the-code',
      code_verifier: 'the-verifier',
      redirect_uri: 'http://127.0.0.1:38300/callback',
      client_id: 't3k_pub_testkey123',
    })
    expect(tokens.access_token).toBe('a')
    expect(tokens.expires_at).toBeGreaterThanOrEqual(before + 3_600_000)
  })

  it('refreshes a token about to expire, once for all waiting requests', async () => {
    store.tokens = { access_token: 'old', refresh_token: 'refresh-1', expires_at: Date.now() + 30_000 }
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/oauth/token') ? json({ access_token: 'new', refresh_token: 'refresh-2', expires_in: 3600 }) : json({ data: [] }),
    )
    await Promise.all([backend().tones('favorited', 1), backend().tones('created', 1)])
    const refreshes = fetchMock.mock.calls.filter(([url]) => url.endsWith('/oauth/token'))
    expect(refreshes).toHaveLength(1)
    expect(Object.fromEntries(new URLSearchParams(String(refreshes[0][1]?.body)))).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
      client_id: 't3k_pub_testkey123',
    })
    expect(store.tokens).toMatchObject({ access_token: 'new', refresh_token: 'refresh-2' })
    const lists = fetchMock.mock.calls.filter(([url]) => url.includes('/tones/'))
    expect(lists.map(([, init]) => (init?.headers as Record<string, string>).Authorization)).toEqual(['Bearer new', 'Bearer new'])
  })

  it('ends the session when the refresh token is spent', async () => {
    store.tokens = { access_token: 'old', refresh_token: 'spent', expires_at: 0 }
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid_grant' }, 400))
    await expect(backend().tone(1)).rejects.toMatchObject({ code: 'session_expired' })
    expect(store.tokens).toBeNull()
  })

  it('keeps the session when a refresh fails for another reason', async () => {
    store.tokens = { access_token: 'old', refresh_token: 'refresh-1', expires_at: 0 }
    fetchMock.mockResolvedValueOnce(json({}, 503))
    await expect(backend().tone(1)).rejects.toMatchObject({ code: 'server' })
    expect(store.tokens).not.toBeNull()
  })

  it('refreshes and tries again, once, on a 401', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ access_token: 'new', refresh_token: 'refresh-2', expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: 1, title: 'T', user: {} }))
    expect((await backend().tone(1)).title).toBe('T')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(auth(2)).toBe('Bearer new')
  })

  it('ends the session on a second 401', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ access_token: 'new', refresh_token: 'refresh-2', expires_in: 3600 }))
      .mockResolvedValueOnce(json({}, 401))
    await expect(backend().tone(1)).rejects.toMatchObject({ code: 'session_expired' })
    expect(store.tokens).toBeNull()
  })
})
