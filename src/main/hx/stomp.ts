// A session with a running HX Stomp, over USB, the way HX Edit holds one.
//
// It reads which preset is loaded, the names of a setlist's presets, the preset
// being edited and the User IRs. It writes two things: a User IR slot, and the
// Model knob of the NAM A2 Lite block in the preset being edited.
//
// Follows HxCtl in HXtra's tools/hx_ctl.py.

import { Channel, type Service } from './channel'
import { HxError } from './errors'
import {
  IMPULSE_KEYS,
  INFO_KEYS,
  type ImpulseEntry,
  dataParams,
  impulseHash,
  infoParams,
  listParams,
  storeParams,
} from './impulse'
import { Link, TIMING, type Timing, type UsbPort, sleep } from './link'
import { type Packable, type Value, text } from './msgpack'
import { type Block, NAM_MODEL_ID, NAM_MODEL_KNOB, presetBlocks, withKnob } from './preset'

// The three streams HX Edit opens.
export const EDITOR: Service = { local: 0x1000, remote: 0x03ed, service: 6 }
export const LIBRARIAN: Service = { local: 0x1001, remote: 0x03ef, service: 2 }
export const NOTIFY: Service = { local: 0x1002, remote: 0x03f0, service: 4 }

const EDITOR_SET_EDIT_BUFFER = 0x15
const EDITOR_GET_EDIT_BUFFER = 0x16
const EDITOR_GET_CURRENT_PRESET = 0x17
const LIBRARIAN_PRESET_LIST = 0x01
const LIBRARIAN_IR_SET = 0x09
const LIBRARIAN_IR_DATA = 0x0b
const LIBRARIAN_IR_INFO = 0x0c
const LIBRARIAN_IR_LIST = 0x0d
const LIBRARIAN_UNLOCK_UI = 0xfe
const LIBRARIAN_LOCK_UI = 0xff

const K_SETLIST = 0x6b
const K_PRESET = 0x6c
const K_NAME = 0x6d
const K_PRESET_BLOB = 0x6e

/** A preset's blob and a setlist's 126 names take longer than a short answer. */
const LONG_MS = 5000
/** Writing a slot to the unit's storage. */
const STORE_MS = 15_000
const STORED_CHECKS = 20
const LOCK_TRIES = 4
const NOTES_KEPT = 50

export interface CurrentPreset {
  /** Both count from 0. */
  setlist: number
  preset: number
  name: string
}

/**
 * What became of pointing the NAM A2 Lite block at a slot: it was set, it was
 * on that slot already, or the preset has no such block, or more than one.
 */
export type Pointed = 'set' | 'already' | 'none' | 'several'

export interface PresetName {
  /** Counts from 0. */
  index: number
  name: string
}

export class Stomp {
  /** How many notifications the unit has sent in this session. */
  notifications = 0
  /** The last of them, newest last. */
  readonly notes: Value[] = []
  private librarian: Promise<Channel> | null = null
  private dialectChecked = false

  private constructor(
    private readonly link: Link,
    private readonly editor: Channel,
    private readonly notify: Channel,
  ) {}

  /** Opens a session on `port`, and closes the port if that fails. */
  static async connect(port: UsbPort, timing: Partial<Timing> = {}): Promise<Stomp> {
    const link = new Link(port, { ...TIMING, ...timing })
    const open: Channel[] = []
    try {
      await link.open()
      open.push(await Channel.open(link, EDITOR))
      open.push(await Channel.open(link, NOTIFY))
    } catch (err) {
      await Stomp.shut(link, open)
      throw err
    }
    const stomp = new Stomp(link, open[0], open[1])
    stomp.notify.listen((note) => {
      stomp.notifications++
      stomp.notes.push(note)
      if (stomp.notes.length > NOTES_KEPT) stomp.notes.shift()
    })
    return stomp
  }

  async current(): Promise<CurrentPreset> {
    const result = await this.editor.request(EDITOR_GET_CURRENT_PRESET)
    if (!(result instanceof Map)) throw new HxError('protocol', 'The HX Stomp did not say which preset is loaded.')
    const setlist = result.get(K_SETLIST)
    const preset = result.get(K_PRESET)
    if (typeof setlist !== 'number' || typeof preset !== 'number') throw new HxError('protocol', 'The HX Stomp did not say which preset is loaded.')
    return { setlist, preset, name: text(result.get(K_NAME)) }
  }

  /** The names of a setlist's presets; the current setlist's when none is given. */
  async presets(setlist?: number): Promise<PresetName[]> {
    const which = setlist ?? (await this.current()).setlist
    const result = await this.library(LIBRARIAN_PRESET_LIST, new Map([[K_SETLIST, which]]))
    const out: PresetName[] = []
    for (const entry of Array.isArray(result) ? result : []) {
      if (!(entry instanceof Map)) continue
      for (const [index, info] of entry) {
        if (typeof index === 'number') out.push({ index, name: info instanceof Map ? text(info.get(K_NAME)) : '' })
      }
    }
    return out.sort((a, b) => a.index - b.index)
  }

  /** The IRs the unit holds, by slot. */
  async impulses(): Promise<ImpulseEntry[]> {
    const result = await this.library(LIBRARIAN_IR_LIST, listParams())
    const out: ImpulseEntry[] = []
    for (const entry of Array.isArray(result) ? result : []) {
      if (!(entry instanceof Map)) continue
      const index = entry.get(IMPULSE_KEYS.index)
      if (typeof index === 'number') out.push({ index, name: text(entry.get(IMPULSE_KEYS.name)), hash: text(entry.get(IMPULSE_KEYS.hash)) })
    }
    return out.sort((a, b) => a.index - b.index)
  }

