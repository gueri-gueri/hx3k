// Sending a converted capture to the HX Stomp, over USB: what HX Edit's
// Impulses list does when a .wav is dropped on a slot.
//
// The capture goes where the unit already has it, else back to the slot it was
// sent to before if that slot is still its own, else to the first free slot.
// A slot that holds anything else is never written over.
//
// When Settings asks, the NAM A2 Lite block of the preset on the unit is then
// pointed at that slot, so the capture plays at once.

import { readFile } from 'node:fs/promises'
import type { ConversionRecord, DevicePlace, SendOutcome } from '@shared/types'
import { MOCK } from './config'
import { AppError } from './errors'
import { HxError } from './hx/errors'
import { IMPULSE_SLOTS, type ImpulseEntry, impulseHash, wavSamples } from './hx/impulse'
import { type Timing, type UsbPort, sleep } from './hx/link'
import { Stomp } from './hx/stomp'
import { findConversion, setDevicePlace } from './library'
import { getSettings } from './settings'

type OpenPort = () => UsbPort | Promise<UsbPort>

// libusb is loaded when a capture is first sent: the rest of the app runs without it.
let openPort: OpenPort = async () => (await import('./hx/usb')).openStomp()
let timing: Partial<Timing> = {}

/** For tests: a stand-in for the unit's USB port, and shorter waits. */
export function useDevicePort(open: OpenPort, waits: Partial<Timing> = {}): void {
  openPort = open
  timing = waits
}

export interface Choice {
  /** 0 for slot 1. */
  index: number
  /** The unit already holds these samples there. */
  already: boolean
  block?: SendOutcome['block']
}

/** The slot a capture goes to, or null when none is free. */
export function chooseSlot(list: ImpulseEntry[], hash: string, earlier?: DevicePlace): Choice | null {
  const same = list.find((i) => i.hash === hash)
  if (same) return { index: same.index, already: true }
  if (earlier) {
    const index = earlier.slot - 1
    const there = list.find((i) => i.index === index)
    // Empty again, or still what this capture was when it was sent: an older conversion of it.
    if (!there || there.hash === earlier.hash) return { index, already: false }
  }
  const taken = new Set(list.map((i) => i.index))
  for (let index = 0; index < IMPULSE_SLOTS; index++) if (!taken.has(index)) return { index, already: false }
  return null
}

function deviceError(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof HxError) {
    if (err.code === 'not_found') return new AppError('device_not_found', err.message)
    // Opening fails the same way when HX Edit holds the unit and when Windows gives it to Line 6's driver.
    if (err.code === 'busy') return new AppError(process.platform === 'win32' ? 'device_unsupported' : 'device_busy', err.message)
  }
  return new AppError('device_failed', err instanceof Error ? err.message : String(err))
}

async function onUnit(record: ConversionRecord, name: string, data: Uint8Array, hash: string): Promise<Choice> {
  let stomp: Stomp
  try {
    stomp = await Stomp.connect(await openPort(), timing)
  } catch (err) {
    throw deviceError(err)
  }
  try {
    const choice = chooseSlot(await stomp.impulses(), hash, record.device)
    if (!choice) throw new AppError('device_full', 'Every User IR slot of the HX Stomp is taken.')
    if (!choice.already) await stomp.storeImpulse(choice.index, name, data)
    if (!getSettings().pointBlock) return choice
    // The capture is on the unit either way: a block that will not be set does not undo that.
    const block = await stomp.pointNam(choice.index + 1).catch((err: unknown) => {
      console.warn('The NAM A2 Lite block could not be pointed at the capture.', err)
      return 'failed' as const
    })
    return { ...choice, block }
  } catch (err) {
    throw deviceError(err)
  } finally {
    await stomp.close().catch(() => undefined)
  }
}

// Development only (HX3K_MOCK=1): a made-up unit that starts empty, so the screens
// can be worked on and tested with no HX Stomp.
const sampleUnit: ImpulseEntry[] = []

async function onSampleUnit(record: ConversionRecord, name: string, hash: string): Promise<Choice> {
  await sleep(300)
  const choice = chooseSlot(sampleUnit, hash, record.device)
  if (!choice) throw new AppError('device_full', 'Every User IR slot of the sample unit is taken.')
  if (!choice.already) {
    const at = sampleUnit.findIndex((i) => i.index === choice.index)
    if (at >= 0) sampleUnit.splice(at, 1)
    sampleUnit.push({ index: choice.index, name, hash })
  }
  return getSettings().pointBlock ? { ...choice, block: 'set' } : choice
}

async function send(id: string): Promise<SendOutcome> {
  const record = findConversion(id)
  if (!record) throw new AppError('not_found', 'This conversion is no longer listed.')
  let data: Uint8Array
  try {
    data = wavSamples(new Uint8Array(await readFile(record.filePath)))
  } catch (err) {
    throw new AppError('device_failed', err instanceof HxError ? err.message : `The .wav could not be read: ${err instanceof Error ? err.message : String(err)}`)
  }
  const hash = impulseHash(data)
  // HX Edit names an IR after its file.
  const name = record.fileName.replace(/\.wav$/i, '')
  const choice = MOCK ? await onSampleUnit(record, name, hash) : await onUnit(record, name, data, hash)
  const slot = choice.index + 1
  const kept = setDevicePlace(id, { slot, hash, sentAt: new Date().toISOString() })
  return { record: kept, slot, already: choice.already, ...(choice.block ? { block: choice.block } : {}) }
}

// One session with the unit at a time: it has one message interface.
let turn: Promise<unknown> = Promise.resolve()

/** Puts a converted capture in a User IR slot of the HX Stomp connected by USB. */
export function sendToDevice(id: string): Promise<SendOutcome> {
  const result = turn.then(
    () => send(id),
    () => send(id),
  )
  turn = result.catch(() => undefined)
  return result
}
