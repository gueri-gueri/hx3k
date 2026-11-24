import { type FormEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { toneFit } from '@shared/compat'
import type { Tone, ToneListKind, TonePage } from '@shared/types'
import { LINKS, call, hx } from '../api'
import { Hx3kLogo, T3KMark, Tone3000Logo } from '../components/Brand'
import { Icon } from '../components/Icon'
import { BrowseButton, Creator, ExternalLink, FitChip, Notice, ToneImage } from '../components/ui'
import { SCREEN_TITLE_ID, useApp, useScreenTitle } from '../context'
import { type Key, errorText } from '../i18n'
import { formatLabel, gearLabel } from '../labels'

/** The tone lists, behind the key (first run) and the sign-in splash. */
export function TonesView(): ReactNode {
  const { state } = useApp()
  return state.hasClientId && state.connected ? <ToneLists /> : <Gate />
}

/** What stands before TONE3000 until the app has a key and a session. */
export function Gate(): ReactNode {
  const { state } = useApp()
  return state.hasClientId ? <Splash /> : <Setup />
}

// ─── First run: the publishable key ─────────────────────────────────────────

export function KeyForm({ onSaved }: { onSaved?: () => void }): ReactNode {
  const { t, applyState, state } = useApp()
  const [key, setKey] = useState(state.settings.clientId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      applyState(await call(hx.updateSettings({ clientId: key.trim() })))
      onSaved?.()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="field" onSubmit={(e) => void submit(e)}>
      <label htmlFor="t3k-key">{t('setup.label')}</label>
      <div className="input-row">
        <input
          id="t3k-key"
          className="input mono"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t('setup.placeholder')}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 't3k-key-error' : undefined}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || key.trim() === ''}>
          {t('setup.save')}
        </button>
      </div>
      {error && (
        <p id="t3k-key-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

function Setup(): ReactNode {
  const { t, open, go } = useApp()
  useScreenTitle(t('setup.title'))
  return (
    <div className="center">
      <section className="setup">
        <Tone3000Logo />
        <div className="stack-sm">
          <h1 id={SCREEN_TITLE_ID}>{t('setup.title')}</h1>
          <p className="muted">{t('setup.lead')}</p>
        </div>
        <ol className="steps">
          <li>{t('setup.step1')}</li>
          <li>{t('setup.step2')}</li>
          <li>{t('setup.step3')}</li>
        </ol>
        <div>
          <button type="button" className="btn btn-outline" onClick={() => open(LINKS.tone3000Keys)}>
            {t('setup.open')}
            <Icon name="external" />
          </button>
        </div>
        <KeyForm />
        <p className="muted small">{t('setup.secret')}</p>
        <button type="button" className="link link-start" onClick={() => go({ name: 'local' })}>
          {t('setup.local')}
        </button>
      </section>
    </div>
  )
}

// ─── Before sign-in ─────────────────────────────────────────────────────────

function Splash(): ReactNode {
  const { t, go } = useApp()
  useScreenTitle(t('splash.title'))
  return (
    <div className="center">
      <section className="splash">
        {/* The two logos are the picture; the title says what the screen is for. */}
        <h1 id={SCREEN_TITLE_ID} className="sr-only">
          {t('splash.title')}
        </h1>
        <div className="partners">
          <Hx3kLogo />
          <span className="times" aria-hidden="true">
            ×
          </span>
          <Tone3000Logo />
        </div>
        <p className="splash-copy">{t('splash.copy')}</p>
        <p className="muted">{t('splash.how')}</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => go({ name: 'tone3000', start: true })}>
          {t('splash.continue')}
        </button>
        <p className="splash-fine">
          {t('splash.fine')} <ExternalLink href={LINKS.tone3000}>tone3000.com</ExternalLink>
        </p>
      </section>
    </div>
  )
}

// ─── The lists ──────────────────────────────────────────────────────────────

const MINE: ToneListKind[] = ['favorited', 'downloaded', 'created']
const DISCOVER: ToneListKind[] = ['trending', 'latest']
const KINDS: ToneListKind[] = [...MINE, ...DISCOVER]

/**
 * One tone of a list. The whole card opens the tone, but only its title is the
 * control: a button's name should be a name, not everything printed on the card.
 */
function ToneCard({ tone }: { tone: Tone }): ReactNode {
  const { go, focusOnReturn } = useApp()
  const fit = toneFit(tone)
  const key = `tone:${tone.id}`
  const open = (): void => {
    // Coming back, focus returns to this card rather than to the top of the list.
    focusOnReturn.current = key
    go({ name: 'tone', id: tone.id })
  }
  return (
    <article className={fit === 'no' ? 'tone-card tone-card-dim' : 'tone-card'} onClick={open}>
      <ToneImage className="tone-image" src={tone.images?.[0]} />
      <div className="tone-card-body">
        <h2 className="tone-title">
          <button type="button" className="card-link" data-focus-key={key}>
            {tone.title}
          </button>
        </h2>
        <div className="chips">
          <span className="chip">{gearLabel(tone.gear)}</span>
          <span className="chip">{formatLabel(tone.format)}</span>
        </div>
        <div className="tone-card-foot">
          <Creator user={tone.user} />
          <FitChip fit={fit} />
        </div>
      </div>
    </article>
  )
}

function MoreCard(): ReactNode {
  const { t, browse } = useApp()
  return (
    <article className="tone-card more-card" onClick={browse}>
      <T3KMark decorative />
      <h2 className="tone-title">
        <button type="button" className="card-link">
          {t('tones.more.title')}
        </button>
      </h2>
      <p>{t('tones.more.text')}</p>
    </article>
  )
}

function ToneLists(): ReactNode {
  const { t, tab, setTab, pages, fail, focusOnReturn, focusScreen } = useApp()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<TonePage | null>(pages.get(`${tab}:1`) ?? null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const title = MINE.includes(tab) ? t('tones.title') : t('tones.discover')
  useScreenTitle(title)

  const load = useCallback(
    async (kind: ToneListKind, n: number, fresh: boolean) => {
      const key = `${kind}:${n}`
      const have = fresh ? undefined : pages.get(key)
      setError('')
      if (have) {
        setData(have)
        return
      }
      setLoading(true)
      setData(null)
      try {
        const got = await call(hx.tones(kind, n))
        pages.set(key, got)
        setData(got)
      } catch (err) {
        setError(errorText(err, t))
        fail(err, true)
      } finally {
        setLoading(false)
      }
    },
    [pages, t, fail],
  )

  useEffect(() => {
    void load(tab, page, false)
  }, [tab, page, load])

  // Back from a tone: focus goes to the card it was opened from.
  useEffect(() => {
    const key = focusOnReturn.current
    if (!data || !key) return
    focusOnReturn.current = null
    const card = document.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)
    if (card) card.focus()
    else focusScreen()
  }, [data, focusOnReturn, focusScreen])

  const pick = (kind: ToneListKind): void => {
    setPage(1)
    setTab(kind)
  }

  // The tabs are one stop for Tab; the arrows move between them, as in any tab list.
  const onTabKey = (e: KeyboardEvent): void => {
    const at = KINDS.indexOf(tab)
    const to =
      e.key === 'ArrowRight' ? (at + 1) % KINDS.length : e.key === 'ArrowLeft' ? (at - 1 + KINDS.length) % KINDS.length : e.key === 'Home' ? 0 : e.key === 'End' ? KINDS.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    pick(KINDS[to])
    tabs.current[to]?.focus()
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 id={SCREEN_TITLE_ID}>{title}</h1>
      </div>

      <div className="tabbar">
        <div className="tablist" role="tablist" aria-label={t('tones.lists')} onKeyDown={onTabKey}>
          {KINDS.map((kind, i) => (
            <button
              key={kind}
              ref={(el) => {
                tabs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`tab-${kind}`}
              aria-selected={tab === kind}
              aria-controls="tones-panel"
              tabIndex={tab === kind ? 0 : -1}
              // The first of the "discover" lists starts a second group.
              className={kind === DISCOVER[0] ? 'tab tab-group' : 'tab'}
              onClick={() => pick(kind)}
            >
              {t(`tab.${kind}` as Key)}
            </button>
          ))}
        </div>
        <div className="tabbar-end">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => void load(tab, page, true)} disabled={loading}>
            <Icon name="refresh" />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      <div className="tabpanel" role="tabpanel" id="tones-panel" aria-labelledby={`tab-${tab}`} aria-busy={loading}>
        {error && (
          <Notice kind="error">
            {error}{' '}
            <button type="button" className="link" onClick={() => void load(tab, page, true)}>
              {t('common.retry')}
            </button>
          </Notice>
        )}

        {loading && (
          <div className="tone-grid" role="status" aria-label={t('common.loading')}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="tone-card" aria-hidden="true">
                <div className="tone-image skeleton" />
                <div className="tone-card-body">
                  <div className="skeleton sk-line sk-w75" />
                  <div className="skeleton sk-chip sk-w50" />
                  <div className="skeleton sk-chip sk-w40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="empty">
            <p>{t(`tones.empty.${tab}` as Key)}</p>
            <div className="actions">
              <BrowseButton />
            </div>
          </div>
        )}

        {data && data.data.length > 0 && (
          <>
            <div className="tone-grid">
              {data.data.map((tone) => (
                <ToneCard key={tone.id} tone={tone} />
              ))}
              {/* A list is a starting point: the whole catalog is one click away. */}
              <MoreCard />
            </div>
            {data.totalPages > 1 && (
              <div className="pager">
                <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {t('tones.prev')}
                </button>
                <span>{t('tones.page', { page: data.page, pages: data.totalPages })}</span>
                <button type="button" className="btn btn-outline btn-sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  {t('tones.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
