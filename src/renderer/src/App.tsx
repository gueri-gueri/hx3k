import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, AuthResult, ConversionRecord, ToneListKind, TonePage } from '@shared/types'
import { HxError, LINKS, call, hx } from './api'
import { Hx3kLogo, Hx3kMark, T3KMark, Tone3000Logo } from './components/Brand'
import { Icon, type IconName } from './components/Icon'
import { Avatar, Spinner } from './components/ui'
import { type AppContext, Ctx, SCREEN_TITLE_ID, type View } from './context'
import { type Key, errorText, resolveLang, translator } from './i18n'
import { ConvertedView } from './views/Converted'
import { GuideView } from './views/Guide'
import { InstallView } from './views/Install'
import { LocalView } from './views/Local'
import { SettingsView } from './views/Settings'
import { Tone3000Stage } from './views/Tone3000'
import { ToneDetail } from './views/ToneDetail'
import { Gate, TonesView } from './views/Tones'

interface Toast {
  id: number
  kind: 'ok' | 'error'
  text: string
}

type NavItem = { view: Exclude<View['name'], 'tone'>; icon?: IconName; label?: Key }

// TONE3000 is a place in the app like the others: its entry is in the menu, and
// stays selected for as long as the user is on TONE3000's pages.
const NAV: NavItem[] = [
  { view: 'tone3000' },
  { view: 'tones', icon: 'tones', label: 'nav.tones' },
  { view: 'converted', icon: 'wave', label: 'nav.converted' },
  { view: 'local', icon: 'file', label: 'nav.local' },
  { view: 'install', icon: 'firmware', label: 'nav.install' },
  { view: 'guide', icon: 'guide', label: 'nav.guide' },
  { view: 'settings', icon: 'settings', label: 'nav.settings' },
]

const SESSION_OVER = new Set(['session_expired', 'not_connected', 'no_client_id'])

let nextToast = 1

