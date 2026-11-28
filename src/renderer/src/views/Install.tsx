import { type DragEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
  BUILD_STEPS,
  canTurnOn,
  canTurnOnNam,
  dspFits,
  dspUse,
  sameChoice,
  slotChoices,
  slotsFit,
  withFeature,
  withNam,
} from '@shared/hxtra'
import type { HxtraChoice, HxtraRelease, HxtraState } from '@shared/types'
import { HxError, LINKS, call, hx } from '../api'
import { Icon } from '../components/Icon'
import { ExternalLink, Notice, Spinner, Toggle } from '../components/ui'
import { SCREEN_TITLE_ID, useApp, useScreenTitle } from '../context'
import { type Key, type T, errorText } from '../i18n'

/** A feature's name: the release may bring one this version of the app has no words for. */
function featureName(t: T, id: string): string {
  const key = `hxtra.${id}` as Key
  const name = t(key)
  return name === key ? id.replace(/^HX_/, '').replace(/_/g, ' ') : name
}

function featureHelp(t: T, id: string): string | null {
  const key = `hxtra.${id}.help` as Key
  const help = t(key)
  return help === key ? null : help
}

/** The DSP features, NAM A2 Lite's blocks and the other features, as the setup page offers them. */
function Features({ release, choice, onChange, disabled }: { release: HxtraRelease; choice: HxtraChoice; onChange(next: HxtraChoice): void; disabled: boolean }): ReactNode {
  const { t } = useApp()
  const { dsp } = release
  const use = dspUse(dsp, choice)
  const pct = (n: number): string => `${(100 * Math.max(0, n)) / use.total}%`
  const namName = t('install.nam')

  return (
    <>
      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('install.dsp')}</h2>
            <p>{t('install.dsp.help')}</p>
          </div>
        </div>
        <div className="card">
          <div className="dsp-room">
            <div className="meter" role="meter" aria-label={t('install.dsp')} aria-valuemin={0} aria-valuemax={use.total} aria-valuenow={use.nam + use.used}>
              <span className="meter-nam" style={{ width: pct(use.nam) }} />
              <span className="meter-used" style={{ width: pct(use.used) }} />
            </div>
            <p className="meter-text">{t('install.dsp.used', { used: use.nam + use.used, room: use.total, left: use.left })}</p>
          </div>

          <div className="setting">
            <div className="setting-text">
              <strong>{namName}</strong>
              <span>{t('install.nam.help')}</span>
              <span className="cost">{t('install.cost', { cost: use.nam })}</span>
            </div>
            <div className="setting-controls">
              <div className="segmented" role="group" aria-label={namName}>
                {slotChoices(dsp).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={choice.nam && choice.slots === n}
                    disabled={disabled || !choice.nam || (choice.slots !== n && !slotsFit(dsp, choice, n))}
                    onClick={() => onChange({ ...choice, slots: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Toggle checked={choice.nam} label={namName} disabled={disabled || !canTurnOnNam(dsp, choice)} onChange={(on) => onChange(withNam(dsp, choice, on))} />
            </div>
          </div>

          {dsp.features.map((id) => {
            const on = choice.dsp.includes(id)
            const can = canTurnOn(dsp, choice, id)
            const name = featureName(t, id)
            const help = featureHelp(t, id)
            const cost = dsp.cost[id] ?? 0
            return (
              <div className="setting" key={id}>
                <div className="setting-text">
                  <strong>{name}</strong>
                  {help && <span>{help}</span>}
                  <span className={can ? 'cost' : 'cost cost-full'}>{can ? t('install.cost', { cost }) : t('install.full', { cost, left: use.left })}</span>
                </div>
                <Toggle checked={on} label={name} disabled={disabled || !can} onChange={(next) => onChange(withFeature(release, choice, id, next))} />
              </div>
            )
          })}
        </div>
      </section>

      {release.options.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>{t('install.other')}</h2>
              <p>{t('install.other.help')}</p>
            </div>
          </div>
          <div className="card">
            {release.options.map((id) => {
              const name = featureName(t, id)
              const help = featureHelp(t, id)
              return (
                <div className="setting" key={id}>
                  <div className="setting-text">
                    <strong>{name}</strong>
                    {help && <span>{help}</span>}
                  </div>
                  <Toggle
                    checked={choice.options.includes(id)}
                    label={name}
                    disabled={disabled}
                    onChange={(next) => onChange(withFeature(release, choice, id, next))}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('install.always')}</h2>
            <p>{t('install.always.help', { v: release.version })}</p>
          </div>
          <ExternalLink href={LINKS.hxtraFeatures}>{t('install.guide')}</ExternalLink>
        </div>
        <ul className="chips" aria-label={t('install.always')}>
          {release.features.map((id) => (
            <li key={id} className="chip chip-line">
              {featureName(t, id)}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

/** Installing HXtra: HXtra's setup page, steps 1 to 5, with Line 6 Updater doing the install. */
export function InstallView(): ReactNode {
  const { t, state, fail, notify, announce, go } = useApp()
  useScreenTitle(t('install.title'))
  const [info, setInfo] = useState<HxtraState | null>(null)
  const [version, setVersion] = useState('')
  /** What the user picked on this screen, by version. */
  const [picked, setPicked] = useState<Record<string, HxtraChoice>>({})
  const [building, setBuilding] = useState(false)
  const [step, setStep] = useState(0)
  const [log, setLog] = useState('')
  const [stopped, setStopped] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const take = useCallback((next: HxtraState) => {
    setInfo(next)
    setVersion((v) => v || next.releases[0]?.version || '')
  }, [])

  useEffect(() => {
    call(hx.hxtraState()).then(take, (err: unknown) => fail(err))
  }, [take, fail])

  // The steps and the log of the build under way.
  useEffect(
    () =>
      hx.onHxtraProgress((p) => {
        if (p.kind === 'step') setStep(p.step)
        else setLog((text) => text + p.text)
      }),
    [],
  )

  // A build started before this screen was opened: wait for it to end.
  const elsewhere = !!info?.building && !building
  useEffect(() => {
    if (!elsewhere) return
    const timer = window.setInterval(() => {
      call(hx.hxtraState()).then(take, () => undefined)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [elsewhere, take])

  const release = info?.releases.find((r) => r.version === version) ?? null
  if (!info || !release) {
    return (
      <div className="center">
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  // Picked here, else what was picked last time, else what the setup page starts with.
  const choice = picked[release.version] ?? info.choices[release.version] ?? release.defaults
  const busy = building || info.building
  const built = info.built && info.built.version === release.version ? info.built : null
  const current = built !== null && sameChoice(built.choice, choice)
  const fits = dspFits(release.dsp, choice)
  const mac = state.platform === 'darwin'

  const change = (next: HxtraChoice): void => {
    setPicked((all) => ({ ...all, [release.version]: next }))
    call(hx.hxtraChoose(release.version, next)).catch((err: unknown) => fail(err, true))
  }

  const setStock = async (file: File | undefined): Promise<void> => {
    if (!file || checking) return
    setChecking(true)
    setStockError(null)
    try {
      take(await call(hx.hxtraSetStock(file)))
    } catch (err) {
      setStockError(errorText(err, t))
    } finally {
      setChecking(false)
    }
  }

  const onDrop = (e: DragEvent): void => {
    e.preventDefault()
    setOver(false)
    void setStock(e.dataTransfer.files[0])
  }

  const build = async (): Promise<void> => {
    setBuilding(true)
    setStep(0)
    setLog('')
    setStopped(null)
    try {
      const next = await call(hx.hxtraBuild(release.version, choice))
      take(next)
      announce(next.built?.verified ? t('install.ok.title') : t('install.unpinned.title'))
    } catch (err) {
      if (!(err instanceof HxError && err.code === 'canceled')) {
        setStopped(errorText(err, t))
        announce(t('install.stopped.title'))
      }
      call(hx.hxtraState()).then(take, () => undefined)
    } finally {
      setBuilding(false)
    }
  }

  const save = async (): Promise<void> => {
    try {
      const next = await call(hx.hxtraSave())
      take(next)
      if (next.savedPath && next.savedPath !== info.savedPath) notify('ok', t('install.saved', { path: next.savedPath }))
    } catch (err) {
      fail(err)
    }
  }

  const fileName = built?.fileName ?? `HXtra_${release.tag}.hxf`
  const result =
    current && built
      ? built.verified === true
        ? { cls: 'status status-ok', icon: 'check' as const, title: t('install.ok.title'), text: t('install.ok.text') }
        : built.verified === false
          ? { cls: 'status status-bad', icon: 'alert' as const, title: t('install.odd.title'), text: t('install.odd.text') }
          : { cls: 'status status-ok', icon: 'check' as const, title: t('install.unpinned.title'), text: t('install.unpinned.text') }
      : null
  const ready = current && built?.verified !== false

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1 id={SCREEN_TITLE_ID}>{t('install.title')}</h1>
          <p>{t('install.lead')}</p>
        </div>
      </div>

      <Notice>{t('install.warn')}</Notice>

      <section className="section">
        <h2>{t('install.version')}</h2>
        <div className="card setting">
          <div className="setting-text">
            <strong>
              <label htmlFor="hxtra-version">HXtra</label>
            </strong>
            <span>{t('install.version.help')}</span>
          </div>
          <div className="setting-controls">
            <ExternalLink href={release.notesUrl}>{t('install.notes')}</ExternalLink>
            <span className="select-wrap">
              <select id="hxtra-version" className="select" value={release.version} disabled={busy} onChange={(e) => setVersion(e.target.value)}>
                {info.releases.map((r) => (
                  <option key={r.version} value={r.version}>
                    {r.version}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t('install.ready')}</h2>
        <div className="card">
          <div className="setting">
            <div className="setting-text">
              <span className="note">{t('install.ready.stomp')}</span>
            </div>
          </div>
          <div className="setting">
            <div className="setting-text">
              <span className="note">{t('install.ready.apps')}</span>
            </div>
            <div className="actions">
              <ExternalLink href={mac ? LINKS.updaterMac : LINKS.updaterWin}>{t('install.link.updater')}</ExternalLink>
              <ExternalLink href={mac ? LINKS.hxEditMac : LINKS.hxEditWin}>{t('install.link.hxEdit')}</ExternalLink>
            </div>
          </div>
          <div className="setting">
            <div className="setting-text">
              <span className="note">{t('install.ready.backup')}</span>
            </div>
          </div>
          <div className="setting">
            <div className="setting-text">
              <span className="note">{t('install.ready.stock', { file: release.stockFileName })}</span>
            </div>
            <ExternalLink href={LINKS.stockFirmware}>{t('install.link.stock')}</ExternalLink>
          </div>
        </div>
      </section>

      <Features release={release} choice={choice} onChange={change} disabled={busy} />

      <section className="section">
        <h2>{t('install.build')}</h2>
        {info.stock ? (
          <div className="card setting">
            <div className="setting-text">
              <strong className="mono selectable path">{info.stock.name}</strong>
              <span className="row-status row-ok">
                <Icon name="check" />
                {t('install.stock.ok')}
              </span>
            </div>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy || checking} onClick={() => input.current?.click()}>
              {checking ? <Spinner /> : <Icon name="folder" />}
              {checking ? t('install.stock.checking') : t('install.stock.change')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="dropzone"
            data-over={over}
            disabled={checking}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            {checking ? <Spinner label={t('install.stock.checking')} /> : <Icon name="firmware" />}
            <strong>{t('install.stock.drop')}</strong>
            <span className="muted">{t('install.stock.dropSub', { file: release.stockFileName })}</span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept=".hxf"
          hidden
          onChange={(e) => {
            void setStock(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {stockError && <Notice kind="error">{stockError}</Notice>}

        <div className="actions">
          <button
            type="button"
            className={ready ? 'btn btn-outline' : 'btn btn-primary'}
            disabled={busy || checking || !info.stock || !fits}
            onClick={() => void build()}
          >
            {busy ? <Spinner /> : <Icon name="firmware" />}
            {busy ? t('install.building') : current ? t('install.build.again') : t('install.build.button', { v: release.version })}
          </button>
          {building && (
            <button type="button" className="btn btn-quiet" onClick={() => void call(hx.hxtraCancel()).catch((err: unknown) => fail(err))}>
              {t('common.cancel')}
            </button>
          )}
        </div>

        {busy && (
          <div className="card status">
            <span className="status-title">{t('install.building')}</span>
            <div className="progress" role="progressbar" aria-label={t('install.building')} aria-valuemin={0} aria-valuemax={BUILD_STEPS} aria-valuenow={step}>
              <i style={{ width: `${(100 * Math.max(0, step - 0.5)) / BUILD_STEPS}%` }} />
            </div>
            {step > 0 && <p className="small muted">{t('install.step', { step, of: BUILD_STEPS, text: t(`install.p${step}` as Key) })}</p>}
          </div>
        )}
        {!busy && stopped && (
          <div className="card status status-bad" role="alert">
            <span className="status-title">
              <Icon name="alert" />
              {t('install.stopped.title')}
            </span>
            <p className="small">{stopped}</p>
            <p className="small muted">{t('install.stopped.text')}</p>
          </div>
        )}
        {!busy && !stopped && result && (
          <div className={`card ${result.cls}`}>
            <span className="status-title">
              <Icon name={result.icon} />
              {result.title}
            </span>
            <p className="small muted">{result.text}</p>
            <span className="mono muted selectable">MD5 {built?.md5}</span>
          </div>
        )}
        {!busy && built && !current && <Notice>{t('install.stale')}</Notice>}
        {log && (
          <details className="log">
            <summary>{t('install.log')}</summary>
            <pre className="selectable">{log}</pre>
          </details>
        )}
        <p className="muted small">{t('install.note')}</p>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('install.install')}</h2>
            <p>{t('install.install.lead')}</p>
          </div>
        </div>
        <ol className="steps steps-lg">
          <li>
            <div>
              {t('install.i1')}
              <div className="actions step-actions">
                <button type="button" className={ready ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} disabled={!current || busy} onClick={() => void save()}>
                  <Icon name="download" />
                  {t('install.save')}
                </button>
                {current && info.savedPath && (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => void call(hx.hxtraReveal()).catch((err: unknown) => fail(err))}>
                    <Icon name="folder" />
                    {t('common.showInFolder')}
                  </button>
                )}
              </div>
              {current && info.savedPath && <p className="mono muted selectable step-actions">{info.savedPath}</p>}
              <p className="muted small step-actions">{t('install.share')}</p>
            </div>
          </li>
          <li>{t('install.i2')}</li>
          <li>{t('install.i3')}</li>
          <li>
            <div>
              {t('install.i4')}
              <div className="actions step-actions">
                {info.updater === 'found' && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => void call(hx.hxtraOpenUpdater()).catch((err: unknown) => fail(err))}>
                    {t('install.updater.open')}
                    <Icon name="external" />
                  </button>
                )}
                {info.updater === 'missing' && (
                  <span className="small muted">
                    {t('install.updater.missing')} <ExternalLink href={mac ? LINKS.updaterMac : LINKS.updaterWin}>{t('install.link.stock')}</ExternalLink>
                  </span>
                )}
                {info.updater === 'unsupported' && <span className="small muted">{t('install.updater.unsupported')}</span>}
              </div>
            </div>
          </li>
          <li>{t('install.i5', { file: fileName })}</li>
          <li>{t('install.i6')}</li>
          <li>{t('install.i7', { v: release.version })}</li>
        </ol>
        {choice.nam && (
          <div className="card setting">
            <div className="setting-text">
              <span className="note">{t('install.after')}</span>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => go({ name: 'guide' })}>
              {t('nav.guide')}
            </button>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('install.recovery')}</h2>
            <p>{t('install.recovery.lead')}</p>
          </div>
        </div>
        <ol className="steps steps-lg">
          <li>{t('install.r1')}</li>
          <li>{t('install.r2')}</li>
          <li>{t('install.r3', { file: release.stockFileName })}</li>
          <li>{t('install.r4')}</li>
        </ol>
        <p className="muted small">{t('install.safe')}</p>
      </section>
    </div>
  )
}
