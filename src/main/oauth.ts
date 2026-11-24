// Signing in to TONE3000 and picking a tone there, inside the app window.
//
// Adapted from TONE3000's Electron example (electron/src/main/oauth.ts in
// https://github.com/tone-3000/t3k-api, MIT License, Copyright (c) 2026 TONE3000;
// see NOTICE).
//
// TONE3000 is a screen of the app: its pages load in a WebContentsView layered
// over the app window at bounds the renderer measures (the area beside the menu).
// The view has no preload, so TONE3000's pages can never reach the app's IPC
// bridge. This process owns the PKCE verifier and watches the view's
// navigations: when TONE3000 redirects to REDIRECT_URI it cancels the
// navigation, exchanges the code and tells the renderer how it went.
// Nothing listens at REDIRECT_URI.
//
// The view keeps a persistent partition, so the TONE3000 session survives
// restarts and later flows skip the sign-in step.
//
// Keyboard: Tab never leaves an embedded view by itself (it wraps inside the
// page), so the app gives the way out: F6 in TONE3000's page puts the keyboard
// back on the app's menu, and F6 there (or Tab past the menu) returns to the page.

import { type BrowserWindow, WebContentsView, shell } from 'electron'
import { createHash, randomBytes } from 'node:crypto'
import { IPC } from '@shared/ipc'
import type { AuthRequest, AuthResult, ViewBounds } from '@shared/types'
import { API_BASE, MOCK, REDIRECT_URI, T3K_PARTITION } from './config'
import { mockSession, sampleCatalogUrl } from './mock'
import { loadUser } from './session'
import { clientId } from './settings'
import { exchangeCode } from './t3k'
import { tokenStore } from './tokenStore'

interface ActiveFlow {
  /** The renderer's name for this flow; its outcome is reported under it. */
  id: string
  view: WebContentsView
  win: BrowserWindow
  codeVerifier: string
  state: string
  /** The user took the keyboard back to the app's menu: page loads must not pull it away. */
  keyboardInMenu: boolean
  detach: () => void
}

let active: ActiveFlow | null = null

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** http(s) links that try to open a new window go to the system browser. */
export function openExternally({ url }: { url: string }): { action: 'deny' } {
  try {
    const { protocol } = new URL(url)
    if (protocol === 'http:' || protocol === 'https:') void shell.openExternal(url)
  } catch {
    /* malformed URL */
  }
  return { action: 'deny' }
}

/**
 * The catalog is scoped to what the HX Stomp can load: NAM captures of the A2
 * architecture. (TONE3000 has no size filter here; A2 Lite is told apart on the
 * tone's own page in the app.)
 */
export function buildAuthorizeUrl(request: AuthRequest, codeChallenge: string, state: string, key = clientId()): string {
  const url = new URL(`${API_BASE}/api/v1/oauth/authorize`)
  const p = url.searchParams
  p.set('client_id', key)
  p.set('redirect_uri', REDIRECT_URI)
  p.set('response_type', 'code')
  p.set('code_challenge', codeChallenge)
  p.set('code_challenge_method', 'S256')
  p.set('state', state)
  p.set('prompt', request.prompt)
  if (request.prompt === 'load_tone' && request.toneId != null) p.set('tone_id', String(request.toneId))
  p.set('format', 'nam')
  p.set('architecture', '2')
  // Back, forward, refresh and close inside TONE3000's own pages.
  p.set('menubar', 'true')
  // Lets the user hear a tone in the catalog before picking it.
  if (request.prompt === 'select_tone') p.set('preview', 'true')
  return url.toString()
}

export function pkce(): { codeVerifier: string; codeChallenge: string; state: string } {
  const codeVerifier = base64url(randomBytes(32))
  return {
    codeVerifier,
    codeChallenge: base64url(createHash('sha256').update(codeVerifier).digest()),
    state: base64url(randomBytes(16)),
  }
}

function isRedirect(url: string): boolean {
  try {
    const a = new URL(url)
    const b = new URL(REDIRECT_URI)
    return a.origin === b.origin && a.pathname === b.pathname
  } catch {
    return false
  }
}

function teardown(flow: ActiveFlow): void {
  flow.detach()
  const view = flow.view
  if (!flow.win.isDestroyed()) {
    flow.win.contentView.removeChildView(view)
    // Removing a child view does not hand keyboard focus back to the app.
    flow.win.webContents.focus()
  }
  // Closing synchronously inside a navigation event can crash; defer it.
  setImmediate(() => {
    if (!view.webContents.isDestroyed()) view.webContents.close()
  })
}

interface Callback {
  code?: string
  state?: string
  error?: string
  toneId?: string
  canceled?: boolean
}

function report(flow: ActiveFlow, result: AuthResult): void {
  if (!flow.win.isDestroyed()) flow.win.webContents.send(IPC.authResult, flow.id, result)
}