export function App(): ReactNode {
  const [state, setState] = useState<AppState | null>(null)
  const [bootError, setBootError] = useState('')
  const [view, setView] = useState<View>({ name: 'tones' })
  const [tab, setTab] = useState<ToneListKind>('favorited')
  const [library, setLibrary] = useState<ConversionRecord[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [said, setSaid] = useState('')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const pages = useRef(new Map<string, TonePage>()).current
  const content = useRef<HTMLElement>(null)
  const focusOnReturn = useRef<string | null>(null)

  const lang = resolveLang(state?.settings.language ?? 'system', state?.locale ?? navigator.language)
  const t = useMemo(() => translator(lang), [lang])

  // The newest of each, for callbacks that must not change identity.
  const tRef = useRef(t)
  tRef.current = t
  const stateRef = useRef(state)
  stateRef.current = state
  const viewRef = useRef(view)
  viewRef.current = view
  /** Where the user was before going to TONE3000, to come back to. */
  const before = useRef<View>({ name: 'tones' })
  /** This change of screen is a return to the lists, whose card takes the focus. */
  const returningToCard = useRef(false)

  const go = useCallback((next: View) => {
    const from = viewRef.current
    if (next.name === 'tone3000' && from.name !== 'tone3000') before.current = from
    // The card to return focus to only matters on the way back to the lists.
    if (next.name !== 'tones' && next.name !== 'tone') focusOnReturn.current = null
    returningToCard.current = next.name === 'tones' && focusOnReturn.current !== null
    setView(next)
  }, [])

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    const id = nextToast++
    setToasts((list) => [...list.slice(-3), { id, kind, text }])
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4500)
  }, [])

  // Emptied first, so saying the same thing twice is still two announcements.
  const announce = useCallback((text: string) => {
    setSaid('')
    requestAnimationFrame(() => setSaid(text))
  }, [])

  const focusScreen = useCallback(() => {
    content.current?.focus()
  }, [])

  const refresh = useCallback(async () => {
    setState(await call(hx.state()))
  }, [])

  const reloadLibrary = useCallback(async () => {
    try {
      setLibrary(await call(hx.library()))
    } catch {
      /* the list on screen stays as it is */
    }
  }, [])

  const fail = useCallback(
    (err: unknown, quiet = false) => {
      const over = err instanceof HxError && SESSION_OVER.has(err.code)
      if (over) {
        // The session ended under the app: back to the splash.
        pages.clear()
        void refresh().catch(() => undefined)
      }
      if (over || !quiet) notify('error', errorText(err, tRef.current))
    },
    [notify, pages, refresh],
  )

  // Start-up.
  useEffect(() => {
    Promise.all([call(hx.state()), call(hx.library())])
      .then(([s, l]) => {
        setState(s)
        setLibrary(l)
      })
      .catch((err: unknown) => setBootError(err instanceof Error ? err.message : String(err)))
  }, [])

  /** How a visit to TONE3000 ended by itself: a tone picked, its catalog closed, or an error. */
  const onTone3000Done = useCallback(
    (result: AuthResult) => {
      const translate = tRef.current
      const wasConnected = stateRef.current?.connected ?? false
      if (result.status === 'connected') {
        pages.clear()
        void refresh()
          .catch(() => undefined)
          .then(() => {
            // A picked tone opens. Without one: after the first sign-in the
            // tone lists come first; later, back to where the user was.
            if (result.toneId) setView({ name: 'tone', id: result.toneId })
            else setView(wasConnected ? before.current : { name: 'tones' })
          })
        return
      }
      if (result.status === 'error') {
        notify('error', /^authorize_failed_4/.test(result.error) ? translate('auth.error.key') : translate('auth.error', { error: result.error }))
      }
      // Closed or failed: a signed-in user goes back where they were; before
      // sign-in the splash is shown again, still under TONE3000 in the menu.
      setView(wasConnected ? before.current : { name: 'tone3000' })
    },
    [notify, pages, refresh],
  )

  // Theme and language on the document.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  // Until the settings arrive, the theme the window was opened in stays (no flash).
  const themeSetting = state?.settings.theme
  const theme = !themeSetting ? hx.initialTheme : themeSetting === 'system' ? (systemDark ? 'dark' : 'light') : themeSetting
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = lang
  }, [theme, lang])

  // A new screen starts at its top, and takes the keyboard: what had focus is gone.
  const viewKey = view.name === 'tone' ? `tone:${view.id}` : view.name
  const arrived = useRef(false)
  useEffect(() => {
    content.current?.scrollTo({ top: 0 })
    if (!arrived.current) {
      // The first screen: nothing was focused before it.
      arrived.current = true
      return
    }
    // Back on the lists from a tone, the card it was opened from takes focus
    // instead (the lists do that, once the card is on the page again).
    if (returningToCard.current) {
      returningToCard.current = false
      return
    }
    content.current?.focus()
  }, [viewKey])

  // A file dropped outside the drop zone must not replace the page.
  useEffect(() => {
    const stop = (e: DragEvent): void => e.preventDefault()
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
    }
  }, [])

  const browse = useCallback(() => go({ name: 'tone3000' }), [go])

  const open = useCallback(
    (url: string) => {
      call(hx.openExternal(url)).catch((err: unknown) => fail(err))
    },
    [fail],
  )

  const ctx = useMemo<AppContext | null>(
    () =>
      state && {
        state,
        applyState: setState,
        t,
        lang,
        view,
        go,
        tab,
        setTab,
        pages,
        browse,
        library,
        setLibrary,
        reloadLibrary,
        notify,
        fail,
        open,
        announce,
        focusScreen,
        focusOnReturn,
      },
    [state, t, lang, view, go, tab, pages, browse, library, reloadLibrary, notify, fail, open, announce, focusScreen],
  )

  if (bootError) {
    return (
      <div className="center" role="alert">
        <p className="selectable">{bootError}</p>
      </div>
    )
  }
  if (!state || !ctx) {
    return (
      <div className="center">
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  // A tone can only be shown while connected; otherwise the splash takes its place.
  const shown: View = view.name === 'tone' && !state.connected ? { name: 'tones' } : view
  const current = shown.name === 'tone' ? 'tones' : shown.name
  // On TONE3000's own pages: signed in, or signing in after Continue on the splash.
  const onTone3000 = shown.name === 'tone3000' && state.hasClientId && (state.connected || shown.start === true)

  return (
    <Ctx.Provider value={ctx}>
      <div className="shell">
        <nav className="sidebar" aria-label="HX3K">
          <div className="wordmark">
            <Hx3kLogo />
            <div className="wordmark-tag">{t('app.tagline')}</div>
          </div>
          <Hx3kMark className="when-rail" />

          {NAV.map((item) => {
            const name = item.label ? t(item.label) : 'TONE3000'
            return (
              <button
                key={item.view}
                type="button"
                className="nav-item"
                aria-label={name}
                aria-current={current === item.view ? 'page' : undefined}
                title={item.view === 'tone3000' ? t('browse.title') : name}
                onClick={() => go({ name: item.view })}
              >
                {/* An entry point to TONE3000 carries its full logo (its compact mark
                    where the menu is only a rail); the others an icon and a word. */}
                {item.icon ? (
                  <Icon name={item.icon} />
                ) : (
                  <>
                    <Tone3000Logo className="when-wide" />
                    <T3KMark className="when-rail" decorative />
                  </>
                )}
                {item.label && <span className="nav-label">{name}</span>}
                {item.view === 'converted' && library.length > 0 && <span className="nav-count">{library.length}</span>}
              </button>
            )
          })}

          <div className="sidebar-foot">
            {/* The way across by keyboard, said where it is needed. */}
            {onTone3000 && (
              <p className="keys-hint">
                <kbd>F6</kbd> <span>{t('tone3000.keys')}</span>
              </p>
            )}
            <button type="button" className="powered" aria-label={`${t('nav.poweredBy')} TONE3000`} onClick={() => open(LINKS.tone3000)} title="tone3000.com">
              <span className="powered-label">{t('nav.poweredBy')}</span>
              <Tone3000Logo className="when-wide" />
              <T3KMark className="when-rail" decorative />
            </button>
          </div>
        </nav>

        <div className="main">
          {state.mock && <div className="banner">{t('settings.mock')}</div>}

          {/* Who is signed in, on the app's own screens. TONE3000's pages show that themselves. */}
          {state.connected && state.user && !onTone3000 && (
            <header className="topbar">
              <div className="who" title={`${t('tones.signedInAs')} @${state.user.username}`}>
                <span className="muted">{t('tones.signedInAs')}</span>
                <Avatar name={state.user.username} src={state.user.avatar_url} size={24} />
                <span className="creator-name">@{state.user.username}</span>
              </div>
            </header>
          )}

          {onTone3000 ? (
            <Tone3000Stage onDone={onTone3000Done} />
          ) : (
            // Named by the screen's own title, and focusable so a new screen can take the keyboard.
            <main className="content" ref={content} tabIndex={-1} aria-labelledby={SCREEN_TITLE_ID}>
              {shown.name === 'tones' && <TonesView />}
              {shown.name === 'tone3000' && <Gate />}
              {shown.name === 'tone' && <ToneDetail id={shown.id} />}
              {shown.name === 'converted' && <ConvertedView />}
              {shown.name === 'local' && <LocalView />}
              {shown.name === 'install' && <InstallView />}
              {shown.name === 'guide' && <GuideView />}
              {shown.name === 'settings' && <SettingsView />}
            </main>
          )}

          {/* Two regions that are always there: what goes well is said politely, what fails at once. */}
          <div className="toasts">
            <div className="toast-stack" role="status">
              {toasts
                .filter((toast) => toast.kind === 'ok')
                .map((toast) => (
                  <div key={toast.id} className="toast toast-ok">
                    <Icon name="check" />
                    <span className="selectable">{toast.text}</span>
                  </div>
                ))}
            </div>
            <div className="toast-stack" role="alert">
              {toasts
                .filter((toast) => toast.kind === 'error')
                .map((toast) => (
                  <div key={toast.id} className="toast toast-error">
                    <Icon name="alert" />
                    <span className="selectable">{toast.text}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Said to assistive technology only: screen changes and results with no toast. */}
          <div className="sr-only" role="status">
            {said}
          </div>
        </div>
      </div>
    </Ctx.Provider>
  )
}
