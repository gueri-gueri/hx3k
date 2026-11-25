import { type DragEvent, type ReactNode, useRef, useState } from 'react'
import type { LocalNam, LocalOutcome } from '@shared/types'
import { call, hx } from '../api'
import { Icon } from '../components/Icon'
import { SlotStatus, sendAfterConvert } from '../components/Send'
import { Notice, Spinner } from '../components/ui'
import { SCREEN_TITLE_ID, useApp, useScreenTitle } from '../context'
import { convertErrorText } from '../i18n'
import { infoChips } from './Converted'

/** Converts .nam files the user already has. Nothing is sent anywhere. */
export function LocalView(): ReactNode {
  const { t, fail, reloadLibrary, announce, notify, state } = useApp()
  useScreenTitle(t('local.title'))
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [outcomes, setOutcomes] = useState<LocalOutcome[]>([])

  const take = async (list: FileList | null): Promise<void> => {
    const files = Array.from(list ?? [])
    if (!files.length || busy) return
    setBusy(true)
    try {
      const unread: LocalOutcome[] = []
      const read: LocalNam[] = []
      for (const file of files) {
        try {
          read.push({ name: file.name, text: await file.text() })
        } catch {
          unread.push({ name: file.name, ok: false, message: 'The file could not be read.' })
        }
      }
      const done = read.length ? await call(hx.convertLocal(read)) : []
      if (state.settings.sendAfterConvert) {
        // One after another: the unit takes one capture at a time.
        for (const o of done) if (o.ok) o.record = await sendAfterConvert(o.record, { t, notify, fail })
      }
      setOutcomes((earlier) => [...done, ...unread, ...earlier])
      const batch = [...done, ...unread]
      announce(t('local.results', { good: batch.filter((o) => o.ok).length, n: batch.length }))
      await reloadLibrary()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: DragEvent): void => {
    e.preventDefault()
    setOver(false)
    void take(e.dataTransfer.files)
  }

  const good = outcomes.filter((o) => o.ok).length

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1 id={SCREEN_TITLE_ID}>{t('local.title')}</h1>
          <p>{t('local.lead')}</p>
        </div>
      </div>

      <button
        type="button"
        className="dropzone"
        data-over={over}
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {busy ? <Spinner label={t('tone.converting')} /> : <Icon name="upload" />}
        <strong>{t('local.drop')}</strong>
        <span className="muted">{t('local.dropSub')}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".nam,application/json"
        multiple
        hidden
        onChange={(e) => {
          void take(e.target.files)
          e.target.value = ''
        }}
      />

      <p className="muted">{t('local.note')}</p>

      {outcomes.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{t('local.results', { good, n: outcomes.length })}</h2>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOutcomes([])}>
              {t('local.clear')}
            </button>
          </div>
          <div className="rows">
            {outcomes.map((o, i) => (
              <div className="row" key={`${o.name}:${i}`}>
                <div className="row-main">
                  <div className="row-title selectable">{o.name}</div>
                  {o.ok ? (
                    <>
                      <div className="row-status row-ok">
                        <Icon name="check" />
                        <span className="selectable">{t('tone.saved', { file: o.record.fileName })}</span>
                      </div>
                      <SlotStatus record={o.record} />
                      <div className="chips">
                        {infoChips(o.record.info, t).map((text) => (
                          <span key={text} className="chip chip-line chip-off">
                            {text}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="row-status row-bad">
                      <Icon name="alert" />
                      <span className="selectable">{convertErrorText(o.message, t)}</span>
                    </div>
                  )}
                </div>
                {o.ok && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => void hx.reveal(o.record.id)}>
                    <Icon name="folder" />
                    {t('common.showInFolder')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Notice>{t('conv.tip')}</Notice>
    </div>
  )
}
