import { type ReactNode, useEffect, useState } from 'react'
import { modelFit } from '@shared/compat'
import type { ConversionRecord, Model, Tone } from '@shared/types'
import { call, hx } from '../api'
import { Icon } from '../components/Icon'
import { SendButton, SlotStatus, sendAfterConvert } from '../components/Send'
import { BrowseButton, Creator, Notice, Spinner, ToneImage } from '../components/ui'
import { SCREEN_TITLE_ID, useApp, useScreenTitle } from '../context'
import { errorText } from '../i18n'
import { formatLabel, gearLabel, licenseLabel, sizeLabel } from '../labels'

type RowState = { status: 'idle' } | { status: 'working' } | { status: 'done'; record: ConversionRecord } | { status: 'error'; text: string }

/** One tone: picture, title, gear, format, creator, description and its models. */
export function ToneDetail({ id }: { id: number }): ReactNode {
  const { t, go, open, fail, library, reloadLibrary, notify, announce, state } = useApp()
  const [tone, setTone] = useState<Tone | null>(null)
  const [models, setModels] = useState<Model[] | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [rows, setRows] = useState<Record<number, RowState>>({})
  const [attempt, setAttempt] = useState(0)
  useScreenTitle(tone?.title)

  useEffect(() => {
    let alive = true
    setTone(null)
    setModels(null)
    setError('')
    setRows({})
    Promise.all([call(hx.tone(id)), call(hx.models(id))])
      .then(([gotTone, gotModels]) => {
        if (!alive) return
        setTone(gotTone)
        setModels(gotModels)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(errorText(err, t))
        fail(err, true)
      })
    return () => {
      alive = false
    }
  }, [id, attempt, t, fail])

  /** What a model's row shows: this visit's outcome, else an earlier conversion still on disk. */
  const rowOf = (model: Model): RowState => {
    const now = rows[model.id]
    if (now) return now
    const earlier = library.find((r) => r.tone?.id === id && r.model?.id === model.id && !r.missing)
    return earlier ? { status: 'done', record: earlier } : { status: 'idle' }
  }

  const convert = async (model: Model): Promise<boolean> => {
    setRows((r) => ({ ...r, [model.id]: { status: 'working' } }))
    try {
      const converted = await call(hx.convertModel(id, model.id))
      // The row shows it; this says it to someone who cannot see the row.
      announce(t('tone.saved', { file: converted.fileName }))
      const record = state.settings.sendAfterConvert ? await sendAfterConvert(converted, { t, notify, fail }) : converted
      setRows((r) => ({ ...r, [model.id]: { status: 'done', record } }))
      return true
    } catch (err) {
      setRows((r) => ({ ...r, [model.id]: { status: 'error', text: errorText(err, t) } }))
      fail(err, true)
      return false
    }
  }

  const convertOne = async (model: Model): Promise<void> => {
    if (await convert(model)) await reloadLibrary()
  }

  const ready = (models ?? []).filter((m) => modelFit(m) === 'ready')
  const busy = Object.values(rows).some((r) => r.status === 'working')

  // One after another: a model is downloaded only when its turn comes.
  const convertAll = async (): Promise<void> => {
    let good = 0
    for (const model of ready) if (await convert(model)) good++
    await reloadLibrary()
    if (good > 0) notify('ok', t('toast.convertedMany', { n: good }))
  }

  const back = (
    <div>
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => go({ name: 'tones' })}>
        <Icon name="back" />
        {t('common.back')}
      </button>
    </div>
  )

  if (error) {
    return (
      <div className="page">
        {back}
        <Notice kind="error">
          {error}{' '}
          <button type="button" className="link" onClick={() => setAttempt(attempt + 1)}>
            {t('common.retry')}
          </button>
        </Notice>
      </div>
    )
  }

  if (!tone || !models) {
    return (
      <div className="page" role="status" aria-label={t('common.loading')}>
        {back}
        <div className="detail">
          <div className="detail-image skeleton" />
          <div className="detail-info">
            <div className="skeleton sk-title sk-w60" />
            <div className="skeleton sk-chip sk-w35" />
            <div className="skeleton sk-block sk-w90" />
          </div>
        </div>
      </div>
    )
  }

  const long = (tone.description ?? '').length > 280

  return (
    <div className="page">
      {back}

      <div className="detail">
        <ToneImage className="detail-image" src={tone.images?.[0]} />
        <div className="detail-info">
          <h1 id={SCREEN_TITLE_ID} className="selectable">
            {tone.title}
          </h1>
          <div className="chips">
            <span className="chip">{gearLabel(tone.gear)}</span>
            <span className="chip">{formatLabel(tone.format)}</span>
            <span className="chip chip-line" title={t('tone.license')}>
              {t('tone.license')}: {licenseLabel(tone.license)}
            </span>
          </div>
          <Creator user={tone.user} size={26} />

          {tone.description && (
            <div className="section section-tight">
              <h2>{t('tone.description')}</h2>
              <p className={expanded || !long ? 'description selectable' : 'description description-clamped selectable'}>{tone.description}</p>
              {long && (
                <button type="button" className="link link-start" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                  {expanded ? t('tone.readLess') : t('tone.readMore')}
                </button>
              )}
            </div>
          )}

          {tone.tags.length > 0 && (
            <div className="chips">
              {tone.tags.slice(0, 12).map((tag) => (
                <span key={tag.id} className="chip chip-line">
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="meta-row">
            <span>{t('tone.downloads', { n: tone.downloads_count.toLocaleString() })}</span>
            <span>{t('tone.favorites', { n: tone.favorites_count.toLocaleString() })}</span>
          </div>

          <div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => open(tone.url)}>
              {t('tone.openOn')}
              <Icon name="external" />
            </button>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('tone.models')}</h2>
            {models.length > 0 && <p>{t('tone.modelsHelp')}</p>}
          </div>
          {ready.length > 1 && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void convertAll()}>
              {t('tone.convertAll', { n: ready.length })}
            </button>
          )}
        </div>

        {models.length === 0 ? (
          <div className="empty">
            <h3 className="empty-title">{tone.format === 'nam' ? t('tone.noModels.title') : t('tone.notNam.title')}</h3>
            <p>{tone.format === 'nam' ? t('tone.noModels.text') : t('tone.notNam.text')}</p>
            <div className="actions">
              <BrowseButton />
            </div>
          </div>
        ) : (
          <div className="rows">
            {models.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                row={rowOf(model)}
                disabled={busy}
                onConvert={() => void convertOne(model)}
                onSent={(record) => setRows((r) => ({ ...r, [model.id]: { status: 'done', record } }))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ModelRow({
  model,
  row,
  disabled,
  onConvert,
  onSent,
}: {
  model: Model
  row: RowState
  disabled: boolean
  onConvert(): void
  onSent(record: ConversionRecord): void
}): ReactNode {
  const { t } = useApp()
  const fit = modelFit(model)
  const size = t('size.a2', { size: sizeLabel(model.size) })

  return (
    <div className="row">
      <div className="row-main">
        <div className="row-title selectable">{model.name}</div>
        <div className="chips">
          <span className={fit === 'ready' ? 'chip chip-ready' : 'chip chip-line chip-off'} title={fit === 'ready' ? t('fit.ready.title') : t('fit.no.title')}>
            {fit === 'ready' && <span className="dot" />}
            {size}
          </span>
        </div>
        {row.status === 'done' && (
          <div className="row-status row-ok">
            <Icon name="check" />
            <span className="selectable">{t('tone.saved', { file: row.record.fileName })}</span>
          </div>
        )}
        {row.status === 'done' && <SlotStatus record={row.record} />}
        {row.status === 'error' && (
          <div className="row-status row-bad" role="alert">
            <Icon name="alert" />
            <span className="selectable">{row.text}</span>
          </div>
        )}
      </div>

      <div className="actions">
        {row.status === 'done' && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => void hx.reveal(row.record.id)}>
            <Icon name="folder" />
            {t('common.showInFolder')}
          </button>
        )}
        {row.status === 'done' && <SendButton record={row.record} onSent={onSent} disabled={disabled} />}
        {row.status === 'working' ? (
          <button type="button" className="btn btn-outline btn-sm" disabled>
            <Spinner />
            {t('tone.converting')}
          </button>
        ) : (
          <button
            type="button"
            className={fit === 'ready' && row.status !== 'done' ? 'btn btn-accent btn-sm' : 'btn btn-quiet btn-sm'}
            disabled={disabled}
            onClick={onConvert}
          >
            {row.status === 'done' ? t('tone.convertAgain') : t('tone.convert')}
          </button>
        )}
      </div>
    </div>
  )
}
