// The TONE3000 API as this app uses it: the signed-in user, the bounded tone
// lists, a tone, its A2 models and a model's file. Tokens stay in this process.
//
// An independent integration is limited to the OAuth prompt flows and these
// lists (https://www.tone3000.com/api#commercial-terms), so there is no search here.

import { net } from 'electron'
import { sortModels } from '@shared/compat'
import type { EmbeddedUser, Model, Tone, ToneListKind, TonePage, User } from '@shared/types'
import { API_BASE, MOCK, REDIRECT_URI } from './config'
import { AppError } from './errors'
import { mockBackend } from './mock'
import { clientId } from './settings'
import { tokenStore, type Tokens } from './tokenStore'

export interface Backend {
  user(): Promise<User>
  tones(kind: ToneListKind, page: number): Promise<TonePage>
  tone(id: number): Promise<Tone>
  /** A tone's A2 models, A2 Lite first. */
  models(toneId: number): Promise<Model[]>
  /** The text of a model's .nam file. */
  modelText(model: Model): Promise<string>
}

const PAGE_SIZE = 24
/** A .nam is JSON text; A2 Lite is about 40 kB. Anything this large is not one. */
const MAX_MODEL_BYTES = 64 * 1024 * 1024

// ─── Tokens ─────────────────────────────────────────────────────────────────

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  let res: Response
  try {
    res = await net.fetch(`${API_BASE}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(body).toString(),
    })
  } catch {
    throw new AppError('network', 'TONE3000 could not be reached.')
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    // 400 invalid_grant and 401: the code or refresh token is no longer good.
    const over = res.status === 400 || res.status === 401
    throw new AppError(over ? 'session_expired' : 'server', err.error ?? `Token request failed (${res.status}).`)
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
}

export function exchangeCode(code: string, codeVerifier: string): Promise<Tokens> {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: REDIRECT_URI,
    client_id: clientId(),
  })
}

let refreshing: Promise<Tokens> | null = null

/** A token good for at least a minute; refreshes once for all callers waiting. */
async function accessToken(): Promise<string> {
  const tokens = tokenStore.get()
  if (!tokens) throw new AppError('not_connected', 'Not connected to TONE3000.')
  if (Date.now() < tokens.expires_at - 60_000) return tokens.access_token

  refreshing ??= tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: clientId(),
  })
    .then((fresh) => {
      void tokenStore.set(fresh)
      return fresh
    })
    .catch((err: unknown) => {
      // The refresh token is spent: the session is over. Anything else
      // (offline, a 5xx) leaves it be, to try again later.
      if (err instanceof AppError && err.code === 'session_expired') void tokenStore.clear()
      throw err
    })
    .finally(() => {
      refreshing = null
    })
  return (await refreshing).access_token
}

// ─── Requests ───────────────────────────────────────────────────────────────

async function request(path: string, accept: string, retry = true): Promise<Response> {
  const token = await accessToken()
  let res: Response
  try {
    res = await net.fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: accept } })
  } catch {
    throw new AppError('network', 'TONE3000 could not be reached.')
  }

  // The token can expire between the check above and the request: refresh, once.
  if (res.status === 401 && retry) {
    const tokens = tokenStore.get()
    if (tokens) void tokenStore.set({ ...tokens, expires_at: 0 })
    return request(path, accept, false)
  }

  const deprecations = res.headers.get('X-Tone3000-Deprecations')
  if (deprecations) console.warn(`TONE3000 deprecations on ${path.split('?')[0]}: ${deprecations}`)

  if (res.ok) return res
  if (res.status === 401) {
    void tokenStore.clear()
    throw new AppError('session_expired', 'The TONE3000 session ended.')
  }
  if (res.status === 403) throw new AppError('forbidden', 'TONE3000 does not allow this.')
  if (res.status === 404) throw new AppError('not_found', 'Not found on TONE3000.')
  if (res.status === 429) throw new AppError('rate_limited', 'Too many requests to TONE3000.')
  throw new AppError('server', `TONE3000 answered ${res.status}.`)
}

async function getJson<T>(path: string): Promise<T> {
  const res = await request(path, 'application/json')
  try {
    return (await res.json()) as T
  } catch {
    throw new AppError('server', 'TONE3000 sent an answer that could not be read.')
  }
}

// ─── What the API sends, cut down to what the app shows ─────────────────────

function pickUser(u: Partial<EmbeddedUser> | null | undefined): EmbeddedUser {
  return {
    id: Number(u?.id ?? 0),
    username: String(u?.username ?? ''),
    display_name: u?.display_name ?? null,
    is_verified: Boolean(u?.is_verified),
    avatar_url: u?.avatar_url ?? null,
    url: String(u?.url ?? ''),
  }
}

function pickTone(t: Tone): Tone {
  return {
    id: t.id,
    user: pickUser(t.user),
    title: String(t.title ?? ''),
    description: t.description ?? null,
    gear: t.gear,
    images: Array.isArray(t.images) ? t.images.filter((x) => typeof x === 'string') : null,
    format: t.format,
    license: t.license,
    sizes: Array.isArray(t.sizes) ? t.sizes : [],
    makes: Array.isArray(t.makes) ? t.makes.map((m) => ({ id: m.id, name: m.name })) : [],
    tags: Array.isArray(t.tags) ? t.tags.map((m) => ({ id: m.id, name: m.name })) : [],
    models_count: t.models_count,
    a1_models_count: t.a1_models_count,
    a2_models_count: t.a2_models_count,
    downloads_count: t.downloads_count,
    favorites_count: t.favorites_count,
    url: String(t.url ?? ''),
  }
}

function pickModel(m: Model): Model {
  return {
    id: m.id,
    model_url: String(m.model_url ?? ''),
    name: String(m.name ?? ''),
    size: m.size,
    tone_id: m.tone_id,
    architecture_version: m.architecture_version ?? null,
  }
}

// ─── The live backend ───────────────────────────────────────────────────────

interface Paginated<T> {
  data: T[]
  page?: number
  total?: number
  total_pages?: number
}

const live: Backend = {
  async user() {
    const u = await getJson<User>('/api/v1/user')
    return { ...pickUser(u), bio: u.bio ?? null, links: u.links ?? null }
  },

  async tones(kind, page) {
    // Trending and latest are feeds of ten, not paginated.
    if (kind === 'trending' || kind === 'latest') {
      const feed = await getJson<Paginated<Tone>>(`/api/v1/tones/${kind}`)
      const data = (feed.data ?? []).map(pickTone)
      return { data, page: 1, totalPages: 1, total: data.length }
    }
    const qs = new URLSearchParams({ page: String(Math.max(1, page)), page_size: String(PAGE_SIZE) })
    const res = await getJson<Paginated<Tone>>(`/api/v1/tones/${kind}?${qs}`)
    const data = (res.data ?? []).map(pickTone)
    return { data, page: res.page ?? page, totalPages: res.total_pages ?? 1, total: res.total ?? data.length }
  },

  async tone(id) {
    // architecture=2 makes models_count count the A2 models, the ones that matter here.
    return pickTone(await getJson<Tone>(`/api/v1/tones/${id}?architecture=2`))
  },

  async models(toneId) {
    // Without `architecture` the API answers A1 + Custom, which leaves A2 out.
    const qs = new URLSearchParams({ tone_id: String(toneId), architecture: '2', page_size: '300' })
    const res = await getJson<Paginated<Model>>(`/api/v1/models?${qs}`)
    return sortModels((res.data ?? []).map(pickModel))
  },

  async modelText(model) {
    // model_url is absolute. Only its path is used, against the API's own
    // origin, so the Bearer token can never be sent anywhere else.
    let path: string
    try {
      const url = new URL(model.model_url, API_BASE)
      path = url.pathname + url.search
    } catch {
      throw new AppError('server', 'TONE3000 gave no download address for this model.')
    }
    const res = await request(path, '*/*')
    const size = Number(res.headers.get('content-length') ?? 0)
    if (size > MAX_MODEL_BYTES) throw new AppError('not_convertible', 'This file is too large to be a NAM capture.')
    const text = await res.text()
    if (text.length > MAX_MODEL_BYTES) throw new AppError('not_convertible', 'This file is too large to be a NAM capture.')
    return text
  },
}

export function backend(): Backend {
  return MOCK ? mockBackend : live
}
