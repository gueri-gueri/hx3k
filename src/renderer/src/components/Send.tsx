import { type ReactNode, useState } from 'react'
import type { ConversionRecord } from '@shared/types'
import { HxError, call, hx } from '../api'
import { type AppContext, useApp } from '../context'
import { Icon } from './Icon'
import { Spinner } from './ui'

/** Where a capture was put on the HX Stomp: the number its block's Model knob takes. */
export function SlotStatus({ record }: { record: ConversionRecord }): ReactNode {
  const { t } = useApp()
  if (!record.device) return null
  return (
    <div className="row-status row-ok">
      <Icon name="check" />
      <span className="selectable">{t('send.slot', { slot: record.device.slot })}</span>
    </div>
  )
}

/** Sends a converted capture to the HX Stomp connected by USB. `onSent` gets the record as it is afterwards. */
export function SendButton({ record, onSent, disabled }: { record: ConversionRecord; onSent?(record: ConversionRecord): void; disabled?: boolean }): ReactNode {
  const { t, fail, notify, reloadLibrary } = useApp()
  const [busy, setBusy] = useState(false)

  const send = async (): Promise<void> => {
    setBusy(true)
    try {
      const sent = await call(hx.sendToDevice(record.id))
      notify('ok', t(sent.already ? 'send.already' : 'send.done', { slot: sent.slot }))
      onSent?.(sent.record)
      await reloadLibrary()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const label = busy ? t('send.sending') : record.device ? t('send.again') : t('send.button')
  return (
    <button
      type="button"
      className={record.device ? 'btn btn-outline btn-sm' : 'btn btn-accent btn-sm'}
      disabled={busy || disabled}
      title={t('send.title')}
      aria-label={`${label}: ${record.fileName}`}
      onClick={() => void send()}
    >
      {busy ? <Spinner /> : <Icon name="upload" />}
      {label}
    </button>
  )
}

/**
 * Right after a conversion, when Settings asks for it. With no HX Stomp to take
 * the capture, it says nothing: the .wav is there, to be sent later.
 */
export async function sendAfterConvert(record: ConversionRecord, { t, notify, fail }: Pick<AppContext, 't' | 'notify' | 'fail'>): Promise<ConversionRecord> {
  try {
    const sent = await call(hx.sendToDevice(record.id))
    notify('ok', t(sent.already ? 'send.already' : 'send.done', { slot: sent.slot }))
    return sent.record
  } catch (err) {
    const noUnit = err instanceof HxError && (err.code === 'device_not_found' || err.code === 'device_unsupported')
    if (!noUnit) fail(err)
    return record
  }
}