  /** The samples in a slot, as the unit keeps them. */
  async impulseData(index: number): Promise<Uint8Array> {
    const result = await this.library(LIBRARIAN_IR_DATA, dataParams(index))
    if (!(result instanceof Uint8Array)) throw new HxError('protocol', `The HX Stomp did not send the IR of slot ${index + 1}.`)
    return result
  }

  /**
   * Writes a capture's samples into a slot, replacing what is there, the way
   * HX Edit imports a .wav: it locks the unit's screen, sends the IR, unlocks it.
   * Resolves once the unit lists the slot with these samples.
   */
  async storeImpulse(index: number, name: string, data: Uint8Array): Promise<ImpulseEntry> {
    const params = storeParams(index, name, data)
    await this.speaksThisDialect()
    await this.lock()
    try {
      await this.librarianChannel().then((c) => c.send(LIBRARIAN_IR_SET, params, STORE_MS))
    } finally {
      await this.library(LIBRARIAN_UNLOCK_UI, new Map()).catch(() => undefined)
    }
    const want = impulseHash(data)
    for (let attempt = 0; attempt < STORED_CHECKS; attempt++) {
      const entry = (await this.impulses()).find((i) => i.index === index)
      if (entry?.hash === want) return entry
      await sleep(this.link.timing.checkMs)
    }
    throw new HxError('refused', `The HX Stomp did not keep the capture in slot ${index + 1}.`)
  }

  /**
   * Before the first write: an IR the unit already has must be described the way
   * this code would describe one. Another firmware may want something else.
   */
  private async speaksThisDialect(): Promise<void> {
    if (this.dialectChecked) return
    const [first] = await this.impulses()
    if (first) {
      const info = await this.library(LIBRARIAN_IR_INFO, infoParams(first.index))
      const keys = info instanceof Map ? [...info.keys()] : []
      const same = keys.length === INFO_KEYS.length && keys.every((k, i) => k === INFO_KEYS[i])
      if (!same || !(info instanceof Map) || typeof info.get(IMPULSE_KEYS.premium) !== 'boolean' || typeof info.get(IMPULSE_KEYS.checksum) !== 'number') {
        throw new HxError('protocol', "This HX Stomp's firmware describes its IRs in a way this app does not write.")
      }
    }
    this.dialectChecked = true
  }

  /** As HX Edit: up to four tries, a quarter of a second apart. */
  private async lock(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.library(LIBRARIAN_LOCK_UI, new Map())
        return
      } catch (err) {
        if (attempt === LOCK_TRIES || !(err instanceof HxError) || err.code !== 'refused') throw err
        await sleep(this.link.timing.checkMs)
      }
    }
  }

  private librarianChannel(): Promise<Channel> {
    this.librarian ??= Channel.open(this.link, LIBRARIAN)
    return this.librarian
  }

  private async library(command: number, params: Packable): Promise<Value> {
    return (await this.librarianChannel()).request(command, params, LONG_MS)
  }

  /** The preset being edited, as the unit packs it. */
  async editBuffer(): Promise<Uint8Array> {
    const result: Value = await this.editor.request(EDITOR_GET_EDIT_BUFFER, null, LONG_MS)
    if (!(result instanceof Uint8Array)) throw new HxError('protocol', 'The HX Stomp did not send the preset being edited.')
    return result
  }

  /** The blocks of the preset being edited. */
  async blocks(): Promise<Block[]> {
    return presetBlocks(await this.editBuffer())
  }

  /**
   * Points the NAM A2 Lite block of the preset being edited at a User IR slot (1 to
   * 128), so the capture there plays. The preset is changed as turning the block's
   * Model knob changes it: on the unit, not in its storage. Only a preset with
   * exactly one such block is touched.
   *
   * The unit takes the whole preset back with the knob's bytes changed (as HXtra's
   * tools/hx_ctl.py sets a preset), and answers before it is done: so this reads
   * the preset again until the knob shows the slot.
   */
  async pointNam(slot: number): Promise<Pointed> {
    const blob = await this.editBuffer()
    const nam = presetBlocks(blob).filter((b) => b.modelId === NAM_MODEL_ID)
    if (nam.length !== 1) return nam.length ? 'several' : 'none'
    const { place } = nam[0]
    if (nam[0].values[NAM_MODEL_KNOB] === slot) return 'already'
    await this.editor.send(EDITOR_SET_EDIT_BUFFER, new Map([[K_PRESET_BLOB, withKnob(blob, place, NAM_MODEL_KNOB, slot)]]), STORE_MS)
    for (let attempt = 0; attempt < STORED_CHECKS; attempt++) {
      await sleep(this.link.timing.checkMs)
      // While the unit loads the preset it may not answer for it yet.
      const now = await this.blocks().catch(() => [])
      const block = now.find((b) => b.place === place)
      if (block?.modelId === NAM_MODEL_ID && block.values[NAM_MODEL_KNOB] === slot) return 'set'
    }
    throw new HxError('refused', 'The HX Stomp did not take the change to its NAM A2 Lite block.')
  }

  async close(): Promise<void> {
    const librarian = await this.librarian?.catch(() => null)
    await Stomp.shut(this.link, [...(librarian ? [librarian] : []), this.editor, this.notify])
  }

  private static async shut(link: Link, channels: Channel[]): Promise<void> {
    for (const channel of channels) await channel.close()
    if (channels.length) await sleep(link.timing.lingerMs)
    await link.close()
  }
}