/** Settles the active flow exactly once. */
async function finish(cb: Callback): Promise<void> {
  const flow = active
  if (!flow) return
  active = null

  let result: AuthResult
  if (cb.canceled && !cb.code) {
    result = { status: 'canceled' }
  } else if (cb.error) {
    result = { status: 'error', error: cb.error }
  } else if (!MOCK && (!cb.code || cb.state !== flow.state)) {
    result = { status: 'error', error: 'state_mismatch' }
  } else {
    try {
      // A canceled callback can still carry a code: the user signed in but
      // picked no tone. The session is kept.
      if (MOCK) mockSession.connected = true
      else await tokenStore.set(await exchangeCode(cb.code ?? '', flow.codeVerifier))
      const toneId = cb.canceled ? NaN : Number(cb.toneId)
      result = { status: 'connected', user: await loadUser(), toneId: Number.isInteger(toneId) && toneId > 0 ? toneId : undefined }
    } catch (err) {
      result = { status: 'error', error: err instanceof Error ? err.message : 'token_exchange_failed' }
    }
  }

  teardown(flow)
  report(flow, result)
}

function roundBounds(b: ViewBounds): Electron.Rectangle {
  return {
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.max(0, Math.round(b.width)),
    height: Math.max(0, Math.round(b.height)),
  }
}

/** Drops the open flow without a word: its page is gone or is being replaced. */
function abandon(): void {
  const flow = active
  if (!flow) return
  active = null
  teardown(flow)
}

/** The app's page reloaded: whatever flow it had open is nobody's any more. */
export function abandonAuth(win: BrowserWindow): void {
  if (active?.win === win) abandon()
}

export function beginAuth(win: BrowserWindow, request: AuthRequest, bounds: ViewBounds, id: string): void {
  abandon()

  const { codeVerifier, codeChallenge, state } = pkce()

  const view = new WebContentsView({
    webPreferences: { partition: T3K_PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  view.setBackgroundColor('#000000')
  win.contentView.addChildView(view)
  view.setBounds(roundBounds(bounds))

  const wc = view.webContents
  wc.setWindowOpenHandler(openExternally)

  // Server redirects fire will-redirect; client-side redirects fire will-navigate.
  const onNavigate = (event: Electron.Event, url: string): void => {
    if (!isRedirect(url)) return
    event.preventDefault()
    const q = new URL(url).searchParams
    void finish({
      code: q.get('code') ?? undefined,
      state: q.get('state') ?? undefined,
      error: q.get('error') ?? undefined,
      toneId: q.get('tone_id') ?? undefined,
      canceled: q.get('canceled') === 'true',
    })
  }

  // Authorize can reject the request outright (a bad key, an unregistered
  // redirect_uri) with an error page instead of a redirect.
  const onDidNavigate = (_e: Electron.Event, url: string, status: number): void => {
    if (status >= 400 && !isRedirect(url)) void finish({ error: `authorize_failed_${status}` })
  }

  // -3 is ERR_ABORTED, which the preventDefault above produces.
  const onFailLoad = (_e: Electron.Event, code: number, _d: string, url: string, isMainFrame: boolean): void => {
    if (!isMainFrame || code === -3 || isRedirect(url)) return
    void finish({ error: 'load_failed' })
  }

  // F6 moves between panes, as it does in browsers and editors: here, from
  // TONE3000's page back to the app's menu. Tab alone can never get there.
  const onInput = (event: Electron.Event, input: Electron.Input): void => {
    if (input.type !== 'keyDown' || input.key !== 'F6') return
    event.preventDefault()
    const flow = active
    if (!flow || flow.view !== view || win.isDestroyed()) return
    flow.keyboardInMenu = true
    win.webContents.focus()
    win.webContents.send(IPC.authKeyboardExit)
  }

  // A newly added view does not reliably take keyboard focus, and navigations
  // inside the flow (sign-in, then the catalog) can drop it.
  const onLoaded = (): void => {
    if (active?.view === view && !active.keyboardInMenu) wc.focus()
  }

  wc.on('will-redirect', onNavigate)
  wc.on('will-navigate', onNavigate)
  wc.on('did-navigate', onDidNavigate)
  wc.on('did-fail-load', onFailLoad)
  wc.on('before-input-event', onInput)
  wc.on('did-finish-load', onLoaded)

  active = {
    id,
    view,
    win,
    codeVerifier,
    state,
    keyboardInMenu: false,
    detach: () => {
      wc.off('will-redirect', onNavigate)
      wc.off('will-navigate', onNavigate)
      wc.off('did-navigate', onDidNavigate)
      wc.off('did-fail-load', onFailLoad)
      wc.off('before-input-event', onInput)
      wc.off('did-finish-load', onLoaded)
    },
  }

  // Sample mode shows a made-up catalog in the same view, so the whole path
  // (placement, keyboard, the redirect) runs without TONE3000.
  void wc.loadURL(MOCK ? sampleCatalogUrl(REDIRECT_URI) : buildAuthorizeUrl(request, codeChallenge, state))
  wc.focus()
}

export function setAuthBounds(bounds: ViewBounds): void {
  active?.view.setBounds(roundBounds(bounds))
}

/** Puts the keyboard in TONE3000's page (F6 or Tab from the app's menu). */
export function focusAuth(): void {
  if (!active) return
  active.keyboardInMenu = false
  active.view.webContents.focus()
}

/** The renderer left the TONE3000 screen: closes the flow `id`, if it is still the open one. */
export function cancelAuth(id: string): void {
  if (active?.id === id) void finish({ canceled: true })
}
