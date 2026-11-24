import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { ConversionInfo, ConversionRecord } from '@shared/types'
import { call, hx } from '../api'
import { T3KMark } from '../components/Brand'
import { Icon } from '../components/Icon'
import { Avatar, BrowseButton, Notice, ToneImage } from '../components/ui'
import { SCREEN_TITLE_ID, useApp, useScreenTitle } from '../context'
import type { T } from '../i18n'
import { formatLabel, gearLabel, licenseLabel, signedDb } from '../labels'

/** What the converter did to a capture, as HXtra's setup page words it. */
export function infoChips(info: ConversionInfo, t: T): string[] {
  const chips = [t('chip.lite')]
  if (info.slimmable) chips.push(t('chip.slim'))
  if (info.exponent > 0) chips.push(t('chip.scaled', { k: 2 ** info.exponent }))
  if (info.inputDbu !== null && info.trimDb !== null) chips.push(t('chip.trim', { dbu: info.inputDbu, db: signedDb(info.trimDb) }))
  if (info.loudDb !== null) chips.push(t('chip.loud', { db: signedDb(info.loudDb) }))
  return chips
}

/** The captures converted so far: the "loaded tones" of this app. */
export function ConvertedView(): ReactNode {
  const { t, library, go } = useApp()
  useScreenTitle(t('conv.title'))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 id={SCREEN_TITLE_ID}>{t('conv.title')}</h1>
          <p>{t('conv.lead')}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-outline" onClick={() => go({ name: 'guide' })}>
            {t('conv.howTo')}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => void hx.openOutputDir()}>
            <Icon name="folder" />
            {t('common.openFolder')}
          </button>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="empty">
          <h2 className="empty-title">{t('conv.empty.title')}</h2>
          <p>{t('conv.empty.text')}</p>
          <div className="actions">
            <BrowseButton />
            <button type="button" className="btn btn-outline" onClick={() => go({ name: 'local' })}>
              {t('conv.local')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <Notice>{t('conv.tip')}</Notice>
          <div className="rows">
            {library.map((record) => (
              <ConvertedRow key={record.id} record={record} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ConvertedRow({ record }: { record: ConversionRecord }): ReactNode {
  const { t, go, setLibrary, fail, focusScreen, announce } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const tone = record.tone
  const removeButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)

  // The question replaces the button that asked it, and the answer "no" brings
  // that button back: focus follows each time instead of falling off the page.
  const asked = useRef(false)
  useEffect(() => {
    if (confirming) cancelButton.current?.focus()
    else if (asked.current) removeButton.current?.focus()
    asked.current = confirming
  }, [confirming])

  const remove = async (): Promise<void> => {
    setBusy(true)
    try {
      setLibrary(await call(hx.removeConversion(record.id)))
      // The row is gone, and focus with it.
      announce(t('conv.removed', { file: record.fileName }))
      focusScreen()
    } catch (err) {
      fail(err)
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className="row">
      <div className="thumb">
        <ToneImage className="thumb-image" src={tone?.image} />
        {/* The origin marker: this capture came from TONE3000. */}
        {tone && (
          <span className="thumb-mark">
            <T3KMark />
          </span>
        )}
      </div>

      <div className="row-main">
        {tone ? (
          <button type="button" className="row-title row-link" onClick={() => go({ name: 'tone', id: tone.id })}>
            {tone.title}
          </button>
        ) : (
          <div className="row-title selectable">{record.info.name || record.sourceName}</div>
        )}
        <div className="row-sub selectable">{tone ? (record.model?.name ?? record.sourceName) : record.sourceName}</div>

        <div className="chips">
          {tone ? (
            <>
              <span className="chip">{gearLabel(tone.gear)}</span>
              <span className="chip">{formatLabel(tone.format)}</span>
              <span className="chip chip-line">
                <Avatar name={tone.creator.username} src={tone.creator.avatarUrl} size={14} />@{tone.creator.username}
              </span>
              <span className="chip chip-line">
                {t('tone.license')}: {licenseLabel(tone.license)}
              </span>
            </>
          ) : (
            <>
              <span className="chip">{t('conv.fromLocal')}</span>
              {record.info.gear && <span className="chip">{record.info.gear}</span>}
              {record.info.modeledBy && <span className="chip chip-line">{t('chip.by', { who: record.info.modeledBy })}</span>}
            </>
          )}
        </div>

        <div className="chips">
          {infoChips(record.info, t).map((text) => (
            <span key={text} className="chip chip-line chip-off">
              {text}
            </span>
          ))}
        </div>

        <div className="row-sub mono selectable">{record.fileName}</div>
        {record.missing && (
          <div className="row-status row-warn">
            <Icon name="alert" />
            {t('conv.missing')}
          </div>
        )}
      </div>

      <div className="actions actions-end">
        {confirming ? (
          <>
            <span className="muted">{t('conv.remove.confirm')}</span>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void remove()}>
              {t('conv.remove.yes')}
            </button>
            <button ref={cancelButton} type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <>
            {!record.missing && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => void hx.reveal(record.id)}>
                <Icon name="folder" />
                {t('common.showInFolder')}
              </button>
            )}
            {/* Nothing is left to trash when the file is gone: forget it at once. */}
            <button
              ref={removeButton}
              type="button"
              className="btn btn-quiet btn-sm"
              disabled={busy}
              onClick={() => (record.missing ? void remove() : setConfirming(true))}
              aria-label={`${record.missing ? t('conv.forget') : t('conv.remove')}: ${record.fileName}`}
            >
              <Icon name="trash" />
              {record.missing ? t('conv.forget') : t('conv.remove')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
