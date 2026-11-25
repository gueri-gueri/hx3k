// A session with a running HX Stomp, over USB, the way HX Edit holds one.
//
// It only reads: which preset is loaded, the names of a setlist's presets, and
// the preset being edited. Nothing here changes the unit or its storage.
//
// Follows HxCtl in HXtra's tools/hx_ctl.py.

import { Channel, type Service } from './channel'
import { HxError } from './errors'
import { Link, TIMING, type Timing, type UsbPort, sleep } from './link'
import { type Value, text } from './msgpack'
import { type Block, presetBlocks } from './preset'

// The three streams HX Edit opens.
export const EDITOR: Service = { local: 0x1000, remote: 0x03ed, service: 6 }
export const LIBRARIAN: Service = { local: 0x1001, remote: 0x03ef, service: 2 }
export const NOTIFY: Service = { local: 0x1002, remote: 0x03f0, service: 4 }

const EDITOR_GET_EDIT_BUFFER = 0x16
const EDITOR_GET_CURRENT_PRESET = 0x17
const LIBRARIAN_PRESET_LIST = 0x01

const K_SETLIST = 0x6b
const K_PRESET = 0x6c
const K_NAME = 0x6d

/** A preset's blob and a setlist's 126 names take longer than a short answer. */
const LONG_MS = 5000

export interface CurrentPreset {
  /** Both count from 0. */
  setlist: number
  preset: number
  name: string
}

export interface PresetName {
  /** Counts from 0. */
  index: number
  name: string
}

export class Stomp {
  /** How many notifications the unit has sent in this session. */
  notifications = 0
  private librarian: Promise<Channel> | null = null

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
    stomp.notify.listen(() => {
      stomp.notifications++
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
    this.librarian ??= Channel.open(this.link, LIBRARIAN)
    const result = await (await this.librarian).request(LIBRARIAN_PRESET_LIST, new Map([[K_SETLIST, which]]), LONG_MS)
    const out: PresetName[] = []
    for (const entry of Array.isArray(result) ? result : []) {
      if (!(entry instanceof Map)) continue
      for (const [index, info] of entry) {
        if (typeof index === 'number') out.push({ index, name: info instanceof Map ? text(info.get(K_NAME)) : '' })
      }
    }
    return out.sort((a, b) => a.index - b.index)
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
